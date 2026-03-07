export const normalizeUrl = (input: string): URL => {
  const trimmed = input.trim()

  if (trimmed.length === 0) {
    throw new Error('URL must not be empty')
  }

  const hasProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)
  const candidate = hasProtocol ? trimmed : `https://${trimmed}`

  const url = new URL(candidate)

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Unsupported protocol: ${url.protocol}`)
  }

  url.hash = ''

  return url
}
