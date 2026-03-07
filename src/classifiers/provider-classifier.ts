import type { Provider } from '../types/classification'

const normalizeHost = (host: string): string => {
  return host
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/^m\./, '')
}

const isIpv4 = (host: string): boolean => {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
}

const isIpv6 = (host: string): boolean => {
  return host.includes(':')
}

const getDomainLabel = (host: string): string | undefined => {
  if (!host) {
    return undefined
  }

  const normalized = normalizeHost(host)
  if (!normalized) {
    return undefined
  }

  if (isIpv4(normalized) || isIpv6(normalized)) {
    return normalized
  }

  const tokens = normalized.split('.').filter(Boolean)
  if (tokens.length === 0) {
    return undefined
  }

  if (tokens.length === 1) {
    return tokens[0]
  }

  const tld = tokens[tokens.length - 1] ?? ''
  const secondLevel = tokens[tokens.length - 2] ?? ''
  if (tld.length === 2 && secondLevel.length <= 3 && tokens.length >= 3) {
    return tokens[tokens.length - 3]
  }

  return secondLevel
}

export const classifyProvider = (url: URL): Provider => {
  const label = getDomainLabel(url.hostname)
  return label ?? 'unknown'
}
