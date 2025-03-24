// server/api/reviewer-reports/index.ts
import { eq } from 'drizzle-orm'
import { reviewerReports, studentRecords } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  // Get logger from event context
  const logger = event.context.logger || console

  const method = getMethod(event)
  logger.info('Reviewer reports request', { method })

  const db = useDB()

  // GET all reviewer reports
  if (method === 'GET') {
    try {
      const query = getQuery(event)
      logger.debug('GET query parameters', { query })

      // Option to filter by student record ID
      if (query.studentRecordId) {
        const studentId = parseInt(query.studentRecordId as string)
        logger.info('Fetching reports for specific student', { studentId })

        const reports = await db.select()
          .from(reviewerReports)
          .where(eq(reviewerReports.studentRecordId, studentId))

        logger.debug('Reports fetched, parsing JSON fields', {
          count: reports.length
        })

        // Parse the JSON fields for each report
        const parsedReports = reports.map(report => ({
          ...report,
          reviewerPersonalInfo: report.reviewerPersonalInfo ? JSON.parse(report.reviewerPersonalInfo) : {},
          reviewFields: report.reviewFields ? JSON.parse(report.reviewFields) : {}
        }))

        logger.info('Reports fetched and parsed successfully', {
          studentId,
          count: parsedReports.length
        })

        return { success: true, data: parsedReports }
      }

      // Return all reports
      logger.info('Fetching all reviewer reports')
      const reports = await db.select().from(reviewerReports)

      logger.debug('All reports fetched, parsing JSON fields', {
        count: reports.length
      })

      // Parse the JSON fields for each report
      const parsedReports = reports.map(report => ({
        ...report,
        reviewerPersonalInfo: report.reviewerPersonalInfo ? JSON.parse(report.reviewerPersonalInfo) : {},
        reviewFields: report.reviewFields ? JSON.parse(report.reviewFields) : {}
      }))

      logger.info('All reports fetched and parsed successfully', {
        count: parsedReports.length
      })

      return { success: true, data: parsedReports }
    }
    catch (error) {
      logger.error('Error fetching reviewer reports', {
        error: error.message,
        stack: error.stack
      })

      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch reviewer reports',
        cause: error
      })
    }
  }

  // POST - create a new reviewer report
  if (method === 'POST') {
    logger.info('Creating new reviewer report')

    try {
      const body = await readBody(event)
      logger.debug('Received request body', {
        body: {
          studentRecordId: body.studentRecordId,
          grade: body.grade,
          isSigned: body.isSigned,
          hasReviewerInfo: !!body.reviewerPersonalInfo,
          hasReviewFields: !!body.reviewFields
        }
      })

      // Validate required fields
      if (!body.studentRecordId) {
        logger.warn('Missing studentRecordId in request')
        throw createError({
          statusCode: 400,
          statusMessage: 'Student record ID is required'
        })
      }

      // Ensure studentRecordId is a number
      const studentRecordId = typeof body.studentRecordId === 'string'
        ? parseInt(body.studentRecordId)
        : body.studentRecordId

      logger.debug('Validating student record', {
        studentRecordId
      })

      // Check if student record exists
      const studentRecord = await db.select()
        .from(studentRecords)
        .where(eq(studentRecords.id, studentRecordId))
        .limit(1)

      if (studentRecord.length === 0) {
        logger.warn('Student record not found', {
          studentRecordId
        })

        throw createError({
          statusCode: 404,
          statusMessage: `Student record with ID ${studentRecordId} not found`
        })
      }

      logger.debug('Student record found', {
        studentRecordId,
        studentName: studentRecord[0].studentName,
        studentLastname: studentRecord[0].studentLastname
      })

      // Make sure grade is properly coerced to number
      const grade = typeof body.grade === 'string' ? parseFloat(body.grade) : (body.grade || 0)

      // Extract reviewer personal info and review fields
      const reviewerPersonalInfo = typeof body.reviewerPersonalInfo === 'string'
        ? body.reviewerPersonalInfo
        : JSON.stringify(body.reviewerPersonalInfo || {})

      const reviewFields = typeof body.reviewFields === 'string'
        ? body.reviewFields
        : JSON.stringify(body.reviewFields || {})

      // Set isSigned value (0 for false, 1 for true)
      const isSigned = body.isSigned ? 1 : 0

      // Create new report with your schema structure
      const newReport = {
        studentRecordId,
        grade,
        reviewerPersonalInfo,
        reviewFields,
        isSigned
      }

      logger.debug('Prepared report data', {
        studentRecordId,
        grade,
        isSigned,
        hasReviewerInfo: !!reviewerPersonalInfo,
        hasReviewFields: !!reviewFields
      })

      // Check if a report already exists for this student
      logger.debug('Checking for existing report', {
        studentRecordId
      })

      const existingReport = await db.select()
        .from(reviewerReports)
        .where(eq(reviewerReports.studentRecordId, studentRecordId))
        .limit(1)

      let result
      let action = 'created'

      if (existingReport.length > 0) {
        // Update existing report
        logger.info('Existing report found, updating instead of creating', {
          existingReportId: existingReport[0].id,
          studentRecordId
        })

        action = 'updated'
        result = await db.update(reviewerReports)
          .set(newReport)
          .where(eq(reviewerReports.id, existingReport[0].id))
          .returning()
      }
      else {
        // Insert new report
        logger.info('No existing report found, creating new')
        result = await db.insert(reviewerReports)
          .values(newReport)
          .returning()
      }

      logger.debug('Parsing JSON fields for response')

      // Parse the JSON fields back to objects for the response
      const responseData = {
        ...result[0],
        reviewerPersonalInfo: result[0].reviewerPersonalInfo ? JSON.parse(result[0].reviewerPersonalInfo) : {},
        reviewFields: result[0].reviewFields ? JSON.parse(result[0].reviewFields) : {}
      }

      logger.info(`Reviewer report ${action} successfully`, {
        reportId: result[0].id,
        studentRecordId,
        action
      })

      return { success: true, data: responseData }
    }
    catch (error) {
      // If it's already a Nuxt error, just re-throw it
      if (error.statusCode) {
        throw error
      }

      logger.error('Error creating reviewer report', {
        error: error.message,
        stack: error.stack
      })

      // Otherwise, create a new error with the cause
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create reviewer report',
        cause: error
      })
    }
  }

  // Method not allowed
  logger.warn('Method not allowed', {
    method,
    allowedMethods: ['GET', 'POST']
  })

  throw createError({
    statusCode: 405,
    statusMessage: 'Method not allowed'
  })
})
