import type { ExtractedMetadata } from '../types/metadata'
import { SitePolicy } from './site-policy'
import type {
  CapabilityState,
  ClassificationState,
  PolicyCapabilityInput,
  PolicyClassificationInput,
  PolicyMetadataInput,
  SitePolicyMatchInput,
} from './site-policy'

const YOUTUBE_HOST_PATTERN = /(^|\.)youtube\.com$|(^|\.)youtu\.be$/i
const isYouTubeHost = (host: string): boolean => {
  return YOUTUBE_HOST_PATTERN.test(host.toLowerCase())
}

const normalizeVideoId = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined
  }

  const normalized = value.trim()
  if (!normalized) {
    return undefined
  }

  return /^[a-zA-Z0-9_-]{6,20}$/.test(normalized) ? normalized : undefined
}

const extractYouTubeVideoId = (url: URL): string | undefined => {
  const host = url.hostname.toLowerCase()
  const path = url.pathname

  if (host.includes('youtu.be')) {
    return normalizeVideoId(path.split('/').filter(Boolean)[0])
  }

  if (path === '/watch') {
    return normalizeVideoId(url.searchParams.get('v') ?? undefined)
  }

  const pathSegments = path.split('/').filter(Boolean)
  if (pathSegments.length < 2) {
    return undefined
  }

  const type = pathSegments[0]
  const identifier = pathSegments[1]
  if (type === 'shorts' || type === 'embed' || type === 'live') {
    return normalizeVideoId(identifier)
  }

  return undefined
}

const buildEmbedUrl = (videoId: string): string => {
  return `https://www.youtube.com/embed/${videoId}`
}

const mergeMetadata = (
  metadata: ExtractedMetadata,
  videoId: string | undefined,
): ExtractedMetadata => {
  if (!videoId) {
    return metadata
  }

  const embedUrl = buildEmbedUrl(videoId)
  return {
    ...metadata,
    playerUrl: metadata.playerUrl ?? embedUrl,
    oEmbedUrl: metadata.oEmbedUrl,
    ogType: metadata.ogType ?? 'video.other',
  }
}

const resolveClassification = (
  current: ClassificationState,
  videoId: string | undefined,
): ClassificationState => {
  if (!videoId) {
    return current
  }

  return {
    resourceType: 'video',
    pageKind: 'atomic',
  }
}

export class YouTubeSitePolicy extends SitePolicy {
  public constructor() {
    super('youtube', 120)
  }

  public matches(input: SitePolicyMatchInput): boolean {
    return (
      input.provider === 'youtube' || isYouTubeHost(input.url.hostname)
    )
  }

  public refineMetadata(input: PolicyMetadataInput): ExtractedMetadata {
    const videoId = extractYouTubeVideoId(input.url)
    return mergeMetadata(input.metadata, videoId)
  }

  public refineClassification(
    input: PolicyClassificationInput,
  ): ClassificationState {
    const videoId = extractYouTubeVideoId(input.url)
    return resolveClassification(input.classification, videoId)
  }

  public refineCapability(input: PolicyCapabilityInput): CapabilityState {
    const videoId = extractYouTubeVideoId(input.url)
    if (!videoId) {
      return input.capability
    }

    return {
      embeddable: true,
      embedUrl: buildEmbedUrl(videoId),
      playable: true,
      interactionMode: 'embeddable',
    }
  }
}
