import { Readable } from 'stream'
import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { z } from 'zod'
import { parse } from 'fast-csv'
import { AwsClient } from 'aws4fetch'
import { eq, and } from 'drizzle-orm'

// Define CSV header mapping
const CSV_HEADER_MAPPING = {
  'StudentGroup': 'studentGroup',
  'Student Group': 'studentGroup',
  'FinalProjectTitle': 'finalProjectTitle',
  'Final Project Title': 'finalProjectTitle',
  'StudentEmail': 'studentEmail',
  'Student Email': 'studentEmail',
  'StudentName': 'studentName',
  'Student Name': 'studentName',
  'StudentLastname': 'studentLastname',
  'Student Lastname': 'studentLastname',
  'Student Last Name': 'studentLastname',
  'StudentNumber': 'studentNumber',
  'Student Number': 'studentNumber',
  'SupervisorEmail': 'supervisorEmail',
  'Supervisor Email': 'supervisorEmail',
  'StudyProgram': 'studyProgram',
  'Study Program': 'studyProgram',
  'Department': 'department',
  'ProgramCode': 'programCode',
  'Program Code': 'programCode',
  'CurrentYear': 'currentYear',
  'Current Year': 'currentYear',
  'ReviewerEmail': 'reviewerEmail',
  'Reviewer Email': 'reviewerEmail',
  'ReviewerName': 'reviewerName',
  'Reviewer Name': 'reviewerName'
}

// Student schema with optional reviewer fields
const studentSchema = z.object({
  studentGroup: z.string().min(1, { message: 'Student group is required' }),
  finalProjectTitle: z.union([
    z.string().min(1, { message: 'Final Project Title' }),
    z.string().length(0) // Allow empty string
  ]),
  studentEmail: z.string().email({ message: 'Invalid student email' }),
  studentName: z.string().min(1, { message: 'Student name is required' }),
  studentLastname: z.string().min(1, { message: 'Student last name is required' }),
  studentNumber: z.string().min(1, { message: 'Student number is required' }),
  supervisorEmail: z.string().email({ message: 'Invalid supervisor email' }),
  studyProgram: z.string().min(1, { message: 'Study program is required' }),
  department: z.string().min(1, { message: 'Department is required' }),
  programCode: z.string().min(1, { message: 'Program Code is required' }),
  currentYear: z.preprocess(
    val => Number(val),
    z.number().int().positive({ message: 'Current year must be a positive integer' })
  ),
  // Make reviewer fields optional
  reviewerEmail: z.union([
    z.string().email({ message: 'Invalid reviewer email' }),
    z.string().length(0), // Allow empty string
    z.undefined()
  ]),
  reviewerName: z.union([
    z.string().min(1, { message: 'Reviewer name is required (if provided)' }),
    z.string().length(0), // Allow empty string
    z.undefined()
  ])
})

// Type for validated student
type Student = z.infer<typeof studentSchema>

// Define maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// Function to check if folder exists in cloud storage
async function checkFolderExists(folderPath: string, blob: any, logger: any) {
  logger.debug('Checking if folder exists', { folderPath })

  try {
    const { accountId, bucketName, ...credentials } = await blob.createCredentials({
      permission: 'object-read',
      pathnames: [folderPath]
    })

    const client = new AwsClient(credentials)
    const endpoint = new URL(
      folderPath,
      `https://${bucketName}.${accountId}.r2.cloudflarestorage.com`
    )

    const { url } = await client.sign(endpoint, {
      method: 'HEAD',
      aws: { signQuery: true }
    })

    const response = await fetch(url, { method: 'HEAD' })

    logger.debug('Folder existence check result', {
      folderPath,
      exists: response.ok
    })

    return response.ok
  }
  catch (error) {
    logger.debug('Error checking folder existence, assuming it does not exist', {
      folderPath,
      error: error.message
    })
    // If error occurs, assume folder doesn't exist
    return false
  }
}

