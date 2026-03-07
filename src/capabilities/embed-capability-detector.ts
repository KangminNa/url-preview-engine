import type { PageKind, ResourceType } from '../types/classification'
import type { ExtractedMetadata } from '../types/metadata'

export interface EmbedCapabilityResult {
  embeddable: boolean
  embedUrl?: string
}

export interface EmbedCapabilityInput {
  url: URL
  resourceType: ResourceType
  pageKind: PageKind
  metadata: ExtractedMetadata
}

interface EmbedRule {
  id: string
  test: (input: EmbedCapabilityInput) => boolean
  resolve: (input: EmbedCapabilityInput) => EmbedCapabilityResult
}

const EMBED_PATH_HINT = /(\/embed\/|\/player\/)/i

const RULES: EmbedRule[] = [
  {
    id: 'oembed-link',
    test: (input) => typeof input.metadata.oEmbedUrl === 'string',
    resolve: (input) => ({
      embeddable: true,
      embedUrl: input.metadata.oEmbedUrl,
    }),
  },
  {
    id: 'meta-player',
    test: (input) => typeof input.metadata.playerUrl === 'string',
    resolve: (input) => ({
      embeddable: true,
      embedUrl: input.metadata.playerUrl,
    }),
  },
  {
    id: 'embed-shaped-url',
    test: (input) =>
      EMBED_PATH_HINT.test(input.url.pathname) ||
      input.url.searchParams.has('embed'),
    resolve: (input) => ({
      embeddable: true,
      embedUrl: input.url.toString(),
    }),
  },
]

export const detectEmbedCapability = (
  input: EmbedCapabilityInput,
): EmbedCapabilityResult => {
  if (input.pageKind !== 'atomic') {
    return { embeddable: false }
  }

  if (
    input.resourceType !== 'video' &&
    input.resourceType !== 'social' &&
    input.resourceType !== 'article'
  ) {
    return { embeddable: false }
  }

  for (const rule of RULES) {
    if (rule.test(input)) {
      return rule.resolve(input)
    }
  }

  return { embeddable: false }
}
