// server/api/supervisor-reports/index.ts
import { eq } from 'drizzle-orm'
import { supervisorReports, studentRecords } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  // Get logger from event context
  const logger = event.context.logger || console

  const method = getMethod(event)
  logger.info('Supervisor reports request', { method })

  const db = useDB()

  // GET all supervisor reports
  if (method === 'GET') {
    try {
      const query = getQuery(event)
      logger.debug('GET query parameters', { query })

      // Option to filter by student record ID
      if (query.studentRecordId) {
        const studentId = parseInt(query.studentRecordId as string)
        logger.info('Fetching reports for specific student', { studentId })

        const reports = await db.select()
          .from(supervisorReports)
          .where(eq(supervisorReports.studentRecordId, studentId))

        logger.info('Reports fetched successfully', {
          studentId,
          count: reports.length
        })

        return { success: true, data: reports }
      }

      // Return all reports
      logger.info('Fetching all supervisor reports')
      const reports = await db.select().from(supervisorReports)

      logger.info('All reports fetched successfully', {
        count: reports.length
      })

      return { success: true, data: reports }
    }
    catch (error) {
      logger.error('Error fetching supervisor reports', {
        error: error.message,
        stack: error.stack
      })

      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch supervisor reports',
        cause: error
      })
    }
  }

  // POST - create a new supervisor report
  if (method === 'POST') {
    logger.info('Creating new supervisor report')

    try {
      const body = await readBody(event)
      logger.debug('Received request body', {
        body: {
          ...body,
          supervisorComments: body.supervisorComments
            ? `${body.supervisorComments.substring(0, 20)}${body.supervisorComments.length > 20 ? '...' : ''}`
            : undefined
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

      // Make sure all numeric fields are properly coerced to numbers
      const otherMatch = typeof body.otherMatch === 'string' ? parseFloat(body.otherMatch) : (body.otherMatch || 0)
      const oneMatch = typeof body.oneMatch === 'string' ? parseFloat(body.oneMatch) : (body.oneMatch || 0)
      const ownMatch = typeof body.ownMatch === 'string' ? parseFloat(body.ownMatch) : (body.ownMatch || 0)
      const joinMatch = typeof body.joinMatch === 'string' ? parseFloat(body.joinMatch) : (body.joinMatch || 0)

      // Create new report
      const newReport = {
        studentRecordId: studentRecordId,
        supervisorComments: body.supervisorComments || '',
        otherMatch,
        oneMatch,
        ownMatch,
        joinMatch
      }

      logger.debug('Prepared report data', {
        studentRecordId,
        hasComments: !!newReport.supervisorComments,
        commentLength: newReport.supervisorComments.length
      })

      const result = await db.insert(supervisorReports).values(newReport).returning()

      logger.info('Supervisor report created successfully', {
        reportId: result[0].id,
        studentRecordId
      })

      return { success: true, data: result[0] }
    }
    catch (error) {
      // If it's already a Nuxt error, just re-throw it
      if (error.statusCode) {
        throw error
      }

      logger.error('Error creating supervisor report', {
        error: error.message,
        stack: error.stack
      })

      // Otherwise, create a new error with the cause
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create supervisor report',
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