// Function to create student folders in cloud storage if they don't exist
async function createStudentFolder(student: Student, blob: any, logger: any) {
  const folderPath = `${student.currentYear}/${student.department}/${student.studyProgram}/${student.studentGroup}/${student.studentName} ${student.studentLastname}/dummy.txt`

  logger.debug('Creating student folder if needed', {
    student: student.studentEmail,
    folderPath
  })

  // Check if folder already exists
  const exists = await checkFolderExists(folderPath, blob, logger)
  if (exists) {
    logger.debug('Student folder already exists', {
      student: student.studentEmail,
      folderPath
    })
    return { folderPath, created: false }
  }

  try {
    logger.debug('Creating new student folder', {
      student: student.studentEmail,
      folderPath
    })

    const { accountId, bucketName, ...credentials } = await blob.createCredentials({
      permission: 'object-read-write',
      pathnames: [folderPath]
    })

    const client = new AwsClient(credentials)
    const endpoint = new URL(
      folderPath,
      `https://${bucketName}.${accountId}.r2.cloudflarestorage.com`
    )

    const { url } = await client.sign(endpoint, {
      method: 'PUT',
      aws: { signQuery: true }
    })

    const response = await fetch(url, { method: 'PUT' })

    if (!response.ok) {
      logger.error('Failed to create student folder', {
        student: student.studentEmail,
        folderPath,
        status: response.status,
        statusText: response.statusText
      })
      throw new Error(`Failed to create folder: ${response.status} ${response.statusText}`)
    }

    logger.info('Student folder created successfully', {
      student: student.studentEmail,
      folderPath
    })

    return { folderPath, created: true }
  }
  catch (error) {
    logger.error('Error creating student folder', {
      student: student.studentEmail,
      folderPath,
      error: error.message
    })
    throw error
  }
}

// Map CSV row to our expected structure
function mapCsvRowToStudent(row: Record<string, string>, logger: any) {
  const mappedRow: Record<string, string> = {}

  // Map headers according to our mapping
  for (const [csvHeader, fieldName] of Object.entries(CSV_HEADER_MAPPING)) {
    if (row[csvHeader] !== undefined) {
      mappedRow[fieldName] = row[csvHeader]?.trim() || ''
    }
  }

  // Log headers that didn't match our mapping
  const unmappedHeaders = Object.keys(row).filter(header =>
    !Object.keys(CSV_HEADER_MAPPING).includes(header)
  )

  if (unmappedHeaders.length > 0) {
    logger.debug('Unmapped headers in CSV row', { unmappedHeaders })
  }

  // Ensure all fields exist
  return {
    studentGroup: mappedRow.studentGroup || '',
    finalProjectTitle: mappedRow.finalProjectTitle || '',
    studentEmail: mappedRow.studentEmail || '',
    studentName: mappedRow.studentName || '',
    studentLastname: mappedRow.studentLastname || '',
    studentNumber: mappedRow.studentNumber || '',
    supervisorEmail: mappedRow.supervisorEmail || '',
    studyProgram: mappedRow.studyProgram || '',
    department: mappedRow.department || '',
    programCode: mappedRow.programCode || '',
    currentYear: !isNaN(Number(mappedRow.currentYear))
      ? parseInt(mappedRow.currentYear, 10)
      : 0,
    reviewerEmail: mappedRow.reviewerEmail || '',
    reviewerName: mappedRow.reviewerName || ''
  }
}

