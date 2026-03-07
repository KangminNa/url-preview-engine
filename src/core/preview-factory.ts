import type { PreviewCard } from '../types/card'
import type {
  InteractionMode,
  PageKind,
  Provider,
  ResourceType,
} from '../types/classification'
import type { ExtractedMetadata } from '../types/metadata'
import { normalizeArticleCard } from '../normalizers/article-normalizer'
import {
  normalizeAudioCard,
  normalizeImageCard,
} from '../normalizers/image-normalizer'
import { normalizeGenericCard } from '../normalizers/generic-normalizer'
import { normalizeVideoCard } from '../normalizers/video-normalizer'

export interface BuildCardInput {
  originalUrl: string
  resolvedUrl: string
  provider: Provider
  resourceType: ResourceType
  pageKind: PageKind
  metadata: ExtractedMetadata
  embeddable: boolean
  playable: boolean
  interactionMode: InteractionMode
  embedUrl?: string
}

export const buildPreviewCard = (input: BuildCardInput): PreviewCard => {
  if (input.resourceType === 'video') {
    return normalizeVideoCard(input)
  }

  if (input.resourceType === 'article') {
    return normalizeArticleCard(input)
  }

  if (input.resourceType === 'image') {
    return normalizeImageCard(input)
  }

  if (input.resourceType === 'audio') {
    return normalizeAudioCard(input)
  }

  if (
    input.resourceType === 'social' ||
    input.resourceType === 'website' ||
    input.resourceType === 'unknown'
  ) {
    return normalizeGenericCard(input)
  }

  return normalizeGenericCard({
    ...input,
    resourceType: 'unknown',
  })
}
