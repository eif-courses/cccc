import { eq, and, inArray, desc } from 'drizzle-orm'
import { studentRecords, documents, videos, reviewerReports, supervisorReports, departmentHeads } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  // Get logger from event context
  const logger = event.context.logger || console

  logger.info('Processing department head data request')

  try {
    const { user } = await requireUserSession(event)

    if (!user) {
      logger.warn('Unauthorized access attempt', {
        endpoint: 'department-data'
      })
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    logger.info('User authenticated', {
      email: user.mail
    })

    const query = getQuery(event)
    const requestedYear = parseInt(query.year as string) || null
    const departmentFilter = query.department as string || null

    logger.debug('Request parameters', {
      requestedYear,
      departmentFilter,
      query
    })

    const db = useDB()
    const conditions = []

    // First, check if the user is a department head
    logger.debug('Checking if user is a department head', {
      email: user.mail
    })

    const deptHeadResult = await db.select()
      .from(departmentHeads)
      .where(
        and(
          eq(departmentHeads.email, user.mail),
          eq(departmentHeads.isActive, 1)
        )
      )
      .execute()

    const isDepartmentHead = deptHeadResult.length > 0

    if (isDepartmentHead) {
      logger.info('User is a department head', {
        email: user.mail,
        department: deptHeadResult[0].department
      })

      // If they are a department head, filter by their department
      conditions.push(eq(studentRecords.department, deptHeadResult[0].department))
    }
    else {
      logger.info('User is a regular supervisor', {
        email: user.mail
      })

      // Regular supervisor - only see their own students
      conditions.push(eq(studentRecords.supervisorEmail, user.mail))
    }

    // Add department filter if explicitly provided in the query
    if (departmentFilter) {
      logger.debug('Applying additional department filter', {
        departmentFilter
      })
      conditions.push(eq(studentRecords.department, departmentFilter))
    }

    // First, if no year is specified, determine the latest year from the database
    let latestYear = requestedYear
    if (!latestYear) {
      logger.debug('No year specified, finding latest year')

      const latestYearResult = await db
        .select({ maxYear: studentRecords.currentYear })
        .from(studentRecords)
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(desc(studentRecords.currentYear))
        .limit(1)
        .execute()

      latestYear = latestYearResult.length > 0 ? latestYearResult[0].maxYear : null

      logger.info('Latest year determined', {
        latestYear
      })
    }

    // Add year filter
    if (latestYear) {
      logger.debug('Applying year filter', { year: latestYear })
      conditions.push(eq(studentRecords.currentYear, latestYear))
    }

    // Apply all conditions at once
    logger.debug('Fetching student records with filters')
    const studentRecordsResult = await db.select()
      .from(studentRecords)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .execute()

    if (!studentRecordsResult?.length) {
      logger.info('No students found matching criteria', {
        year: latestYear,
        isDepartmentHead,
        department: isDepartmentHead ? deptHeadResult[0].department : null,
        departmentFilter
      })

      return {
        students: [],
        total: 0,
        year: latestYear,
        isDepartmentHead
      }
    }

    logger.info('Student records found', {
      count: studentRecordsResult.length,
      year: latestYear,
      isDepartmentHead
    })

    // Extract student record IDs
    const studentRecordIds = studentRecordsResult.map(sr => sr.id)

    logger.debug('Fetching related data for students', {
      studentCount: studentRecordIds.length
    })

    // Run all queries in parallel (bulk fetch all related data at once)
    try {
      logger.debug('Attempting bulk data fetch with inArray')

      const [documentsResult, videosResult, reviewerReportsResult, supervisorReportsResult]
          = await Promise.all([
            // Try to use inArray for bulk fetching, which should be much faster
            db.select().from(documents)
              .where(inArray(documents.studentRecordId, studentRecordIds))
              .execute()
              .catch((err) => {
                logger.warn('Bulk documents fetch failed, falling back to individual queries', {
                  error: err.message
                })
                return Promise.all(
                  studentRecordIds.map(id =>
                    db.select().from(documents)
                      .where(eq(documents.studentRecordId, id))
                      .execute()
                  )
                ).then(results => results.flat())
              }),

            db.select().from(videos)
              .where(inArray(videos.studentRecordId, studentRecordIds))
              .execute()
              .catch((err) => {
                logger.warn('Bulk videos fetch failed, falling back to individual queries', {
                  error: err.message
                })
                return Promise.all(
                  studentRecordIds.map(id =>
                    db.select().from(videos)
                      .where(eq(videos.studentRecordId, id))
                      .execute()
                  )
                ).then(results => results.flat())
              }),

            db.select().from(reviewerReports)
              .where(inArray(reviewerReports.studentRecordId, studentRecordIds))
              .execute()
              .catch((err) => {
                logger.warn('Bulk reviewer reports fetch failed, falling back to individual queries', {
                  error: err.message
                })
                return Promise.all(
                  studentRecordIds.map(id =>
                    db.select().from(reviewerReports)
                      .where(eq(reviewerReports.studentRecordId, id))
                      .execute()
                  )
                ).then(results => results.flat())
              }),

            db.select().from(supervisorReports)
              .where(inArray(supervisorReports.studentRecordId, studentRecordIds))
              .execute()
              .catch((err) => {
                logger.warn('Bulk supervisor reports fetch failed, falling back to individual queries', {
                  error: err.message
                })
                return Promise.all(
                  studentRecordIds.map(id =>
                    db.select().from(supervisorReports)
                      .where(eq(supervisorReports.studentRecordId, id))
                      .execute()
                  )
                ).then(results => results.flat())
              })
          ])

      logger.info('Related data fetched successfully', {
        documentsCount: documentsResult.length,
        videosCount: videosResult.length,
        reviewerReportsCount: reviewerReportsResult.length,
        supervisorReportsCount: supervisorReportsResult.length
      })

      // Group data by student with an optimized approach
      logger.debug('Organizing related data by student')

      const documentsMap = new Map()
      const videosMap = new Map()
      const reviewerReportsMap = new Map()
      const supervisorReportsMap = new Map()

      // Create lookup maps for faster access
      documentsResult.forEach((doc) => {
        if (!documentsMap.has(doc.studentRecordId)) {
          documentsMap.set(doc.studentRecordId, [])
        }
        documentsMap.get(doc.studentRecordId).push(doc)
      })

      videosResult.forEach((video) => {
        if (!videosMap.has(video.studentRecordId)) {
          videosMap.set(video.studentRecordId, [])
        }
        videosMap.get(video.studentRecordId).push(video)
      })

      reviewerReportsResult.forEach((report) => {
        if (!reviewerReportsMap.has(report.studentRecordId)) {
          reviewerReportsMap.set(report.studentRecordId, [])
        }
        reviewerReportsMap.get(report.studentRecordId).push(report)
      })

      supervisorReportsResult.forEach((report) => {
        if (!supervisorReportsMap.has(report.studentRecordId)) {
          supervisorReportsMap.set(report.studentRecordId, [])
        }
        supervisorReportsMap.get(report.studentRecordId).push(report)
      })

      // Map the data using the lookup maps
      const studentsData = studentRecordsResult.map((student) => {
        return {
          student,
          documents: documentsMap.get(student.id) || [],
          videos: videosMap.get(student.id) || [],
          reviewerReports: reviewerReportsMap.get(student.id) || [],
          supervisorReports: supervisorReportsMap.get(student.id) || []
        }
      })

      logger.info('Response prepared successfully', {
        studentCount: studentsData.length,
        year: latestYear,
        isDepartmentHead,
        department: isDepartmentHead ? deptHeadResult[0].department : null
      })

      return {
        students: studentsData,
        total: studentRecordsResult.length,
        year: latestYear,
        isDepartmentHead // Include this information so the UI can show appropriate options
      }
    }
    catch (fetchError) {
      logger.error('Error fetching related data', {
        error: fetchError.message,
        stack: fetchError.stack
      })
      throw fetchError
    }
  }
  catch (error) {
    logger.error('Error processing department data request', {
      error: error.message,
      stack: error.stack
    })

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { message: error.message }
    })
  }
})
