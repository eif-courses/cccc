import { clearUserSession } from '#imports'

export default defineEventHandler(async (event) => {
  // Get logger from event context
  const logger = event.context.logger || console

  // Get user information before clearing session (if available)
  const sessionData = event.context.session || {}
  const user = sessionData.data?.user

  // Log the logout attempt with user information if available
  if (user) {
    logger.info('User logout requested', {
      email: user.mail,
      userId: user.id
    })
  }
  else {
    logger.info('Logout requested (no active session)')
  }

  try {
    // Clear the user session
    logger.debug('Clearing user session')
    await clearUserSession(event)

    logger.info('Logout completed successfully', {
      userEmail: user?.mail
    })

    // Return success response
    return {
      success: true,
      message: 'Logout successful'
    }
  }
  catch (error) {
    logger.error('Error during logout', {
      error: error.message,
      stack: error.stack
    })

    throw error // Re-throw to maintain original error handling
  }
})
