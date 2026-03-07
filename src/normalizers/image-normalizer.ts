import type { AudioCard, ImageCard } from '../types/card'
import type { BaseNormalizerInput } from './base-normalizer'
import { normalizeBaseCard } from './base-normalizer'

export const normalizeImageCard = (
  input: BaseNormalizerInput,
): ImageCard => {
  const base = normalizeBaseCard(input)

  return {
    ...base,
    resourceType: 'image',
    interactionMode: 'playable',
    originalMediaUrl: input.resolvedUrl,
  }
}

export const normalizeAudioCard = (
  input: BaseNormalizerInput,
): AudioCard => {
  const base = normalizeBaseCard(input)

  return {
    ...base,
    resourceType: 'audio',
    interactionMode: 'playable',
    originalMediaUrl: input.resolvedUrl,
  }
}
