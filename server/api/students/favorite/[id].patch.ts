// server/api/students/favorite/[id].patch.ts

import { eq } from 'drizzle-orm'
import { studentRecords } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  // Get logger from event context
  const logger = event.context.logger || console

  // Get the student ID from the URL parameter
  const id = getRouterParam(event, 'id')

  logger.info('Processing favorite status update request', {
    studentId: id
  })

  // Verify user is authenticated
  const { user } = await requireUserSession(event)
  if (!user) {
    logger.warn('Unauthorized access attempt', {
      endpoint: 'favorite-update',
      studentId: id
    })
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  logger.info('User authenticated', {
    email: user.mail,
    studentId: id
  })

  try {
    // Parse the request body
    const body = await readBody(event)
    logger.debug('Request body received', {
      studentId: id,
      requestBody: body
    })

    // Validate the favorite value (must be 0 or 1)
    const isFavorite = parseInt(body.isFavorite)

    if (isFavorite !== 0 && isFavorite !== 1) {
      logger.warn('Invalid favorite value', {
        studentId: id,
        receivedValue: body.isFavorite
      })
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid favorite value. Must be 0 or 1.'
      })
    }

    logger.debug('Updating favorite status in database', {
      studentId: id,
      isFavorite
    })

    // Update the favorite status in the database using Drizzle ORM
    const result = await useDB()
      .update(studentRecords)
      .set({ isFavorite })
      .where(eq(studentRecords.id, parseInt(id)))
      .returning({ id: studentRecords.id })

    // Check if the update was successful
    if (!result.length) {
      logger.warn('Student not found for favorite update', {
        studentId: id
      })
      throw createError({
        statusCode: 404,
        statusMessage: 'Student not found'
      })
    }

    logger.info('Favorite status updated successfully', {
      studentId: id,
      isFavorite,
      userEmail: user.mail
    })

    // Return success response
    return {
      success: true,
      id: parseInt(id),
      isFavorite
    }
  }
  catch (error) {
    if (error.statusCode) {
      // This is an already handled error (like 404 or 400)
      throw error
    }

    logger.error('Error updating favorite status', {
      studentId: id,
      error: error.message,
      stack: error.stack
    })

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
