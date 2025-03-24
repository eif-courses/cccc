import { eq, desc } from 'drizzle-orm'
import { studentRecords, documents, videos, supervisorReports, reviewerReports } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  // Get logger from event context
  const logger = event.context.logger || console

  logger.info('Processing student profile request')

  const { user } = await requireUserSession(event)

  if (!user) {
    logger.error('Unauthorized access attempt', {
      endpoint: 'student-profile'
    })
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const userEmail = user.mail
  logger.info('User authenticated', {
    email: userEmail
  })

  // Find the latest student record by email
  logger.debug('Finding latest student record', {
    email: userEmail
  })

  const studentRecordsResult = await useDB()
    .select()
    .from(studentRecords)
    .where(eq(studentRecords.studentEmail, userEmail)) // Match by email
    .orderBy(desc(studentRecords.currentYear)) // Get the latest year
    .limit(1) // Only one record
    .execute()

  if (studentRecordsResult.length === 0) {
    logger.warn('No student record found', {
      email: userEmail
    })
    return sendError(event, createError({ statusCode: 404, message: 'Student record not found' }))
  }

  const studentRecord = studentRecordsResult[0]
  logger.info('Student record found', {
    id: studentRecord.id,
    name: `${studentRecord.studentName} ${studentRecord.studentLastname}`,
    year: studentRecord.currentYear,
    department: studentRecord.department,
    studyProgram: studentRecord.studyProgram
  })

  // Fetch related data in parallel
  logger.debug('Fetching related data', {
    studentRecordId: studentRecord.id
  })

  try {
    const [userDocuments, userVideos, userSupervisorReports, userReviewerReports] = await Promise.all([
      useDB().select().from(documents).where(eq(documents.studentRecordId, studentRecord.id)).execute(),
      useDB().select().from(videos).where(eq(videos.studentRecordId, studentRecord.id)).execute(),
      useDB().select().from(supervisorReports).where(eq(supervisorReports.studentRecordId, studentRecord.id)).execute(),
      useDB().select().from(reviewerReports).where(eq(reviewerReports.studentRecordId, studentRecord.id)).execute()
    ])

    logger.info('Related data fetched successfully', {
      documentsCount: userDocuments.length,
      videosCount: userVideos.length,
      supervisorReportsCount: userSupervisorReports.length,
      reviewerReportsCount: userReviewerReports.length
    })

    // Parse JSON fields in reviewer reports if they exist
    const parsedReviewerReports = userReviewerReports.map((report) => {
      try {
        return {
          ...report,
          reviewerPersonalInfo: report.reviewerPersonalInfo ? JSON.parse(report.reviewerPersonalInfo) : {},
          reviewFields: report.reviewFields ? JSON.parse(report.reviewFields) : {}
        }
      }
      catch (error) {
        logger.warn('Error parsing reviewer report JSON fields', {
          reportId: report.id,
          error: error.message
        })
        return report
      }
    })

    logger.info('Profile data prepared successfully')

    // Return the response
    return {
      studentRecord,
      documents: userDocuments,
      videos: userVideos,
      supervisorReports: userSupervisorReports,
      reviewerReports: parsedReviewerReports
    }
  }
  catch (error) {
    logger.error('Error fetching related data', {
      studentRecordId: studentRecord.id,
      error: error.message,
      stack: error.stack
    })

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load student profile data'
    })
  }
})
