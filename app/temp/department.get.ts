import { eq, and, inArray } from 'drizzle-orm'
import { studentRecords, documents, videos, reviewerReports, supervisorReports } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  try {
    const { user } = await requireUserSession(event)

    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const query = getQuery(event)
    const year = parseInt(query.year as string) || null

    // Simple query - just get all students by supervisor email and year
    const db = useDB()

    // Create conditions array
    const conditions = [eq(studentRecords.supervisorEmail, user.mail)]

    // Add year filter if provided
    if (year) {
      conditions.push(eq(studentRecords.currentYear, year))
    }

    // Apply all conditions at once
    const studentRecordsResult = await db.select()
      .from(studentRecords)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .execute()

    if (!studentRecordsResult?.length) {
      return {
        students: [],
        total: 0
      }
    }

    // Extract student record IDs
    const studentRecordIds = studentRecordsResult.map(sr => sr.id)

    // Run all queries in parallel (bulk fetch all related data at once)
    // Note: We'll try inArray first since it should be much faster for bulk operations
    const [documentsResult, videosResult, reviewerReportsResult, supervisorReportsResult]
        = await Promise.all([
          // Try to use inArray for bulk fetching, which should be much faster
          db.select().from(documents)
            .where(inArray(documents.studentRecordId, studentRecordIds))
            .execute()
            .catch(() => {
              // Fallback to individual queries if inArray fails
              console.log('Falling back to individual document queries')
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
            .catch(() => {
              console.log('Falling back to individual video queries')
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
            .catch(() => {
              console.log('Falling back to individual reviewer report queries')
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
            .catch(() => {
              console.log('Falling back to individual supervisor report queries')
              return Promise.all(
                studentRecordIds.map(id =>
                  db.select().from(supervisorReports)
                    .where(eq(supervisorReports.studentRecordId, id))
                    .execute()
                )
              ).then(results => results.flat())
            })
        ])

    // Group data by student with an optimized approach
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

    return {
      students: studentsData,
      total: studentRecordsResult.length
    }
  }
  catch (error) {
    console.error('Department API Error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { message: error.message }
    })
  }
})
