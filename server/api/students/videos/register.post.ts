// server/api/students/videos/register.post.ts
import type { InferInsertModel } from 'drizzle-orm'
import { eq, desc } from 'drizzle-orm'
import { studentRecords, videos } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  // Get logger from event context (added by the middleware)
  const logger = event.context.logger || console

  try {
    // Log the start of processing
    logger.info('Processing video registration request')

    const { user } = await requireUserSession(event)
    if (!user) {
      logger.warn('Authentication failure', { email: 'unknown' })
      throw createError({ statusCode: 403, message: 'Access denied: User not authenticated' })
    }

    // Log authenticated user
    logger.info('User authenticated', { email: user.mail })

    // Get upload details from request body
    const { key, filename, contentType, size, url } = await readBody(event)

    if (!key || !filename) {
      logger.warn('Invalid request data', {
        missing: !key ? 'key' : 'filename'
      })
      throw createError({ statusCode: 400, message: 'Key and filename are required' })
    }

    // Find the latest student record
    const email = user.mail
    logger.debug('Finding latest student record', { email })

    const latestRecord = await useDB()
      .select()
      .from(studentRecords)
      .where(eq(studentRecords.studentEmail, email))
      .orderBy(desc(studentRecords.currentYear))
      .limit(1)
      .execute()

    if (latestRecord.length === 0) {
      logger.warn('No student record found', { email })
      throw createError({
        statusCode: 404,
        message: 'No student record found for the current user'
      })
    }

    const { id: studentRecordId } = latestRecord[0]
    logger.debug('Found student record', {
      studentRecordId,
      currentYear: latestRecord[0].currentYear
    })

    // Save to database
    type NewVideo = InferInsertModel<typeof videos>
    const newVideoRecord: NewVideo = {
      studentRecordId,
      key,
      filename,
      contentType: contentType || 'video/mp4',
      size: parseInt(String(size), 10),
      url: url || null,
      createdAt: new Date().toISOString()
    }

    logger.debug('Saving video record to database', {
      key,
      filename,
      size: newVideoRecord.size
    })

    const result = await useDB()
      .insert(videos)
      .values(newVideoRecord)
      .execute()

    logger.info('Video registered successfully', {
      key,
      studentRecordId,
      size: newVideoRecord.size
    })

    return {
      success: true,
      data: {
        id: newVideoRecord.id,
        key,
        url
      }
    }
  }
  catch (error) {
    logger.error('Error registering upload', {
      error: error.message,
      stack: error.stack
    })

    return {
      success: false,
      error: {
        message: error.message || 'Failed to register upload'
      }
    }
  }
})
