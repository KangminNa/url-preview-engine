import type { VideoCard } from '../types/card'
import type { VideoNormalizerInput } from './card-normalizer.types'
import { normalizeBaseCard } from './base-normalizer'

export const normalizeVideoCard = (
  input: VideoNormalizerInput,
): VideoCard => {
  const base = normalizeBaseCard(input)

  return {
    ...base,
    resourceType: 'video',
    interactionMode: input.interactionMode === 'embeddable' ? 'embeddable' : 'playable',
    embedUrl: input.embedUrl,
    duration: input.metadata.duration,
  }
}

export type { VideoNormalizerInput } from './card-normalizer.types'
