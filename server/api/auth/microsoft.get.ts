// import { like, eq } from 'drizzle-orm'
// import { users, studentRecords } from '~~/server/database/schema'
//
// function normalizeNameForDB(name: string) {
//   return name.trim().toLowerCase().replace(/[-\s]+/g, '%') // Normalize by replacing spaces/hyphens with '%'
// }
//
// // Function to get student record ID by normalized student name
// async function getStudentRecordIdByStudentName(studentName: string) {
//   const normalizedStudentName = normalizeNameForDB(studentName)
//
//   const studentRecord = await useDB()
//     .select()
//     .from(studentRecords)
//     .where(like(studentRecords.studentName, `%${normalizedStudentName}%`)) // Use LIKE for flexible matching
//     .limit(1)
//     .execute()
//
//   return studentRecord.length > 0 ? studentRecord[0].id : null
// }

export default defineOAuthMicrosoftEventHandler({
  async onSuccess(event, { user }) {
    // Get logger from event context
    const logger = event.context.logger || console

    logger.info('Microsoft OAuth success callback', {
      userId: user.id,
      email: user.mail
    })

    try {
      // Get student record ID using the normalized name comparison
      // const studentRecordId = await getStudentRecordIdByStudentName(user.displayName)
      //
      // if (!studentRecordId) {
      //   logger.warn('No matching student record found', {
      //     displayName: user.displayName,
      //     email: user.mail
      //   });
      //   throw createError({ statusCode: 400, statusMessage: 'No matching student record found' })
      // }
      //
      // logger.info('Found matching student record', {
      //   studentRecordId,
      //   displayName: user.displayName,
      //   email: user.mail
      // });
      //
      // // Check if the user already exists in the users table
      // const existingUser = await useDB().query.users.findFirst({
      //   where: eq(users.uid, user.id)
      // })
      //
      // if (!existingUser) {
      //   logger.info('Creating new user record', {
      //     userId: user.id,
      //     email: user.mail,
      //     studentRecordId
      //   });
      //
      //   // Insert new user linked to student record
      //   await useDB().insert(users).values({
      //     studentName: user.displayName,
      //     uid: user.id,
      //     email: user.mail,
      //     studentRecordId: studentRecordId
      //   })
      // } else {
      //   logger.debug('User already exists in database', {
      //     userId: user.id,
      //     email: user.mail
      //   });
      // }

      // Set user session
      logger.debug('Setting user session')
      await setUserSession(event, { user })

      logger.info('OAuth authentication completed successfully', {
        userId: user.id,
        email: user.mail,
        redirectTo: '/'
      })

      // Redirect to dashboard or another page
      return sendRedirect(event, '/')
    }
    catch (error) {
      logger.error('OAuth authentication error', {
        userId: user.id,
        email: user.mail,
        error: error.message,
        stack: error.stack
      })

      throw error // Re-throw to maintain original error handling
    }
  }
})
