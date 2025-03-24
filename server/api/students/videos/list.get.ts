import { eq, desc } from 'drizzle-orm'
import { AwsClient } from 'aws4fetch'
import { videos, studentRecords } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  // Get logger from event context
  const logger = event.context.logger || console

  logger.info('Processing request to fetch student videos')

  const { user } = await requireUserSession(event)
  if (!user) {
    logger.error('Unauthorized access attempt', {
      endpoint: 'fetch-videos'
    })
    throw createError({ statusCode: 403, message: 'Access denied: User not authenticated' })
  }

  logger.info('User authenticated', { email: user.mail })

  try {
    // Find the latest student record
    const email = user.mail
    logger.debug('Finding student record', { email })

    const studentRecordsResult = await useDB()
      .select()
      .from(studentRecords)
      .where(eq(studentRecords.studentEmail, email))
      .orderBy(desc(studentRecords.currentYear))
      .limit(1)
      .execute()

    if (studentRecordsResult.length === 0) {
      logger.info('No student record found', { email })
      return { videos: [] }
    }

    const studentRecord = studentRecordsResult[0]
    logger.info('Found student record', {
      studentId: studentRecord.id,
      name: `${studentRecord.studentName} ${studentRecord.studentLastname}`,
      department: studentRecord.department,
      program: studentRecord.studyProgram
    })

    // Get videos for this student
    logger.debug('Fetching videos for student', {
      studentRecordId: studentRecord.id
    })

    const videoResults = await useDB()
      .select()
      .from(videos)
      .where(eq(videos.studentRecordId, studentRecord.id))
      .orderBy(desc(videos.createdAt))
      .execute()

    logger.info('Found videos for student', {
      videoCount: videoResults.length
    })

    // Generate fresh signed URLs for each video
    logger.debug('Generating signed URLs for videos')

    const blob = hubBlob()

    const videosWithUrls = await Promise.all(videoResults.map(async (video) => {
      try {
        logger.debug('Processing video', {
          videoId: video.id,
          key: video.key
        })

        // Get credentials for this specific video
        const { accountId, bucketName, ...credentials } = await blob.createCredentials({
          permission: 'object-read-only',
          pathnames: [video.key]
        })

        // Create AWS client with the credentials
        const client = new AwsClient(credentials)
        const endpoint = new URL(video.key, `https://${bucketName}.${accountId}.r2.cloudflarestorage.com`)

        // Generate a signed URL with 1-hour expiration
        const { url } = await client.sign(endpoint, {
          method: 'GET',
          aws: { signQuery: true }
        })

        logger.debug('Generated signed URL for video', {
          videoId: video.id,
          key: video.key
        })

        return {
          ...video,
          url // Update with fresh URL
        }
      }
      catch (error) {
        logger.error('Error generating URL for video', {
          videoId: video.id,
          key: video.key,
          error: error.message
        })
        return video // Return the video without updating the URL
      }
    }))

    logger.info('Successfully processed videos request', {
      totalVideos: videosWithUrls.length,
      videosWithUrl: videosWithUrls.filter(v => v.url).length
    })

    return { videos: videosWithUrls }
  }
  catch (error) {
    logger.error('Error fetching videos', {
      error: error.message,
      stack: error.stack
    })

    throw createError({
      statusCode: 500,
      message: 'Failed to fetch videos'
    })
  }
})
