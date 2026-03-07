import type { GenericCard } from '../types/card'
import type { GenericNormalizerInput } from './card-normalizer.types'
import { normalizeBaseCard } from './base-normalizer'

export const normalizeGenericCard = (
  input: GenericNormalizerInput,
): GenericCard => {
  const base = normalizeBaseCard(input)

  const resourceType =
    input.resourceType === 'social' ||
    input.resourceType === 'website' ||
    input.resourceType === 'unknown'
      ? input.resourceType
      : 'unknown'

  return {
    ...base,
    resourceType,
    embedUrl: input.embedUrl,
  }
}

export type { GenericNormalizerInput } from './card-normalizer.types'
