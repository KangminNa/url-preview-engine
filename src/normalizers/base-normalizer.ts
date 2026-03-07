import type { BaseCard } from '../types/card'
import type { BaseNormalizerInput } from './base-normalizer.types'
import { selectAuthor } from '../selectors/author-selector'
import { selectDescription } from '../selectors/description-selector'
import { selectImageUrl } from '../selectors/image-selector'
import { selectTitle } from '../selectors/title-selector'

export const normalizeBaseCard = (
  input: BaseNormalizerInput,
): BaseCard => {
  const resolved = new URL(input.resolvedUrl)

  return {
    originalUrl: input.originalUrl,
    resolvedUrl: input.resolvedUrl,
    canonicalUrl: input.metadata.canonicalUrl,
    provider: input.provider,
    resourceType: input.resourceType,
    pageKind: input.pageKind,
    title: selectTitle(input.metadata, resolved.hostname),
    description: selectDescription(input.metadata),
    imageUrl: selectImageUrl(input.metadata),
    siteName: input.metadata.siteName,
    author: selectAuthor(input.metadata),
    publishedAt: input.metadata.publishedAt,
    snapshot: input.metadata.snapshot,
    content: input.metadata.content,
    embeddable: input.embeddable,
    playable: input.playable,
    interactionMode: input.interactionMode,
  }
}

export type { BaseNormalizerInput } from './base-normalizer.types'