export default defineEventHandler(async (event) => {
  // Get logger from event context
  const logger = event.context.logger || console

  logger.info('Processing CSV student records upload')

  const { user } = await requireUserSession(event)
  if (!user) {
    logger.warn('Unauthorized access attempt', {
      endpoint: 'csv-upload'
    })
    throw createError({ statusCode: 403, message: 'Access denied: User not authenticated' })
  }

  logger.info('User authenticated', {
    email: user.mail
  })

  try {
    // Read uploaded file
    logger.debug('Reading uploaded file')
    const form = await readMultipartFormData(event)
    const file = form?.find(field => field.name === 'file')

    if (!file || !file.data) {
      logger.warn('No file uploaded')
      throw createError({ statusCode: 400, message: 'No file uploaded' })
    }

    // Check file size
    const fileSize = file.data.length
    logger.debug('File received', {
      filename: file.filename,
      size: fileSize,
      type: file.type
    })

    if (fileSize > MAX_FILE_SIZE) {
      logger.warn('File size exceeds maximum limit', {
        size: fileSize,
        maxSize: MAX_FILE_SIZE
      })
      throw createError({
        statusCode: 400,
        message: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      })
    }

    // Check MIME type
    const mimeType = file.type?.toLowerCase() || ''
    if (!['text/csv', 'application/vnd.ms-excel', 'application/csv'].includes(mimeType)) {
      logger.warn('Invalid file type', {
        type: mimeType
      })
      throw createError({
        statusCode: 400,
        message: 'Invalid file type. Only CSV files are accepted.'
      })
    }

    // Convert Buffer to Text
    const text = file.data.toString('utf-8')

    // Create a readable stream from the CSV text
    const stream = Readable.from(text)
    logger.debug('Starting CSV parsing')

    const students: Student[] = []
    const validationErrors: any[] = []

    // Parse CSV using fast-csv
    await new Promise<void>((resolve) => {
      stream
        .pipe(parse({ headers: true }))
        .on('data', (row) => {
          try {
            // Skip empty rows
            const isEmpty = Object.values(row).every(val => !val || val.trim() === '')
            if (isEmpty) {
              return
            }

            // Map and validate data
            const mappedStudent = mapCsvRowToStudent(row, logger)

            // Ensure both year and student number are present (minimum keys for identifying a record)
            if (!mappedStudent.studentNumber || !mappedStudent.currentYear) {
              logger.warn('Missing required fields in CSV row', {
                studentNumber: mappedStudent.studentNumber || 'missing',
                currentYear: mappedStudent.currentYear || 'missing'
              })

              validationErrors.push({
                row,
                errors: [{ message: 'Student Number and Current Year are required for all records' }]
              })
              return
            }

            const validationResult = studentSchema.safeParse(mappedStudent)

            if (validationResult.success) {
              students.push(validationResult.data)
              logger.debug('Validated student record', {
                studentNumber: validationResult.data.studentNumber,
                studentEmail: validationResult.data.studentEmail
              })
            }
            else {
              // Log detailed validation errors
              logger.warn('Validation failed for student record', {
                studentNumber: mappedStudent.studentNumber,
                errors: validationResult.error.errors.map(e => ({
                  path: e.path.join('.'),
                  message: e.message
                }))
              })

              validationErrors.push({
                row,
                errors: validationResult.error.errors
              })
            }
          }
          catch (error: any) {
            logger.error('Error processing CSV row', {
              row: JSON.stringify(row),
              error: error.message
            })

            validationErrors.push({
              row,
              errors: [{ message: error.message || 'Unknown error' }]
            })
          }
        })
        .on('end', () => {
          logger.info('CSV parsing completed', {
            totalRows: students.length + validationErrors.length,
            validRows: students.length,
            invalidRows: validationErrors.length
          })
          resolve()
        })
        .on('error', (error) => {
          logger.error('CSV parsing error', {
            error: error.message
          })

          validationErrors.push({
            general: true,
            errors: [{ message: 'CSV parsing failed: ' + error.message }]
          })
          resolve()
        })
    })

    // Log validation errors but don't fail the entire import
    if (validationErrors.length > 0) {
      logger.warn('CSV validation completed with errors', {
        errorCount: validationErrors.length,
        sampleErrors: validationErrors.slice(0, 3).map(ve =>
          ve.errors ? ve.errors.map(e => e.message).join('; ') : 'Unknown error'
        )
      })

      // If ALL rows failed validation, then fail the import
      if (validationErrors.length > 0 && students.length === 0) {
        logger.error('All records failed validation', {
          errorCount: validationErrors.length
        })

        throw createError({
          statusCode: 400,
          message: 'All records failed validation',
          data: validationErrors
        })
      }
    }

    if (!students.length) {
      logger.error('No valid student records to insert')
      throw createError({ statusCode: 400, message: 'No valid student records to insert' })
    }

    // Database and storage operations
    const db = useDB()
    const blob = hubBlob()

    // Statistics tracking
    const stats = {
      inserted: 0,
      updated: 0,
      foldersCreated: 0,
      foldersExisted: 0,
      errors: 0
    }

    // Process records in batches
    const batchSize = 10
    const results = []

    logger.info('Starting database operations', {
      totalRecords: students.length,
      batchSize,
      batchCount: Math.ceil(students.length / batchSize)
    })

    for (let i = 0; i < students.length; i += batchSize) {
      const batch = students.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1

      logger.debug('Processing batch', {
        batchNumber,
        batchSize: batch.length,
        startIndex: i
      })

      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(async (student) => {
          try {
            logger.debug('Processing student record', {
              studentNumber: student.studentNumber,
              studentEmail: student.studentEmail,
              currentYear: student.currentYear
            })

            // Check if record already exists (by student number and year)
            const existingRecords = await db
              .select()
              .from(tables.studentRecords)
              .where(
                and(
                  eq(tables.studentRecords.studentNumber, student.studentNumber),
                  eq(tables.studentRecords.currentYear, student.currentYear)
                )
              )
              .limit(1) // Only need one record to confirm existence

            if (existingRecords.length > 0) {
              // Record exists - update it
              logger.debug('Existing student record found, updating', {
                studentNumber: student.studentNumber,
                studentEmail: student.studentEmail,
                currentYear: student.currentYear,
                recordId: existingRecords[0].id
              })

              // Get existing record to preserve any fields not in the CSV
              const existingRecord = existingRecords[0]

              // Create update object with only the fields that need to be updated
              const updateData: any = {}

              // Always update these fields if they exist in the CSV
              if (student.studentGroup) updateData.studentGroup = student.studentGroup
              if (student.finalProjectTitle) updateData.finalProjectTitle = student.finalProjectTitle
              if (student.studentEmail) updateData.studentEmail = student.studentEmail
              if (student.studentName) updateData.studentName = student.studentName
              if (student.studentLastname) updateData.studentLastname = student.studentLastname
              if (student.supervisorEmail) updateData.supervisorEmail = student.supervisorEmail
              if (student.studyProgram) updateData.studyProgram = student.studyProgram
              if (student.department) updateData.department = student.department
              if (student.programCode) updateData.programCode = student.programCode

              // For reviewer fields, we only update if they are non-empty in the CSV
              // This preserves existing reviewer data if the CSV has empty fields
              if (student.reviewerEmail && student.reviewerEmail.trim() !== '') {
                updateData.reviewerEmail = student.reviewerEmail
              }

              if (student.reviewerName && student.reviewerName.trim() !== '') {
                updateData.reviewerName = student.reviewerName
              }

              // Only update if we have fields to update
              if (Object.keys(updateData).length > 0) {
                logger.debug('Updating student record', {
                  studentNumber: student.studentNumber,
                  fields: Object.keys(updateData)
                })

                await db.update(tables.studentRecords)
                  .set(updateData)
                  .where(
                    and(
                      eq(tables.studentRecords.studentNumber, student.studentNumber),
                      eq(tables.studentRecords.currentYear, student.currentYear)
                    )
                  )
              }
              else {
                logger.debug('No fields to update for student', {
                  studentNumber: student.studentNumber
                })
              }

              stats.updated++
            }
            else {
              // Insert new record
              logger.debug('Inserting new student record', {
                studentNumber: student.studentNumber,
                studentEmail: student.studentEmail,
                currentYear: student.currentYear
              })

              await db.insert(tables.studentRecords).values(student)
              stats.inserted++
            }

            // Create folder structure if needed
            const { folderPath, created } = await createStudentFolder(student, blob, logger)

            if (created) {
              stats.foldersCreated++
            }
            else {
              stats.foldersExisted++
            }

            return {
              student: student.studentEmail,
              success: true,
              folderPath,
              folderCreated: created
            }
          }
          catch (error) {
            logger.error('Error processing student record', {
              studentNumber: student.studentNumber,
              studentEmail: student.studentEmail,
              error: error.message,
              stack: error.stack
            })

            stats.errors++
            throw error
          }
        })
      )

      results.push(...batchResults)

      logger.info('Batch processing completed', {
        batchNumber,
        successful: batchResults.filter(r => r.status === 'fulfilled').length,
        failed: batchResults.filter(r => r.status === 'rejected').length
      })
    }

    // Count failures
    const failures = results.filter(r => r.status === 'rejected')

    // If any operations failed, log the errors
    if (failures.length > 0) {
      logger.warn('Some operations failed during processing', {
        failureCount: failures.length,
        sampleErrors: failures.slice(0, 3).map(f =>
          ((f as PromiseRejectedResult).reason?.message || 'Unknown error')
        )
      })
    }

    logger.info('CSV import completed successfully', {
      totalRecords: students.length,
      inserted: stats.inserted,
      updated: stats.updated,
      foldersCreated: stats.foldersCreated,
      errors: stats.errors
    })

    return {
      message: `Processed ${students.length} student records.`,
      stats: {
        ...stats,
        total: students.length,
        failureCount: failures.length
      }
    }
  }
  catch (error: any) {
    logger.error('CSV import failed', {
      error: error.message,
      statusCode: error.statusCode || 500,
      stack: error.stack
    })

    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'An error occurred processing the upload',
      data: error.data
    })
  }
})
