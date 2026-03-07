import { detectEmbedCapability } from '../capabilities/embed-capability-detector'
import { resolveInteractionMode } from '../capabilities/interaction-mode-resolver'
import { detectPlaybackCapability } from '../capabilities/playback-capability-detector'
import { classifyPageKind } from '../classifiers/page-kind-classifier'
import { classifyProvider } from '../classifiers/provider-classifier'
import { classifyResourceType } from '../classifiers/resource-type-classifier'
import { compressCard } from '../compressors/card-compressor'
import { createContentProfileRegistry } from '../content/content-profile-registry'
import { extractDynamicMetadata } from '../extractors/dynamic.extractor'
import { extractStaticMetadata } from '../extractors/static.extractor'
import { fetchHtml } from '../fetchers/html-fetcher'
import { normalizeUrl } from '../fetchers/url-normalizer'
import { createPolicyRegistry } from '../policies/policy-registry'
import { buildPreviewCard } from './preview-factory'
import { BaseCardSchema } from '../schemas/card.schema'
import type { PreviewCard } from '../types/card'
import type {
  ContentExtractionRules,
} from '../content/content-profile'
import type {
  DynamicExtractorOptions,
  ExtractedMetadata,
  PreviewOptions,
} from '../types/metadata'
import type { Provider } from '../types/classification'
import type {
  CapabilityState,
  ClassificationState,
  SitePolicy,
} from '../policies/site-policy'

const mergeUnique = (
  base: string[] | undefined,
  extra: string[] | undefined,
): string[] | undefined => {
  if (!base && !extra) {
    return undefined
  }

  return Array.from(new Set([...(base ?? []), ...(extra ?? [])]))
}

const applyContentRules = (
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

const mergeMetadata = (
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

const applyDynamicOptionsPolicies = (
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

const applyMetadataPolicies = (
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

const applyClassificationPolicies = (
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

const applyCapabilityPolicies = (
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

const applyCardPolicies = (
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

export const preview = async (
  inputUrl: string,
  options: PreviewOptions = {},
): Promise<PreviewCard> => {
  const normalizedUrl = normalizeUrl(inputUrl)
  const originalUrl = normalizedUrl.toString()
  const initialProvider = classifyProvider(normalizedUrl)
  const policyRegistry = createPolicyRegistry(options.sitePolicies)
  const contentProfileRegistry = createContentProfileRegistry(
    options.contentProfiles,
  )
  let activePolicies = policyRegistry.resolve(normalizedUrl, initialProvider)
  let activeContentRules = contentProfileRegistry.resolve(
    normalizedUrl,
    initialProvider,
  )

  const fetchEnabled = options.fetchHtml ?? true
  const dynamicFallback = options.dynamicFallback ?? true
  const dynamicExtractor = options.dynamicExtractor ?? extractDynamicMetadata
  let dynamicOptions: DynamicExtractorOptions = {
    userAgent: options.userAgent,
    ...(options.dynamicOptions ?? {}),
  }
  dynamicOptions = applyContentRules(dynamicOptions, activeContentRules)
  dynamicOptions = applyDynamicOptionsPolicies(activePolicies, {
    url: normalizedUrl,
    provider: initialProvider,
    options: dynamicOptions,
  })

  let resolvedUrl = normalizedUrl
  let provider = initialProvider
  let contentType: string | undefined
  let metadata: ExtractedMetadata = {}

  if (fetchEnabled) {
    try {
      const fetched = await fetchHtml(normalizedUrl, {
        userAgent: options.userAgent,
      })

      resolvedUrl = normalizeUrl(fetched.resolvedUrl)
      provider = classifyProvider(resolvedUrl)
      activePolicies = policyRegistry.resolve(resolvedUrl, provider)
      activeContentRules = contentProfileRegistry.resolve(resolvedUrl, provider)
      contentType = fetched.contentType

      dynamicOptions = applyContentRules(dynamicOptions, activeContentRules)
      dynamicOptions = applyDynamicOptionsPolicies(activePolicies, {
        url: resolvedUrl,
        provider,
        options: dynamicOptions,
      })

      if (fetched.html) {
        const staticMetadata = await extractStaticMetadata(
          fetched.html,
          resolvedUrl.toString(),
          dynamicOptions,
        )
        metadata = applyMetadataPolicies(activePolicies, {
          url: resolvedUrl,
          provider,
          contentType,
          metadata: staticMetadata,
        })
      }
    } catch {
      // Network failures should degrade to URL-only inference.
    }
  }

  if (dynamicFallback) {
    const runtimeDynamicOptions: DynamicExtractorOptions = {
      ...dynamicOptions,
      titleHint: dynamicOptions.titleHint ?? metadata.title,
    }

    const dynamicMetadata = await dynamicExtractor(
      resolvedUrl.toString(),
      runtimeDynamicOptions,
    )
    metadata = mergeMetadata(dynamicMetadata, metadata)
    metadata = applyMetadataPolicies(activePolicies, {
      url: resolvedUrl,
      provider,
      contentType,
      metadata,
    })
  }

  const defaultResourceType = classifyResourceType({
    url: resolvedUrl,
    metadata,
    contentType,
  })
  const defaultPageKind = classifyPageKind({
    url: resolvedUrl,
    resourceType: defaultResourceType,
  })
  const classification = applyClassificationPolicies(activePolicies, {
    url: resolvedUrl,
    provider,
    contentType,
    metadata,
    classification: {
      resourceType: defaultResourceType,
      pageKind: defaultPageKind,
    },
  })

  const embedCapability = resolveEmbedCapability({
    resolvedUrl,
    originalUrl: normalizedUrl,
    resourceType: classification.resourceType,
    pageKind: classification.pageKind,
    metadata,
  })
  const defaultPlayable = detectPlaybackCapability({
    resolvedUrl,
    resourceType: classification.resourceType,
    contentType,
    embeddable: embedCapability.embeddable,
  })
  const defaultInteractionMode = resolveInteractionMode({
    embeddable: embedCapability.embeddable,
    playable: defaultPlayable,
    resourceType: classification.resourceType,
    pageKind: classification.pageKind,
  })
  const capability = applyCapabilityPolicies(activePolicies, {
    url: resolvedUrl,
    provider,
    contentType,
    metadata,
    classification,
    capability: {
      embeddable: embedCapability.embeddable,
      embedUrl: embedCapability.embedUrl,
      playable: defaultPlayable,
      interactionMode: defaultInteractionMode,
    },
  })

  let builtCard = buildPreviewCard({
    originalUrl,
    resolvedUrl: resolvedUrl.toString(),
    provider,
    resourceType: classification.resourceType,
    pageKind: classification.pageKind,
    metadata,
    embeddable: capability.embeddable,
    playable: capability.playable,
    interactionMode: capability.interactionMode,
    embedUrl: capability.embedUrl,
  })
  builtCard = applyCardPolicies(activePolicies, {
    url: resolvedUrl,
    provider,
    metadata,
    classification,
    capability,
    card: builtCard,
  })

  const compressed = compressCard(builtCard)
  BaseCardSchema.parse(compressed)

  return compressed
}
