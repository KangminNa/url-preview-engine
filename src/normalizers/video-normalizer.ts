import type { VideoCard } from '../types/card'
import type { BaseNormalizerInput } from './base-normalizer'
import { normalizeBaseCard } from './base-normalizer'

export interface VideoNormalizerInput extends BaseNormalizerInput {
  embedUrl?: string
}

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
