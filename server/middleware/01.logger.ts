export default defineEventHandler((event) => {
  // Create a unique ID for this request
  const requestId = event.node?.req?.headers?.get('cf-ray') || crypto.randomUUID()

  // Create logger functions with structured output
  const logger = {
    error: (message, data = {}) => {
      console.error(JSON.stringify({
        level: 'ERROR',
        timestamp: new Date().toISOString(),
        requestId,
        message,
        ...data
      }))
    },
    warn: (message, data = {}) => {
      console.warn(JSON.stringify({
        level: 'WARN',
        timestamp: new Date().toISOString(),
        requestId,
        message,
        ...data
      }))
    },
    info: (message, data = {}) => {
      console.log(JSON.stringify({
        level: 'INFO',
        timestamp: new Date().toISOString(),
        requestId,
        message,
        ...data
      }))
    },
    debug: (message, data = {}) => {
      // Only log debug in non-production environments
      if (!process.env.PROD) {
        console.log(JSON.stringify({
          level: 'DEBUG',
          timestamp: new Date().toISOString(),
          requestId,
          message,
          ...data
        }))
      }
    }
  }

  // Add logger to event context
  event.context.logger = logger
  event.context.requestId = requestId

  // Log basic request info
  const method = event.node.req.method
  const url = event.node.req.url

  logger.info('Request received', {
    method,
    url
  })
})
