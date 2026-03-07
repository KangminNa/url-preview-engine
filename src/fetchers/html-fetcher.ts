import type { FetchResult } from '../types/metadata'

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const MAX_HTML_BYTES = 8_000_000

const shouldReadHtml = (contentType: string | undefined): boolean => {
  if (!contentType) {
    return true
  }

  const lowered = contentType.toLowerCase()
  return lowered.includes('text/html') || lowered.includes('application/xhtml+xml')
}

const headersToObject = (headers: Headers): Record<string, string> => {
  const result: Record<string, string> = {}
  headers.forEach((value, key) => {
    result[key.toLowerCase()] = value
  })
  return result
}

const readHtmlWithLimit = async (response: Response): Promise<string> => {
  const reader = response.body?.getReader()
  if (!reader) {
    return response.text()
  }

  const decoder = new TextDecoder()
  let total = 0
  let output = ''

  let completed = false
  while (!completed) {
    const { done, value } = await reader.read()
    if (done) {
      output += decoder.decode()
      completed = true
      return output
    }

    if (!value) {
      continue
    }

    total += value.byteLength
    if (total > MAX_HTML_BYTES) {
      output += decoder.decode(value, { stream: true })
      output += decoder.decode()
      return output
    }

    output += decoder.decode(value, { stream: true })
  }

  return output
}

export interface FetchHtmlOptions {
  userAgent?: string
}

export const fetchHtml = async (
  url: URL,
  options: FetchHtmlOptions = {},
): Promise<FetchResult> => {
  const response = await fetch(url.toString(), {
    redirect: 'follow',
    headers: {
      'user-agent': options.userAgent ?? DEFAULT_USER_AGENT,
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    },
  })

  const resolvedUrl = response.url || url.toString()
  const contentType = response.headers.get('content-type') ?? undefined

  let html: string | undefined
  if (shouldReadHtml(contentType)) {
    html = await readHtmlWithLimit(response)
  }

  return {
    resolvedUrl,
    status: response.status,
    headers: headersToObject(response.headers),
    contentType,
    html,
  }
}
