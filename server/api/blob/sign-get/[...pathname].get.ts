import { z } from 'zod'
import { AwsClient } from 'aws4fetch'
import { createError } from 'h3'

export default eventHandler(async (event) => {
  // Get logger from event context
  const logger = event.context.logger || console

  logger.info('Processing stream URL request')

  try {
    const { pathname } = await getValidatedRouterParams(event, z.object({
      pathname: z.string().min(1)
    }).parse)

    logger.debug('Path parameter validated', { pathname })

    const { user } = await requireUserSession(event)
    if (!user) {
      logger.warn('Unauthorized access attempt', {
        endpoint: 'stream-url',
        pathname
      })
      throw createError({ statusCode: 403, message: 'Access denied: User not authenticated' })
    }

    logger.info('User authenticated', {
      email: user.mail,
      pathname
    })

    const decodedPathname = decodeURIComponent(pathname)
    logger.debug('Decoded pathname', {
      original: pathname,
      decoded: decodedPathname
    })

    logger.debug('Requesting R2 credentials for stream')
    const blob = hubBlob()
    const { accountId, bucketName, ...credentials } = await blob.createCredentials({
      permission: 'object-read-only', // ✅ Allow only GET requests
      pathnames: [decodedPathname]
    })

    logger.debug('R2 credentials obtained', {
      bucketName,
      path: decodedPathname
    })

    const client = new AwsClient(credentials)
    const endpoint = new URL(
      decodedPathname,
      `https://${bucketName}.${accountId}.r2.cloudflarestorage.com`
    )

    logger.debug('Constructed R2 endpoint', {
      endpoint: endpoint.toString()
    })

    logger.debug('Generating presigned stream URL')
    const { url } = await client.sign(endpoint, {
      method: 'GET',
      aws: { signQuery: true }
    })

    logger.info('Stream URL generated successfully', {
      path: decodedPathname,
      urlLength: url.length
    })

    return { url } // ✅ Return presigned GET URL for Cloudflare Stream
  }
  catch (error) {
    logger.error('Error generating stream URL', {
      error: error.message,
      stack: error.stack
    })

    // Re-throw the error to maintain the original behavior
    throw error
  }
})
