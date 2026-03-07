import { detectEmbedCapability } from '../../capabilities/embed-capability-detector'
import { resolveInteractionMode } from '../../capabilities/interaction-mode-resolver'
import { detectPlaybackCapability } from '../../capabilities/playback-capability-detector'
import { classifyPageKind } from '../../classifiers/page-kind-classifier'
import { classifyResourceType } from '../../classifiers/resource-type-classifier'
import type {
  ContentExtractionRules,
} from '../../content/content-profile'
import type { SitePolicy } from '../../policies/site-policy'
import type { PreviewCard } from '../../types/card'
import type { Provider } from '../../types/classification'
import type {
  DynamicExtractorOptions,
  ExtractedMetadata,
} from '../../types/metadata'
import type {
  CapabilityState,
  ClassificationState,
} from '../../policies/site-policy'

const mergeUnique = (
  base: string[] | undefined,
  extra: string[] | undefined,
): string[] | undefined => {
  if (!base && !extra) {
    return undefined
  }

  return Array.from(new Set([...(base ?? []), ...(extra ?? [])]))
}

const resolveContentScore = (content: ExtractedMetadata['content']): number => {
  if (!content) {
    return -1
  }

  if (typeof content.quality?.score === 'number') {
    return content.quality.score
  }

  if (content.text.length >= 600) {
    return 55
  }

  if (content.text.length >= 180) {
    return 35
  }

  return 15
}

const selectPreferredContent = (
  primary: ExtractedMetadata['content'],
  secondary: ExtractedMetadata['content'],
): ExtractedMetadata['content'] => {
  if (!primary) {
    return secondary
  }

  if (!secondary) {
    return primary
  }

  return resolveContentScore(primary) >= resolveContentScore(secondary)
    ? primary
    : secondary
}

const resolveExcerptFromContent = (
  content: ExtractedMetadata['content'],
): string | undefined => {
  const text = content?.text?.replace(/\s+/g, ' ').trim()
  if (!text || text.length < 60) {
    return undefined
  }

  return text.slice(0, 320)
}

export const applyContentRules = (
  options: DynamicExtractorOptions,
  rules: ContentExtractionRules,
): DynamicExtractorOptions => {
  return {
    ...options,
    focusTitleNearestBody:
      options.focusTitleNearestBody ?? rules.focusTitleNearestBody,
    timeoutMs: options.timeoutMs ?? rules.timeoutMs,
    maxScrollSteps: options.maxScrollSteps ?? rules.maxScrollSteps,
    scrollDelayMs: options.scrollDelayMs ?? rules.scrollDelayMs,
    mainSelectors: mergeUnique(options.mainSelectors, rules.mainSelectors),
    removeSelectors: mergeUnique(options.removeSelectors, rules.removeSelectors),
    noiseKeywords: mergeUnique(options.noiseKeywords, rules.noiseKeywords),
    mainKeywords: mergeUnique(options.mainKeywords, rules.mainKeywords),
    dropTags: mergeUnique(options.dropTags, rules.dropTags),
  }
}

export const mergeMetadata = (
  primary: ExtractedMetadata,
  secondary: ExtractedMetadata,
): ExtractedMetadata => {
  const content = selectPreferredContent(primary.content, secondary.content)

  return {
    title: primary.title ?? secondary.title,
    description: primary.description ?? secondary.description,
    imageUrl: primary.imageUrl ?? secondary.imageUrl,
    siteName: primary.siteName ?? secondary.siteName,
    author: primary.author ?? secondary.author,
    publishedAt: primary.publishedAt ?? secondary.publishedAt,
    canonicalUrl: primary.canonicalUrl ?? secondary.canonicalUrl,
    excerpt:
      primary.excerpt ?? secondary.excerpt ?? resolveExcerptFromContent(content),
    duration: primary.duration ?? secondary.duration,
    mimeType: primary.mimeType ?? secondary.mimeType,
    ogType: primary.ogType ?? secondary.ogType,
    oEmbedUrl: primary.oEmbedUrl ?? secondary.oEmbedUrl,
    playerUrl: primary.playerUrl ?? secondary.playerUrl,
    snapshot: primary.snapshot ?? secondary.snapshot,
    content,
  }
}

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

