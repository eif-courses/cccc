// server/api/reviewer-reports/[id].ts
import { eq } from 'drizzle-orm'
import { reviewerReports } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  // Get logger from event context
  const logger = event.context.logger || console

  const id = parseInt(event.context.params.id)
  const method = getMethod(event)

  logger.info('Reviewer report request', {
    id,
    method
  })

  // Validate ID
  if (isNaN(id)) {
    logger.warn('Invalid report ID format', { id: event.context.params.id })
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid ID format'
    })
  }

  const db = useDB()

  // GET a single reviewer report by ID
  if (method === 'GET') {
    logger.debug('Fetching reviewer report', { id })

    try {
      const report = await db.select()
        .from(reviewerReports)
        .where(eq(reviewerReports.id, id))
        .limit(1)

      if (report.length === 0) {
        logger.warn('Reviewer report not found', { id })
        throw createError({
          statusCode: 404,
          statusMessage: 'Report not found'
        })
      }

      logger.debug('Parsing JSON fields from report', { id })

      // Parse JSON fields
      const parsedReport = {
        ...report[0],
        reviewerPersonalInfo: report[0].reviewerPersonalInfo ? JSON.parse(report[0].reviewerPersonalInfo) : {},
        reviewFields: report[0].reviewFields ? JSON.parse(report[0].reviewFields) : {}
      }

      logger.info('Reviewer report fetched successfully', {
        id,
        hasPersonalInfo: !!report[0].reviewerPersonalInfo,
        hasReviewFields: !!report[0].reviewFields,
        grade: parsedReport.grade,
        isSigned: parsedReport.isSigned
      })

      return { success: true, data: parsedReport }
    }
    catch (error) {
      if (error.statusCode) {
        // This is an already handled error (like 404)
        throw error
      }

      logger.error('Error fetching reviewer report', {
        id,
        error: error.message,
        stack: error.stack
      })

      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch reviewer report'
      })
    }
  }

  // PUT - update an existing reviewer report
  if (method === 'PUT') {
    logger.debug('Updating reviewer report', { id })

    try {
      const body = await readBody(event)
      logger.debug('Update payload received', {
        id,
        fields: Object.keys(body)
      })

      // Check if report exists
      const existingReport = await db.select()
        .from(reviewerReports)
        .where(eq(reviewerReports.id, id))
        .limit(1)

      if (existingReport.length === 0) {
        logger.warn('Reviewer report not found for update', { id })
        throw createError({
          statusCode: 404,
          statusMessage: 'Report not found'
        })
      }

      // Prepare the update data
      const updateData = {}

      // Handle grade if provided
      if (body.grade !== undefined) {
        updateData.grade = typeof body.grade === 'string' ? parseFloat(body.grade) : body.grade
        logger.debug('Updating grade', {
          id,
          grade: updateData.grade
        })
      }

      // Handle reviewerPersonalInfo if provided
      if (body.reviewerPersonalInfo !== undefined) {
        updateData.reviewerPersonalInfo = typeof body.reviewerPersonalInfo === 'string'
          ? body.reviewerPersonalInfo
          : JSON.stringify(body.reviewerPersonalInfo)
        logger.debug('Updating reviewer personal info', { id })
      }

      // Handle reviewFields if provided
      if (body.reviewFields !== undefined) {
        updateData.reviewFields = typeof body.reviewFields === 'string'
          ? body.reviewFields
          : JSON.stringify(body.reviewFields)
        logger.debug('Updating review fields', { id })
      }

      // Handle isSigned if provided
      if (body.isSigned !== undefined) {
        updateData.isSigned = body.isSigned ? 1 : 0
        logger.debug('Updating signature status', {
          id,
          isSigned: updateData.isSigned
        })
      }

      logger.debug('Executing update query', {
        id,
        fieldsToUpdate: Object.keys(updateData)
      })

      // Update the report
      const result = await db.update(reviewerReports)
        .set(updateData)
        .where(eq(reviewerReports.id, id))
        .returning()

      // Parse JSON fields in the response
      const parsedResult = {
        ...result[0],
        reviewerPersonalInfo: result[0].reviewerPersonalInfo ? JSON.parse(result[0].reviewerPersonalInfo) : {},
        reviewFields: result[0].reviewFields ? JSON.parse(result[0].reviewFields) : {}
      }

      logger.info('Reviewer report updated successfully', {
        id,
        updatedFields: Object.keys(updateData),
        grade: parsedResult.grade,
        isSigned: parsedResult.isSigned
      })

      return { success: true, data: parsedResult }
    }
    catch (error) {
      if (error.statusCode) {
        // This is an already handled error
        throw error
      }

      logger.error('Error updating reviewer report', {
        id,
        error: error.message,
        stack: error.stack
      })

      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update reviewer report'
      })
    }
  }

  // DELETE - remove a reviewer report
  if (method === 'DELETE') {
    logger.debug('Deleting reviewer report', { id })

    try {
      // Check if report exists
      const existingReport = await db.select()
        .from(reviewerReports)
        .where(eq(reviewerReports.id, id))
        .limit(1)

      if (existingReport.length === 0) {
        logger.warn('Reviewer report not found for deletion', { id })
        throw createError({
          statusCode: 404,
          statusMessage: 'Report not found'
        })
      }

      // Delete the report
      await db.delete(reviewerReports)
        .where(eq(reviewerReports.id, id))

      logger.info('Reviewer report deleted successfully', { id })

      return { success: true, message: 'Report deleted successfully' }
    }
    catch (error) {
      if (error.statusCode) {
        // This is an already handled error
        throw error
      }

      logger.error('Error deleting reviewer report', {
        id,
        error: error.message,
        stack: error.stack
      })

      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete reviewer report'
      })
    }
  }

  // Method not allowed
  logger.warn('Method not allowed', {
    id,
    method,
    allowedMethods: ['GET', 'PUT', 'DELETE']
  })

  throw createError({
    statusCode: 405,
    statusMessage: 'Method not allowed'
  })
})
