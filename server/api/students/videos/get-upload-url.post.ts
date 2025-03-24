// server/api/students/videos/get-upload-url.post.ts
import { AwsClient } from 'aws4fetch'
import { eq, desc } from 'drizzle-orm'
import { studentRecords } from '~~/server/database/schema' // Adjust the path to your schema

export default defineEventHandler(async (event) => {
  // Get logger from event context
  const logger = event.context.logger || console

  // Get authenticated user from session
  logger.info('Processing request for upload URL')

  const { user } = await requireUserSession(event)

  if (!user) {
    logger.error('Unauthorized access attempt')
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const userEmail = user.mail
  logger.info('User authenticated', { email: userEmail })

  try {
    // Get filename from request body
    const body = await readBody(event)
    const { filename, contentType } = body

    if (!filename) {
      logger.warn('Missing filename in request', { body })
      throw createError({ statusCode: 400, message: 'Filename is required' })
    }

    logger.debug('Request parameters', {
      filename,
      contentType: contentType || 'Not specified'
    })

    // Find the latest student record by email
    logger.debug('Finding student record', { email: userEmail })

    const studentRecordsResult = await useDB()
      .select()
      .from(studentRecords)
      .where(eq(studentRecords.studentEmail, userEmail)) // Match by email
      .orderBy(desc(studentRecords.currentYear)) // Get the latest year
      .limit(1) // Only one record
      .execute()

    if (!studentRecordsResult || studentRecordsResult.length === 0) {
      logger.warn('No student record found', { email: userEmail })
      throw createError({
        statusCode: 404,
        message: `No student record found for email: ${userEmail}`
      })
    }

    const student = studentRecordsResult[0]
    logger.info('Found student record', {
      studentId: student.id,
      name: `${student.studentName} ${student.studentLastname}`,
      department: student.department,
      program: student.studyProgram
    })

    // Generate a unique filename with timestamp
    const timestamp = Date.now()
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const videoFilename = `${timestamp}-${sanitizedFilename}`

    // Create folder path using student information
    const folderPath = `${student.currentYear}/${student.department}/${student.studyProgram}/${student.studentGroup}/${student.studentName} ${student.studentLastname}`

    // Complete video path
    const videoPath = `${folderPath}/${videoFilename}`
    logger.debug('Generated video path', { videoPath })

    // Get R2 credentials
    logger.debug('Requesting R2 credentials')
    const blob = hubBlob()
    const { accountId, bucketName, ...credentials } = await blob.createCredentials({
      permission: 'object-read-write',
      pathnames: [videoPath]
    })

    // Create AWS client
    const client = new AwsClient(credentials)
    const endpoint = new URL(`https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${videoPath}`)

    // Generate pre-signed URL for PUT
    logger.debug('Generating pre-signed upload URL')
    const { url: uploadUrl } = await client.sign(endpoint, {
      method: 'PUT',
      aws: { signQuery: true }
    })

    // Also generate URL for viewing after upload
    logger.debug('Generating pre-signed view URL')
    const { url: viewUrl } = await client.sign(endpoint, {
      method: 'GET',
      aws: { signQuery: true } // 24 hours for viewing
    })

    logger.info('Successfully generated upload URLs', {
      filename: sanitizedFilename,
      contentType: contentType || 'video/mp4',
      key: videoPath
    })

    // Return URLs and path info to the client
    return {
      success: true,
      data: {
        uploadUrl,
        viewUrl,
        key: videoPath,
        filename: sanitizedFilename,
        contentType: contentType || 'video/mp4',
        folderPath
      }
    }
  }
  catch (error) {
    logger.error('Error generating upload URL', {
      error: error.message,
      stack: error.stack
    })

    return {
      success: false,
      error: {
        message: error.message || 'Failed to generate upload URL'
      }
    }
  }
})
