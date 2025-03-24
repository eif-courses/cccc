import { eq, and } from 'drizzle-orm'
import { departmentHeads } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  // Get logger from event context
  const logger = event.context.logger || console

  logger.info('Processing department head check request')

  try {
    const { user } = await requireUserSession(event)

    if (!user) {
      logger.warn('Unauthorized access attempt', {
        endpoint: 'department-head-check'
      })
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    logger.info('User authenticated', {
      email: user.mail
    })

    const db = useDB()

    // Check if the user is a department head
    logger.debug('Checking department head status', {
      email: user.mail
    })

    const deptHeadResult = await db.select()
      .from(departmentHeads)
      .where(
        and(
          eq(departmentHeads.email, user.mail),
          eq(departmentHeads.isActive, 1)
        )
      )
      .execute()

    const isDepartmentHead = deptHeadResult.length > 0

    if (isDepartmentHead) {
      logger.info('User is a department head', {
        email: user.mail,
        department: deptHeadResult[0].department,
        jobTitle: deptHeadResult[0].jobTitle
      })
    }
    else {
      logger.info('User is not a department head', {
        email: user.mail
      })
    }

    // If they are a department head, also return the department information
    const departmentInfo = isDepartmentHead
      ? {
          department: deptHeadResult[0].department,
          jobTitle: deptHeadResult[0].jobTitle
        }
      : null

    return {
      isDepartmentHead,
      departmentInfo
    }
  }
  catch (error) {
    logger.error('Department head check error', {
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
