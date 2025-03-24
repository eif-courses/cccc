import { z } from 'zod'
import { AwsClient } from 'aws4fetch'

export default eventHandler(async (event) => {
  const { pathname } = await getValidatedRouterParams(event, z.object({
    pathname: z.string().min(1)
  }).parse)

  if (!pathname) {
    throw createError({ statusCode: 400, message: 'Pathname is required' })
  }

  const blob = hubBlob()
  const { accountId, bucketName, ...credentials } = await blob.createCredentials({
    permission: 'object-read-only',
    pathnames: [pathname]
  })

  const client = new AwsClient(credentials)

  const encodedPathname = encodeURIComponent(pathname)

  const endpoint = new URL(
    encodedPathname,
    `https://${bucketName}.${accountId}.r2.cloudflarestorage.com`
  )

  const { url } = await client.sign(endpoint, {
    method: 'GET',
    aws: { signQuery: true }
  })

  return { url }
})
