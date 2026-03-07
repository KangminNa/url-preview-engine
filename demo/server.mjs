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
const COMPARE_TIMEOUT_MS = 12_000
const COMPARE_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

let metascraperExtractorPromise

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

const normalizeDefault = (module) => {
  return module?.default ?? module
}

const pickFirstImageUrl = (value) => {
  if (!value) {
    return undefined
  }

  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string') {
        return item
      }
      if (item && typeof item.url === 'string') {
        return item.url
      }
    }
    return undefined
  }

  if (typeof value === 'object' && typeof value.url === 'string') {
    return value.url
  }

  return undefined
}

const trimText = (value, maxLength = 300) => {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return undefined
  }

  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength)}...`
    : normalized
}

const withTimer = async (engine, fn) => {
  const startedAt = Date.now()
  try {
    const data = await fn()
    return {
      engine,
      ok: true,
      durationMs: Date.now() - startedAt,
      data,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      engine,
      ok: false,
      durationMs: Date.now() - startedAt,
      error: message,
    }
  }
}

const getMetascraperExtractor = async () => {
  if (!metascraperExtractorPromise) {
    metascraperExtractorPromise = Promise.all([
      import('metascraper'),
      import('metascraper-title'),
      import('metascraper-description'),
      import('metascraper-image'),
      import('metascraper-url'),
      import('metascraper-author'),
      import('metascraper-date'),
    ]).then((modules) => {
      const [
        metascraperMod,
        titleMod,
        descriptionMod,
        imageMod,
        urlMod,
        authorMod,
        dateMod,
      ] = modules

      const metascraper = normalizeDefault(metascraperMod)
      const titleRule = normalizeDefault(titleMod)
      const descriptionRule = normalizeDefault(descriptionMod)
      const imageRule = normalizeDefault(imageMod)
      const urlRule = normalizeDefault(urlMod)
      const authorRule = normalizeDefault(authorMod)
      const dateRule = normalizeDefault(dateMod)

      return metascraper([
        titleRule(),
        descriptionRule(),
        imageRule(),
        urlRule(),
        authorRule(),
        dateRule(),
      ])
    })
  }

  return metascraperExtractorPromise
}

const runMetascraperComparison = async (url) => {
  const extractor = await getMetascraperExtractor()
  const response = await fetch(url, {
    headers: {
      'user-agent': COMPARE_USER_AGENT,
    },
  })
  const html = await response.text()
  const resolvedUrl = response.url || url
  const metadata = await extractor({
    html,
    url: resolvedUrl,
  })

  return {
    resolvedUrl,
    title: trimText(metadata.title),
    description: trimText(metadata.description),
    imageUrl: metadata.image || undefined,
    siteName: trimText(metadata.publisher),
    author: trimText(metadata.author),
    publishedAt: trimText(metadata.date),
  }
}

const runOpenGraphScraperComparison = async (url) => {
  const module = await import('open-graph-scraper')
  const ogs = normalizeDefault(module)
  const result = await ogs({
    url,
    timeout: COMPARE_TIMEOUT_MS,
    fetchOptions: {
      headers: {
        'user-agent': COMPARE_USER_AGENT,
      },
    },
  })

  if (!result?.result) {
    throw new Error('open-graph-scraper returned no result')
  }

  const og = result.result
  return {
    resolvedUrl: trimText(og.requestUrl ?? og.ogUrl ?? og.url),
    title: trimText(og.ogTitle ?? og.twitterTitle ?? og.title),
    description: trimText(og.ogDescription ?? og.twitterDescription),
    imageUrl: pickFirstImageUrl(og.ogImage ?? og.twitterImage),
    siteName: trimText(og.ogSiteName),
    author: trimText(og.author),
    publishedAt: trimText(og.articlePublishedTime),
    mediaType: trimText(og.ogType),
  }
}

const runLinkPreviewComparison = async (url) => {
  const module = await import('link-preview-js')
  const getLinkPreview =
    module?.getLinkPreview ?? module?.default?.getLinkPreview

  if (typeof getLinkPreview !== 'function') {
    throw new Error('link-preview-js getLinkPreview not available')
  }

  const result = await getLinkPreview(url, {
    timeout: COMPARE_TIMEOUT_MS,
    headers: {
      'user-agent': COMPARE_USER_AGENT,
    },
  })

  const images =
    Array.isArray(result?.images) && result.images.length > 0
      ? result.images
      : undefined

  return {
    resolvedUrl: trimText(result?.url ?? result?.canonical),
    title: trimText(result?.title),
    description: trimText(result?.description),
    imageUrl: images?.[0],
    siteName: trimText(result?.siteName),
    mediaType: trimText(result?.mediaType),
    contentType: trimText(result?.contentType),
  }
}

const buildComparePayload = async (url) => {
  const comparisons = await Promise.all([
    withTimer('metascraper', () => runMetascraperComparison(url)),
    withTimer('open-graph-scraper', () => runOpenGraphScraperComparison(url)),
    withTimer('link-preview-js', () => runLinkPreviewComparison(url)),
  ])

  return { comparisons }
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

  if (req.method === 'GET' && requestUrl.pathname === '/api/compare') {
    const input = requestUrl.searchParams.get('url')
    if (!input) {
      sendJson(res, 400, { error: 'Query parameter "url" is required.' })
      return
    }

    try {
      const payload = await buildComparePayload(input)
      sendJson(res, 200, payload)
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
