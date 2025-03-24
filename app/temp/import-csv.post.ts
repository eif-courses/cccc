import { Readable } from 'stream' // Import stream to create a readable stream
import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { z } from 'zod' // Using zod for schema validation
import { parse } from 'fast-csv'
import { AwsClient } from 'aws4fetch'

const studentSchema = z.object({
  studentGroup: z.string().min(1, { message: 'Student group is required' }),
  studentEmail: z.string().email({ message: 'Invalid student email' }),
  studentName: z.string().min(1, { message: 'Student name is required' }),
  studentLastname: z.string().min(1, { message: 'Student last name is required' }),
  studentNumber: z.string().min(1, { message: 'Student number is required' }),
  supervisorEmail: z.string().email({ message: 'Invalid supervisor email' }),
  studyProgram: z.string().min(1, { message: 'Study program is required' }),
  currentYear: z.preprocess(val => Number(val), z.number().int().positive({ message: 'Current year must be a positive integer' })),
  reviewerEmail: z.string().email({ message: 'Invalid reviewer email' }),
  reviewerName: z.string().min(1, { message: 'Reviewer name is required' })
})

export default defineEventHandler(async (event) => {
  // Read uploaded file
  const form = await readMultipartFormData(event)
  const file = form?.find(field => field.name === 'file')?.data

  if (!file) {
    throw createError({ statusCode: 400, message: 'No file uploaded' })
  }

  // Convert Buffer to Text
  const text = file.toString('utf-8')

  // Create a readable stream from the CSV text
  const stream = Readable.from(text)

  const students: any[] = []
  const validationErrors: any[] = []

  // Parse CSV using fast-csv
  await new Promise<void>((resolve, reject) => {
    stream
      .pipe(parse({ headers: true }))
      .on('data', (row) => {
        console.log('Parsed row:', row) // Debugging
        try {
          // Validate and transform data
          const student = studentSchema.parse({
            studentGroup: row.StudentGroup?.trim() || '',
            studentEmail: row.StudentEmail?.trim() || '',
            studentName: row.StudentName?.trim() || '',
            studentLastname: row.StudentLastname?.trim() || '',
            studentNumber: row.StudentNumber?.trim() || '',
            supervisorEmail: row.SupervisorEmail?.trim() || '',
            studyProgram: row.StudyProgram?.trim() || '',
            currentYear: !isNaN(Number(row.CurrentYear)) ? parseInt(row.CurrentYear, 10) : 0, // Parse safely
            reviewerEmail: row.ReviewerEmail?.trim() || '',
            reviewerName: row.ReviewerName?.trim() || ''
          })
          students.push(student) // Push validated student to the array
        }
        catch (error: any) {
          console.error('Validation error for row:', row, error.errors)
          validationErrors.push({ row, errors: error.errors })
        }
      })
      .on('end', () => {
        if (validationErrors.length) {
          console.error('Validation errors:', validationErrors)
          reject(
            createError({
              statusCode: 400,
              message: 'Validation errors occurred',
              details: validationErrors
            })
          )
        }
        else {
          resolve()
        }
      })
      .on('error', (error) => {
        console.error('CSV Parsing Error:', error)
        reject(createError({ statusCode: 400, message: 'CSV parsing failed' }))
      })
  })

  if (!students.length) {
    throw createError({ statusCode: 400, message: 'No valid student records to insert' })
  }

  // Prepare data for insertion
  const formattedStudents = students.map(student => ({
    studentGroup: student.studentGroup,
    studentEmail: student.studentEmail,
    studentName: student.studentName,
    studentLastname: student.studentLastname,
    studentNumber: student.studentNumber,
    supervisorEmail: student.supervisorEmail,
    studyProgram: student.studyProgram,
    currentYear: student.currentYear,
    reviewerEmail: student.reviewerEmail,
    reviewerName: student.reviewerName
  }))

  console.log('Formatted students:', JSON.stringify(formattedStudents, null, 2))

  try {
    const db = useDB()

    for (const student of formattedStudents) {
      await db.insert(tables.studentRecords).values(student)
      console.log(`Inserted student record for ${student.studentEmail} successfully.`)

      const blob = hubBlob()

      const folderPath = `${student.currentYear}/${student.studyProgram}/${student.studentGroup}/${student.studentName} ${student.studentLastname}/dummy.txt`

      try {
        const { accountId, bucketName, ...credentials } = await blob.createCredentials({
          permission: 'object-read-write',
          pathnames: [folderPath]
        })

        console.log(`Generated credentials for ${folderPath}:`, credentials)

        const client = new AwsClient(credentials)
        const endpoint = new URL(
          folderPath,
          `https://${bucketName}.${accountId}.r2.cloudflarestorage.com`
        )

        try {
          const { url } = await client.sign(endpoint, {
            method: 'PUT',
            aws: { signQuery: true }
          })

          const response = await fetch(url, { method: 'PUT' })

          if (!response.ok) {
            console.error(`Error creating folder for ${student.studentName}: ${response.status} ${response.statusText}`)
            throw createError({ statusCode: response.status, message: 'Failed to create folder' })
          }

          console.log(`Folder created for ${student.studentName}`)
        }
        catch (error) {
          console.error(`Error signing URL for folder creation:`, error)
          throw createError({ statusCode: 500, message: 'Failed to sign URL for folder creation' })
        }
      }
      catch (error) {
        console.error(`Error generating credentials for folder creation:`, error)
        throw createError({ statusCode: 500, message: 'Failed to generate credentials for folder creation' })
      }
    }

    return {
      message: 'All student records uploaded successfully!',
      count: formattedStudents.length
    }
  }
  catch (error) {
    console.error('Error inserting student records:', error)
    throw createError({ statusCode: 500, message: 'Failed to insert student records' })
  }
})
