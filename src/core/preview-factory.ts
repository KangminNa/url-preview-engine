import type { PreviewCard } from '../types/card'
import type { BuildCardInput } from './preview-factory.types'
import { normalizeArticleCard } from '../normalizers/article-normalizer'
import {
  normalizeAudioCard,
  normalizeImageCard,
} from '../normalizers/image-normalizer'
import { normalizeGenericCard } from '../normalizers/generic-normalizer'
import { normalizeVideoCard } from '../normalizers/video-normalizer'

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

export type { BuildCardInput } from './preview-factory.types'