export const resolveClassificationState = (params: {
  resolvedUrl: URL
  contentType?: string
  metadata: ExtractedMetadata
}): ClassificationState => {
  const defaultResourceType = classifyResourceType({
    url: params.resolvedUrl,
    metadata: params.metadata,
    contentType: params.contentType,
  })
  const defaultPageKind = classifyPageKind({
    url: params.resolvedUrl,
    resourceType: defaultResourceType,
  })

  return {
    resourceType: defaultResourceType,
    pageKind: defaultPageKind,
  }
}

export const resolveCapabilityState = (params: {
  resolvedUrl: URL
  originalUrl: URL
  contentType?: string
  metadata: ExtractedMetadata
  classification: ClassificationState
}): CapabilityState => {
  const embedCapability = resolveEmbedCapability({
    resolvedUrl: params.resolvedUrl,
    originalUrl: params.originalUrl,
    resourceType: params.classification.resourceType,
    pageKind: params.classification.pageKind,
    metadata: params.metadata,
  })

  const defaultPlayable = detectPlaybackCapability({
    resolvedUrl: params.resolvedUrl,
    resourceType: params.classification.resourceType,
    contentType: params.contentType,
    embeddable: embedCapability.embeddable,
  })

  const defaultInteractionMode = resolveInteractionMode({
    embeddable: embedCapability.embeddable,
    playable: defaultPlayable,
    resourceType: params.classification.resourceType,
    pageKind: params.classification.pageKind,
  })

  return {
    embeddable: embedCapability.embeddable,
    embedUrl: embedCapability.embedUrl,
    playable: defaultPlayable,
    interactionMode: defaultInteractionMode,
  }
}

export const applyDynamicOptionsPolicies = (
  policies: SitePolicy[],
  params: {
    url: URL
    provider: Provider
    options: DynamicExtractorOptions
  },
): DynamicExtractorOptions => {
  return policies.reduce((resolvedOptions, policy) => {
    return policy.resolveDynamicOptions({
      ...params,
      options: resolvedOptions,
    })
  }, params.options)
}

export const applyMetadataPolicies = (
  policies: SitePolicy[],
  params: {
    url: URL
    provider: Provider
    contentType?: string
    metadata: ExtractedMetadata
  },
): ExtractedMetadata => {
  return policies.reduce((resolvedMetadata, policy) => {
    return policy.refineMetadata({
      ...params,
      metadata: resolvedMetadata,
    })
  }, params.metadata)
}

export const applyClassificationPolicies = (
  policies: SitePolicy[],
  params: {
    url: URL
    provider: Provider
    contentType?: string
    metadata: ExtractedMetadata
    classification: ClassificationState
  },
): ClassificationState => {
  return policies.reduce((resolvedClassification, policy) => {
    return policy.refineClassification({
      ...params,
      classification: resolvedClassification,
    })
  }, params.classification)
}

export const applyCapabilityPolicies = (
  policies: SitePolicy[],
  params: {
    url: URL
    provider: Provider
    contentType?: string
    metadata: ExtractedMetadata
    classification: ClassificationState
    capability: CapabilityState
  },
): CapabilityState => {
  return policies.reduce((resolvedCapability, policy) => {
    return policy.refineCapability({
      ...params,
      capability: resolvedCapability,
    })
  }, params.capability)
}

export const applyCardPolicies = (
  policies: SitePolicy[],
  params: {
    url: URL
    provider: Provider
    metadata: ExtractedMetadata
    classification: ClassificationState
    capability: CapabilityState
    card: PreviewCard
  },
): PreviewCard => {
  return policies.reduce((resolvedCard, policy) => {
    return policy.refineCard({
      ...params,
      card: resolvedCard,
    })
  }, params.card)
}
