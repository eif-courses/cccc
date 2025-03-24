import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import AdmZip from 'adm-zip'
import { eq, and, desc, sql, or, like } from 'drizzle-orm'
import { AwsClient } from 'aws4fetch' // Import the AWS client for signing requests
import { documents, studentRecords } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  // Get the latest year from the database

    const body = await readBody(event);

    const latestYearRecord = await useDB()
    .select({ year: studentRecords.currentYear })
    .from(studentRecords)
    .orderBy(desc(studentRecords.currentYear))
    .limit(1)
    .then(rows => rows[0])

  const latestYear = latestYearRecord?.year || new Date().getFullYear()
  console.log(`🗓️ Using latest year from database: ${latestYear}`)

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
          const extractedFullName = folderWithStudent.split('_')[0].trim() // Extract name

          console.log(`📄 Found PDF: ${entry.entryName}`)
          console.log(`🔍 Extracted Full Name: ${extractedFullName}`)

          if (!extractedFullName) {
            console.warn(`⚠️ Could not extract a valid student name from: ${entry.entryName}`)
            continue
          }

          // Split the extracted name into parts to match against first name and last name
          const nameParts = extractedFullName.toLowerCase().trim().split(/\s+/)

          // Build search conditions that check both first name and last name fields
          const nameConditions = []

          for (const part of nameParts) {
            if (part.length < 3) continue // Skip very short name parts that might be initials or prefixes

            nameConditions.push(
              // Check if this part is in either first name or last name
              or(
                like(sql`LOWER(
                                ${studentRecords.studentName}
                                )`, `%${part.toLowerCase()}%`),
                like(sql`LOWER(
                                ${studentRecords.studentLastname}
                                )`, `%${part.toLowerCase()}%`)
              )
            )
          }

          if (nameConditions.length === 0) {
            console.warn(`⚠️ No valid name parts to search for in: ${extractedFullName}`)
            continue
          }

          // Query to find a matching student with latest year filter
          const student = await useDB()
            .select({
              id: studentRecords.id,
              currentYear: studentRecords.currentYear,
              studyProgram: studentRecords.studyProgram,
              studentGroup: studentRecords.studentGroup,
              studentName: studentRecords.studentName,
              studentLastname: studentRecords.studentLastname
            })
            .from(studentRecords)
            .where(
              and(
                or(...nameConditions), // Match any name part in either field
                eq(studentRecords.currentYear, latestYear),
                eq(studentRecords.studentGroup, group)
              )
            )
            .limit(1)
            .then(rows => rows[0])

          if (student) {
            console.log(`✅ Matched Student ID: ${student.id} (${student.studentName} ${student.studentLastname})`)

            // Create the path for the document including both first and last name
            const documentPath = `${student.currentYear}/${student.studyProgram}/${student.studentGroup}/${student.studentName} ${student.studentLastname}/`
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
            console.warn(`⚠️ No matching student found for: ${extractedFullName}`)
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
