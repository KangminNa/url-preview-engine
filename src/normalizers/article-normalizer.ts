import type { ArticleCard } from '../types/card'
import type { BaseNormalizerInput } from './base-normalizer'
import { normalizeBaseCard } from './base-normalizer'

export interface ArticleNormalizerInput extends BaseNormalizerInput {
  embedUrl?: string
}

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
