import type { GenericCard } from '../types/card'
import type { BaseNormalizerInput } from './base-normalizer'
import { normalizeBaseCard } from './base-normalizer'

export interface GenericNormalizerInput extends BaseNormalizerInput {
  embedUrl?: string
}

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
