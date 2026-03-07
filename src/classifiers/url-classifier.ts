const IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'avif',
  'svg',
  'bmp',
  'ico',
])

const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'm4v', 'ogv'])
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'])

export type UrlShape =
  | 'direct-image'
  | 'direct-video'
  | 'direct-audio'
  | 'root'
  | 'path-document'
  | 'unknown'

const getExtension = (pathname: string): string | undefined => {
  const lastSegment = pathname.split('/').filter(Boolean).pop()
  if (!lastSegment || !lastSegment.includes('.')) {
    return undefined
  }

  return lastSegment.split('.').pop()?.toLowerCase()
}

const isDirectByExtension = (
  pathname: string,
  extensions: Set<string>,
): boolean => {
  const ext = getExtension(pathname)
  if (!ext) {
    return false
  }

  return extensions.has(ext)
}

export const classifyUrlShape = (url: URL): UrlShape => {
  const pathname = url.pathname

  if (isDirectByExtension(pathname, IMAGE_EXTENSIONS)) {
    return 'direct-image'
  }

  if (isDirectByExtension(pathname, VIDEO_EXTENSIONS)) {
    return 'direct-video'
  }

  if (isDirectByExtension(pathname, AUDIO_EXTENSIONS)) {
    return 'direct-audio'
  }

  if (pathname === '/' || pathname === '') {
    return 'root'
  }

  if (pathname.split('/').filter(Boolean).length >= 2) {
    return 'path-document'
  }

  return 'unknown'
}

export const isLikelyArticlePath = (pathname: string): boolean => {
  const lowered = pathname.toLowerCase()

  if (lowered === '/' || lowered.length < 5) {
    return false
  }

  const negativeSegments = [
    '/tag/',
    '/tags/',
    '/category/',
    '/categories/',
    '/topics/',
    '/search',
    '/archive',
    '/author/',
    '/profile/',
    '/users/',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
  ]

  if (negativeSegments.some((segment) => lowered.includes(segment))) {
    return false
  }

  return /\d{4}\/\d{2}/.test(lowered) || lowered.split('/').filter(Boolean).length >= 2
}
