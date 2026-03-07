import type { ArticleCard } from '../types/card'
import type { ArticleNormalizerInput } from './card-normalizer.types'
import { normalizeBaseCard } from './base-normalizer'

export const normalizeArticleCard = (
  input: ArticleNormalizerInput,
): ArticleCard => {
  const base = normalizeBaseCard(input)

  return {
    ...base,
    resourceType: 'article',
    interactionMode:
      input.interactionMode === 'embeddable'
        ? 'embeddable'
        : input.interactionMode === 'expandable'
          ? 'expandable'
          : 'static',
    embedUrl: input.embedUrl,
    excerpt: input.metadata.excerpt,
  }
}

export type { ArticleNormalizerInput } from './card-normalizer.types'
