import { z } from 'zod'
import { AwsClient } from 'aws4fetch'
import { eq, desc } from 'drizzle-orm'
import { studentRecords, documents } from '~~/server/database/schema'

export default eventHandler(async (event) => {
  // Get logger from event context
  const logger = event.context.logger || console

  logger.info('Processing file upload request')

  const { user } = await requireUserSession(event)
  if (!user) {
    logger.warn('Unauthorized access attempt', {
      endpoint: 'file-upload'
    })
    throw createError({ statusCode: 403, message: 'Access denied: User not authenticated' })
  }

  logger.info('User authenticated', {
    email: user.mail
  })

  try {
    // Validate the incoming request
    const { pathname } = await getValidatedRouterParams(event, z.object({
      pathname: z.string().min(1)
    }).parse)

    // Decode the incoming pathname
    const decodedPathname = decodeURIComponent(pathname)
    logger.debug('Path parameters validated', {
      originalPathname: pathname,
      decodedPathname
    })

    // Query the database to get the latest student record by user email
    const email = user.mail
    logger.debug('Finding latest student record', {
      email
    })

    const latestRecord = await useDB()
      .select()
      .from(studentRecords)
      .where(eq(studentRecords.studentEmail, email))
      .orderBy(desc(studentRecords.currentYear))
      .limit(1)
      .execute()

    // Check if a record was found
    if (latestRecord.length === 0) {
      logger.warn('No student record found', {
        email
      })
      throw new Error('No records found for the specified user email.')
    }

    const record = latestRecord[0]
    const { studyProgram, department, studentGroup, currentYear, studentName, studentLastname, id: studentRecordId } = record

    logger.info('Student record found', {
      studentRecordId,
      currentYear,
      department,
      studyProgram,
      studentGroup,
      name: `${studentName} ${studentLastname}`
    })

    // Construct the full path
    const fullPath = `${currentYear}/${department}/${studyProgram}/${studentGroup}/${studentName} ${studentLastname}/${decodedPathname}`
    logger.debug('Constructed storage path', {
      fullPath
    })

    // Assuming hubBlob() initializes a blob storage client
    logger.debug('Requesting R2 credentials')
    const blob = hubBlob()
    const { accountId, bucketName, ...credentials } = await blob.createCredentials({
      permission: 'object-read-write',
      pathnames: [fullPath]
    })

    logger.debug('R2 credentials obtained', {
      bucketName,
      fullPath
    })

    const client = new AwsClient(credentials)
    const endpoint = new URL(fullPath, `https://${bucketName}.${accountId}.r2.cloudflarestorage.com`)

    logger.debug('Constructed R2 endpoint', {
      endpoint: endpoint.href
    })

    // Sign the request
    logger.debug('Generating presigned upload URL')
    const { url: uploadUrl } = await client.sign(endpoint, {
      method: 'PUT',
      aws: { signQuery: true }
    })

    logger.info('Presigned URL generated successfully', {
      urlLength: uploadUrl.length
    })

    // Step 2: Upload file to R2 using the presigned URL
    logger.debug('Reading uploaded file data')
    const file = await readMultipartFormData(event)
    if (!file || file.length === 0) {
      logger.warn('No file uploaded')
      throw new Error('No file uploaded.')
    }

    const fileData = file[0].data
    const fileType = file[0].type || 'application/octet-stream'
    const fileName = file[0].filename || decodedPathname

    logger.info('File data received', {
      fileName,
      fileType,
      fileSize: fileData.length,
      destinationPath: fullPath
    })

    logger.debug('Uploading file to R2 storage')
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: fileData,
      headers: {
        'Content-Type': fileType
      }
    })

    // Check if the upload response is okay
    if (!uploadResponse.ok) {
      const responseText = await uploadResponse.text()
      logger.error('R2 upload failed', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        responseText: responseText.substring(0, 200) // Truncate long response text
      })
      throw new Error('Upload failed: ' + responseText)
    }

    logger.info('File uploaded to R2 successfully', {
      fullPath
    })

    // Step 3: Insert document metadata into the database
    const documentType = fileName.split('.').pop()?.toUpperCase() || 'FILE'
    const timestamp = Math.floor(new Date().getTime() / 1000)

    logger.debug('Saving document metadata to database', {
      documentType,
      filePath: fullPath,
      uploadedDate: timestamp,
      studentRecordId
    })

    await useDB().insert(documents).values({
      documentType: documentType,
      filePath: fullPath,
      uploadedDate: timestamp,
      studentRecordId: studentRecordId
    })

    logger.info('Document metadata saved successfully', {
      studentRecordId,
      filePath: fullPath,
      documentType
    })

    return { success: true, message: 'File uploaded and metadata saved successfully.' }
  }
  catch (error) {
    logger.error('Error during file upload', {
      error: error.message,
      stack: error.stack
    })

    return { error: error.message || 'An error occurred during the upload process.' }
  }
})
