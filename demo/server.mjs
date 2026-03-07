import { createReadStream, existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

import { preview } from '../dist/index.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = __filename.slice(0, __filename.lastIndexOf('/'))
const publicDir = join(__dirname, 'public')
const requestedPort = Number(process.env.PORT ?? '4173')
const maxPortAttempts = 20

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
}

const sendJson = (res, statusCode, payload) => {
  res.statusCode = statusCode
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

const serveFile = async (res, filePath) => {
  try {
    const fileStat = await stat(filePath)
    if (!fileStat.isFile()) {
      res.statusCode = 404
      res.end('Not Found')
      return
    }

    const ext = extname(filePath).toLowerCase()
    res.statusCode = 200
    res.setHeader(
      'content-type',
      contentTypes[ext] ?? 'application/octet-stream',
    )

    const stream = createReadStream(filePath)
    stream.pipe(res)
  } catch {
    res.statusCode = 404
    res.end('Not Found')
  }
}

const server = createServer(async (req, res) => {
  if (!req.url) {
    res.statusCode = 400
    res.end('Bad Request')
    return
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`)

  if (req.method === 'GET' && requestUrl.pathname === '/api/preview') {
    const input = requestUrl.searchParams.get('url')
    if (!input) {
      sendJson(res, 400, { error: 'Query parameter "url" is required.' })
      return
    }

    try {
      const card = await preview(input, {
        dynamicFallback: true,
      })
      sendJson(res, 200, { card })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      sendJson(res, 500, { error: message })
    }

    return
  }

  if (req.method !== 'GET') {
    res.statusCode = 405
    res.end('Method Not Allowed')
    return
  }

  const requestedPath = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname
  const normalizedPath = normalize(requestedPath).replace(/^\.+/, '')
  const filePath = join(publicDir, normalizedPath)

  if (!filePath.startsWith(publicDir)) {
    res.statusCode = 403
    res.end('Forbidden')
    return
  }

  await serveFile(res, filePath)
})

if (!existsSync(join(publicDir, 'index.html'))) {
  throw new Error('demo/public/index.html not found')
}

const startServer = (port, attemptsLeft) => {
  const handleError = (error) => {
    server.removeListener('listening', handleListening)
    if (error?.code === 'EADDRINUSE' && attemptsLeft > 1) {
      const nextPort = port + 1
      console.warn(
        `Port ${port} is already in use. Retrying on http://localhost:${nextPort}`,
      )
      startServer(nextPort, attemptsLeft - 1)
      return
    }

    throw error
  }

  const handleListening = () => {
    server.removeListener('error', handleError)
    const address = server.address()
    const activePort =
      address && typeof address === 'object' ? address.port : port
    console.log(`Demo server running at http://localhost:${activePort}`)
  }

  server.once('error', handleError)
  server.once('listening', handleListening)
  server.listen(port)
}

startServer(requestedPort, maxPortAttempts)
