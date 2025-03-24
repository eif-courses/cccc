import { eq, and, inArray, desc } from 'drizzle-orm'
import { studentRecords, documents, videos, reviewerReports, supervisorReports, departmentHeads } from '~~/server/database/schema'

// Define email prefix to department mappings - keep in sync with auth store
const EMAIL_PREFIX_TO_DEPARTMENT = {
  pico: 'Programinės įrangos',
  eico: 'Elektronikos ir kompiuterių inžinerijos katedra',
  isco: 'Informacinių sistemų katedra'
}

export default defineEventHandler(async (event) => {
  // Get logger from event context
  const logger = event.context.logger || console

  logger.info('Processing commission data request')

  try {
    const { user } = await requireUserSession(event)

    if (!user) {
      logger.warn('Unauthorized access attempt', {
        endpoint: 'commission-data'
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
    let conditions = []
    let userRole = 'supervisor' // Default role
    let userDepartment = null
    let isDepartmentHead = false
    let isCommissionMember = false

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

    isDepartmentHead = deptHeadResult.length > 0

    // Determine user role and department
    if (isDepartmentHead) {
      // Department head has commission access
      userDepartment = deptHeadResult[0].department
      conditions.push(eq(studentRecords.department, userDepartment))
      userRole = 'commission'
      isCommissionMember = true

      logger.info('User is a department head', {
        email: user.mail,
        department: userDepartment,
        role: userRole
      })
    }
    else {
      // Check if user is part of a commission based on email prefix
      const userEmail = user.mail.toLowerCase()
      logger.debug('Checking commission membership based on email prefix', {
        email: userEmail
      })

      let foundMatch = false
      for (const [prefix, department] of Object.entries(EMAIL_PREFIX_TO_DEPARTMENT)) {
        if (userEmail.startsWith(prefix)) {
          // User is in a commission, filter by the corresponding department
          userDepartment = department
          conditions.push(eq(studentRecords.department, userDepartment))
          isCommissionMember = true
          userRole = 'commission'

          logger.info('User is a commission member based on email prefix', {
            email: userEmail,
            prefix,
            department,
            role: userRole
          })

          foundMatch = true
          break
        }
      }

      if (!foundMatch) {
        logger.debug('No matching email prefix found', {
          email: userEmail,
          availablePrefixes: Object.keys(EMAIL_PREFIX_TO_DEPARTMENT)
        })
      }

      // If not a department head or commission member, restrict access
      if (!isCommissionMember) {
        logger.info('Access denied: User is not a commission member or department head', {
          email: user.mail
        })

        // Return empty result for non-commission users
        return {
          students: [],
          total: 0,
          year: null,
          isDepartmentHead: false,
          isCommissionMember: false,
          userDepartment: null,
          noAccess: true
        }
      }
    }

    // Add department filter if explicitly provided in the query
    // This overrides the automatic department filtering
    if (departmentFilter) {
      logger.debug('Overriding department filter from query', {
        originalDepartment: userDepartment,
        newDepartment: departmentFilter
      })

      // Remove any existing department condition
      conditions = conditions.filter((cond) => {
        // This is a simplified check - in practice you might need a more robust way to identify department conditions
        return JSON.stringify(cond).indexOf('department') === -1
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
    logger.debug('Fetching student records with conditions', {
      conditionsCount: conditions.length,
      department: userDepartment || departmentFilter,
      year: latestYear
    })

    const studentRecordsResult = await db.select()
      .from(studentRecords)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .execute()

    if (!studentRecordsResult?.length) {
      logger.info('No students found matching criteria', {
        year: latestYear,
        isDepartmentHead,
        isCommissionMember,
        userDepartment,
        departmentFilter
      })

      return {
        students: [],
        total: 0,
        year: latestYear,
        isDepartmentHead,
        isCommissionMember,
        userDepartment
      }
    }

    logger.info('Student records found', {
      count: studentRecordsResult.length,
      year: latestYear,
      isDepartmentHead,
      isCommissionMember,
      userDepartment: userDepartment || departmentFilter
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
        isCommissionMember,
        userDepartment: userDepartment || departmentFilter,
        userRole
      })

      return {
        students: studentsData,
        total: studentRecordsResult.length,
        year: latestYear,
        isDepartmentHead,
        isCommissionMember,
        userDepartment
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
    logger.error('Error processing commission data request', {
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
