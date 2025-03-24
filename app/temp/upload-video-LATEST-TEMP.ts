// In your Nuxt 3 API route (e.g., server/api/upload-video.js)
export default defineEventHandler(async (event) => {
  const apiToken = process.env.CLOUDFLARE_STREAM_TOKEN
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID

  // Get the uploaded file from request
  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'No file uploaded' })
  }

  const file = formData.find(field => field.name === 'file')
  if (!file) {
    throw createError({ statusCode: 400, message: 'File is required' })
  }

  // Prepare FormData for Cloudflare API
  const body = new FormData()
  // Ensure the file data is in the right format
  if (file.data instanceof Blob) {
    body.append('file', file.data, file.filename)
  }
  else {
    // Fallback to creating a Blob if needed
    body.append('file', new Blob([file.data]), file.filename)
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`
        },
        body
      }
    )

    const result = await response.json()
    if (!response.ok) {
      // Log the error for debugging
      console.error('Upload error:', result)
      throw createError({
        statusCode: response.status,
        message: result.errors ? result.errors[0].message : 'Upload failed'
      })
    }

    // Validate that the result contains the expected data
    if (result.result && result.result.uid) {
      // Return the successful response with relevant video data
      return {
        success: true,
        data: {
          uid: result.result.uid,
          thumbnail: result.result.thumbnail || null,
          preview: result.result.preview || null,
          playback: result.result.playback || null,
          created: result.result.created || null
        }
      }
    }
    else {
      throw createError({ statusCode: 500, message: 'Invalid response from Cloudflare' })
    }
  }
  catch (error) {
    console.error('Internal server error:', error) // Log the error details
    throw createError({ statusCode: 500, message: error.message || 'Internal server error' })
  }
})
