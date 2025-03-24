import { sql } from 'drizzle-orm'
import { studentRecords } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  // Get logger from event context
  const logger = event.context.logger || console

  logger.info('Processing request for academic years')

  try {
    const { user } = await requireUserSession(event)

    if (!user) {
      logger.error('Unauthorized access attempt', {
        endpoint: 'academic-years'
      })
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    logger.info('User authenticated', { email: user.mail })

    const db = useDB()
    logger.debug('Executing database query for academic years')

    // Query to get distinct years, ordered from newest to oldest
    const yearsResult = await db
      .select({
        year: studentRecords.currentYear
      })
      .from(studentRecords)
      .groupBy(studentRecords.currentYear)
      .orderBy(sql`${studentRecords.currentYear} DESC`)
      .execute()

    // Extract just the years into an array
    const years = yearsResult.map(row => row.year)

    logger.info('Retrieved academic years', {
      count: years.length,
      years: years
    })

    return {
      years,
      total: years.length
    }
  }
  catch (error) {
    logger.error('Error retrieving academic years', {
      error: error.message,
      stack: error.stack
    })

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { message: error.message }
    })
  }
})
