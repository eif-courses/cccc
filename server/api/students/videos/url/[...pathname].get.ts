import { z } from 'zod'
import { AwsClient } from 'aws4fetch'

interface CachedCredentials {
  credentials: {
    accessKeyId: string
    secretAccessKey: string
    sessionToken?: string
  }
  accountId: string
  bucketName: string
  expiresAt: number
}

const credentialsCache: Map<string, CachedCredentials> = new Map()

export default eventHandler(async (event) => {
  // Get logger from event context
  const logger = event.context.logger || console

  logger.info('Processing request for signed URL')

  try {
    const { pathname } = await getValidatedRouterParams(event, z.object({
      pathname: z.string().min(1)
    }).parse)

    const { user } = await requireUserSession(event)
    if (!user) {
      logger.error('Unauthorized access attempt', {
        endpoint: 'signed-url'
      })
      throw createError({ statusCode: 403, message: 'Access denied: User not authenticated' })
    }

    if (!pathname) {
      logger.warn('Missing pathname parameter')
      throw createError({ statusCode: 400, message: 'Pathname is required' })
    }

    logger.info('User authenticated', {
      email: user.mail,
      pathname: pathname
    })

    // Decode pathname in case special characters are causing issues
    const decodedPathname = decodeURIComponent(pathname)
    logger.debug('Decoded pathname', {
      original: pathname,
      decoded: decodedPathname
    })

    const currentTime = Date.now()

    let cached = credentialsCache.get(decodedPathname)
    let cacheStatus = 'miss'

    if (!cached || currentTime >= cached.expiresAt) {
      logger.debug('Cache miss or expired credentials', {
        path: decodedPathname,
        isCached: !!cached,
        expired: cached ? 'yes' : 'n/a',
        timeRemaining: cached ? (cached.expiresAt - currentTime) : 'n/a'
      })

      const blob = hubBlob()
      logger.debug('Requesting new credentials from R2')

      const { accountId, bucketName, ...credentials } = await blob.createCredentials({
        permission: 'object-read-only',
        pathnames: [decodedPathname]
      })

      // Cache the new credentials with an expiration time
      cached = {
        credentials,
        accountId,
        bucketName,
        expiresAt: currentTime + 60 * 60 * 1000 // Assume 1-hour validity
      }

      credentialsCache.set(decodedPathname, cached)
      logger.info('New credentials cached', {
        path: decodedPathname,
        expiresIn: '1 hour',
        cacheSize: credentialsCache.size
      })

      cacheStatus = 'new'
    }
    else {
      logger.debug('Using cached credentials', {
        path: decodedPathname,
        expiresIn: Math.floor((cached.expiresAt - currentTime) / 1000) + ' seconds'
      })

      cacheStatus = 'hit'
    }

    // Use cached credentials
    const client = new AwsClient(cached.credentials)

    // Use the bucketName and accountId from the cached credentials
    const endpoint = new URL(
      `https://${cached.bucketName}.${cached.accountId}.r2.cloudflarestorage.com/${decodedPathname}`
    )

    logger.debug('Generated endpoint', {
      endpoint: endpoint.toString(),
      bucketName: cached.bucketName
    })

    const signedRequest = await client.sign(endpoint, {
      method: 'GET',
      aws: { signQuery: true }
    })

    logger.info('Generated signed URL successfully', {
      path: decodedPathname,
      cacheStatus,
      urlLength: signedRequest.url.length
    })

    return { url: signedRequest.url }
  }
  catch (error) {
    logger.error('Error generating signed URL', {
      error: error.message,
      stack: error.stack
    })

    throw createError({ statusCode: 500, message: 'Internal Server Error' })
  }
})
