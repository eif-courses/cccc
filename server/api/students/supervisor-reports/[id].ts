// server/api/supervisor-reports/[id].ts
import { eq } from 'drizzle-orm'
import { supervisorReports } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  // Get logger from event context
  const logger = event.context.logger || console

  const id = parseInt(event.context.params.id)
  const method = getMethod(event)

  logger.info('Supervisor report request', {
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

  // GET a single supervisor report by ID
  if (method === 'GET') {
    logger.debug('Fetching supervisor report', { id })

    try {
      const report = await db.select()
        .from(supervisorReports)
        .where(eq(supervisorReports.id, id))
        .limit(1)

      if (report.length === 0) {
        logger.warn('Supervisor report not found', { id })
        throw createError({
          statusCode: 404,
          statusMessage: 'Report not found'
        })
      }

      logger.info('Supervisor report fetched successfully', {
        id,
        reportId: report[0].id
      })

      return { success: true, data: report[0] }
    }
    catch (error) {
      if (error.statusCode) {
        // This is an already handled error (like 404)
        throw error
      }

      logger.error('Error fetching supervisor report', {
        id,
        error: error.message,
        stack: error.stack
      })

      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch supervisor report'
      })
    }
  }

  // PUT - update an existing supervisor report
  if (method === 'PUT') {
    logger.debug('Updating supervisor report', { id })

    try {
      const body = await readBody(event)
      logger.debug('Update payload received', {
        id,
        fields: Object.keys(body)
      })

      // Check if report exists
      const existingReport = await db.select()
        .from(supervisorReports)
        .where(eq(supervisorReports.id, id))
        .limit(1)

      if (existingReport.length === 0) {
        logger.warn('Supervisor report not found for update', { id })
        throw createError({
          statusCode: 404,
          statusMessage: 'Report not found'
        })
      }

      // Update report
      const updateData = {
        ...(body.supervisorComments !== undefined && { supervisorComments: body.supervisorComments }),
        ...(body.otherMatch !== undefined && { otherMatch: body.otherMatch }),
        ...(body.oneMatch !== undefined && { oneMatch: body.oneMatch }),
        ...(body.ownMatch !== undefined && { ownMatch: body.ownMatch }),
        ...(body.joinMatch !== undefined && { joinMatch: body.joinMatch })
      }

      logger.debug('Updating report with data', {
        id,
        fieldsToUpdate: Object.keys(updateData)
      })

      const result = await db.update(supervisorReports)
        .set(updateData)
        .where(eq(supervisorReports.id, id))
        .returning()

      logger.info('Supervisor report updated successfully', {
        id,
        updatedFields: Object.keys(updateData)
      })

      return { success: true, data: result[0] }
    }
    catch (error) {
      if (error.statusCode) {
        // This is an already handled error
        throw error
      }

      logger.error('Error updating supervisor report', {
        id,
        error: error.message,
        stack: error.stack
      })

      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update supervisor report'
      })
    }
  }

  // DELETE - remove a supervisor report
  if (method === 'DELETE') {
    logger.debug('Deleting supervisor report', { id })

    try {
      // Check if report exists
      const existingReport = await db.select()
        .from(supervisorReports)
        .where(eq(supervisorReports.id, id))
        .limit(1)

      if (existingReport.length === 0) {
        logger.warn('Supervisor report not found for deletion', { id })
        throw createError({
          statusCode: 404,
          statusMessage: 'Report not found'
        })
      }

      // Delete the report
      await db.delete(supervisorReports)
        .where(eq(supervisorReports.id, id))

      logger.info('Supervisor report deleted successfully', { id })

      return { success: true, message: 'Report deleted successfully' }
    }
    catch (error) {
      if (error.statusCode) {
        // This is an already handled error
        throw error
      }

      logger.error('Error deleting supervisor report', {
        id,
        error: error.message,
        stack: error.stack
      })

      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete supervisor report'
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
