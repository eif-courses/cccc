import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import AdmZip from 'adm-zip'
import { eq, and } from 'drizzle-orm'
import { AwsClient } from 'aws4fetch' // Import the AWS client for signing requests
import { documents, studentRecords } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  // Read uploaded ZIP files
  const form = await readMultipartFormData(event)
  const files = form?.filter(field => field.name === 'file')

  if (!files || files.length === 0) {
    throw createError({ statusCode: 400, message: 'No ZIP files uploaded' })
  }

  for (const file of files) {
    console.log(`📦 Processing ZIP file: ${file.filename}`)

    try {
      // Read ZIP file
      const zip = new AdmZip(file.data)
      const zipEntries = zip.getEntries()

      for (const entry of zipEntries) {
        if (!entry.isDirectory && entry.entryName.endsWith('.pdf')) {
          const pathParts = entry.entryName.split('/') // Split path into parts
          const folderWithStudent = pathParts[1] || '' // Get the student folder
          const studentName = folderWithStudent.split('_')[0].trim() // Extract name

          console.log(`📄 Found PDF: ${entry.entryName}`)
          console.log(`🔍 Extracted Student Name: ${studentName}`)

          if (!studentName) {
            console.warn(`⚠️ Could not extract a valid student name from: ${entry.entryName}`)
            continue
          }

          const words = studentName.toLowerCase().trim().split(/\s+/)

          const likeConditions = words.map(word =>
              sql`LOWER(${studentRecords.studentName}) LIKE '%' || LOWER(${word}) || '%'`
          )

          // Query to find a matching student with year filter
          const student = await useDB()
              .select({
                id: studentRecords.id,
                currentYear: studentRecords.currentYear,
                studyProgram: studentRecords.studyProgram,
                studentGroup: studentRecords.studentGroup,
                studentName: studentRecords.studentName
              })
              .from(studentRecords)
              .where(
                  and(
                      ...likeConditions, // Name matching
                      eq(studentRecords.currentYear, 2025) // Filter by year (adjust as needed)
                  )
              )
              .limit(1)
              .then(rows => rows[0])

          if (student) {
            console.log(`✅ Matched Student ID: ${student.id}`)

            const documentPath = `${student.currentYear}/${student.studyProgram}/${student.studentGroup}/${student.studentName}/`
            const pdfFileName = entry.entryName.split('/').pop() // Extract the file name

            // Generate the presigned URL for uploading to R2
            const presignedUrl = await generatePresignedUrl(documentPath + pdfFileName)

            // Upload the PDF to R2 using the presigned URL
            await uploadToR2(presignedUrl, entry.getData()) // Upload the PDF data

            // Insert document record into the database
            await useDB().insert(documents).values({
              documentType: 'PDF',
              filePath: documentPath + pdfFileName,
              uploadedDate: Date.now(),
              studentRecordId: student.id
            })
          }
          else {
            console.warn(`⚠️ No matching student found for: ${studentName}`)
          }
        }
      }
    }
    catch (error) {
      console.error('❌ Error processing ZIP:', error)
      throw createError({ statusCode: 500, message: 'ZIP processing failed' })
    }
  }

  return { success: true, message: 'ZIP processed successfully' }
})

// Function to generate a presigned URL for uploading to R2
async function generatePresignedUrl(filePath) {
  const blob = hubBlob() // Assuming you have a function to get the blob service

  const { accountId, bucketName, ...credentials } = await blob.createCredentials({
    permission: 'object-read-write',
    pathnames: [filePath]
  })
  // const { accountId, bucketName } = await blob.getBucketInfo() // Get bucket info

  const client = new AwsClient(credentials)
  const endpoint = new URL(`https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${filePath}`)

  const { url } = await client.sign(endpoint, {
    method: 'PUT',
    aws: { signQuery: true }
  })

  return url // Return the presigned URL
}

// Function to upload the PDF data to R2 using the presigned URL
async function uploadToR2(presignedUrl, fileData) {
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/pdf' // Set the appropriate content type
    },
    body: fileData // The actual PDF file data
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`)
  }
}
