import type { BaseNormalizerInput } from './base-normalizer.types'

export interface ArticleNormalizerInput extends BaseNormalizerInput {
  embedUrl?: string
}

export interface GenericNormalizerInput extends BaseNormalizerInput {
  embedUrl?: string
}

export interface VideoNormalizerInput extends BaseNormalizerInput {
  embedUrl?: string
}

