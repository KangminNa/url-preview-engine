import { detectEmbedCapability } from '../capabilities/embed-capability-detector'
import { resolveInteractionMode } from '../capabilities/interaction-mode-resolver'
import { detectPlaybackCapability } from '../capabilities/playback-capability-detector'
import { classifyPageKind } from '../classifiers/page-kind-classifier'
import { classifyProvider } from '../classifiers/provider-classifier'
import { classifyResourceType } from '../classifiers/resource-type-classifier'
import { compressCard } from '../compressors/card-compressor'
import { extractDynamicMetadata } from '../extractors/dynamic.extractor'
import { extractStaticMetadata } from '../extractors/static.extractor'
import { fetchHtml } from '../fetchers/html-fetcher'
import { normalizeUrl } from '../fetchers/url-normalizer'
import { buildPreviewCard } from './preview-factory'
import { BaseCardSchema } from '../schemas/card.schema'
import type { PreviewCard } from '../types/card'
import type {
  DynamicExtractorOptions,
  ExtractedMetadata,
  PreviewOptions,
} from '../types/metadata'

const mergeMetadata = (
  primary: ExtractedMetadata,
  secondary: ExtractedMetadata,
): ExtractedMetadata => ({
  title: primary.title ?? secondary.title,
  description: primary.description ?? secondary.description,
  imageUrl: primary.imageUrl ?? secondary.imageUrl,
  siteName: primary.siteName ?? secondary.siteName,
  author: primary.author ?? secondary.author,
  publishedAt: primary.publishedAt ?? secondary.publishedAt,
  canonicalUrl: primary.canonicalUrl ?? secondary.canonicalUrl,
  excerpt: primary.excerpt ?? secondary.excerpt,
  duration: primary.duration ?? secondary.duration,
  mimeType: primary.mimeType ?? secondary.mimeType,
  ogType: primary.ogType ?? secondary.ogType,
  oEmbedUrl: primary.oEmbedUrl ?? secondary.oEmbedUrl,
  playerUrl: primary.playerUrl ?? secondary.playerUrl,
  snapshot: primary.snapshot ?? secondary.snapshot,
  content: primary.content ?? secondary.content,
})

const resolveEmbedCapability = (params: {
  resolvedUrl: URL
  originalUrl: URL
  resourceType: ReturnType<typeof classifyResourceType>
  pageKind: ReturnType<typeof classifyPageKind>
  metadata: ExtractedMetadata
}): ReturnType<typeof detectEmbedCapability> => {
  const primary = detectEmbedCapability({
    url: params.resolvedUrl,
    resourceType: params.resourceType,
    pageKind: params.pageKind,
    metadata: params.metadata,
  })

  if (primary.embeddable) {
    return primary
  }

  const sameUrl = params.resolvedUrl.toString() === params.originalUrl.toString()
  if (sameUrl) {
    return primary
  }

  const fallback = detectEmbedCapability({
    url: params.originalUrl,
    resourceType: params.resourceType,
    pageKind: params.pageKind,
    metadata: params.metadata,
  })

  return fallback.embeddable ? fallback : primary
}

export const preview = async (
  inputUrl: string,
  options: PreviewOptions = {},
): Promise<PreviewCard> => {
  const normalizedUrl = normalizeUrl(inputUrl)
  const originalUrl = normalizedUrl.toString()

  const fetchEnabled = options.fetchHtml ?? true
  const dynamicFallback = options.dynamicFallback ?? true
  const dynamicExtractor = options.dynamicExtractor ?? extractDynamicMetadata
  const dynamicOptions: DynamicExtractorOptions = {
    userAgent: options.userAgent,
    ...(options.dynamicOptions ?? {}),
  }

  let resolvedUrl = normalizedUrl
  let contentType: string | undefined
  let metadata: ExtractedMetadata = {}

  if (fetchEnabled) {
    try {
      const fetched = await fetchHtml(normalizedUrl, {
        userAgent: options.userAgent,
      })

      resolvedUrl = normalizeUrl(fetched.resolvedUrl)
      contentType = fetched.contentType

      if (fetched.html) {
        metadata = await extractStaticMetadata(fetched.html, resolvedUrl.toString())
      }
    } catch {
      // Network failures should degrade to URL-only inference.
    }
  }

  if (dynamicFallback) {
    const dynamicMetadata = await dynamicExtractor(
      resolvedUrl.toString(),
      dynamicOptions,
    )
    metadata = mergeMetadata(dynamicMetadata, metadata)
  }

  const provider = classifyProvider(resolvedUrl)
  const resourceType = classifyResourceType({
    url: resolvedUrl,
    metadata,
    contentType,
  })
  const pageKind = classifyPageKind({
    url: resolvedUrl,
    resourceType,
  })

  const embedCapability = resolveEmbedCapability({
    resolvedUrl,
    originalUrl: normalizedUrl,
    resourceType,
    pageKind,
    metadata,
  })
  const playable = detectPlaybackCapability({
    resolvedUrl,
    resourceType,
    contentType,
    embeddable: embedCapability.embeddable,
  })
  const interactionMode = resolveInteractionMode({
    embeddable: embedCapability.embeddable,
    playable,
    resourceType,
    pageKind,
  })

  const builtCard = buildPreviewCard({
    originalUrl,
    resolvedUrl: resolvedUrl.toString(),
    provider,
    resourceType,
    pageKind,
    metadata,
    embeddable: embedCapability.embeddable,
    playable,
    interactionMode,
    embedUrl: embedCapability.embedUrl,
  })

  const compressed = compressCard(builtCard)
  BaseCardSchema.parse(compressed)

  return compressed
}
