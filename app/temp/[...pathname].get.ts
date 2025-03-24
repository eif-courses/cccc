import { z } from 'zod'
import { AwsClient } from 'aws4fetch'

export default eventHandler(async (event) => {
  const { pathname } = await getValidatedRouterParams(event, z.object({
    pathname: z.string().min(1)
  }).parse)
  // Create credentials with the right permission & scope

  const decodedPathname = decodeURIComponent(pathname)

  const blob = hubBlob()
  const { accountId, bucketName, ...credentials } = await blob.createCredentials({
    permission: 'object-read-write',
    pathnames: [decodedPathname]
  })
  // Create the presigned URL
  const client = new AwsClient(credentials)
  const endpoint = new URL(
    decodedPathname,
    `https://${bucketName}.${accountId}.r2.cloudflarestorage.com`
  )
  const { url } = await client.sign(endpoint, {
    method: 'PUT',
    aws: { signQuery: true }
  })
  // Return the presigned URL to the client
  return { url }
})
