import type { ResourceType } from '../types/classification'
import type { ExtractedMetadata } from '../types/metadata'

export interface ResourceTypeInput {
  url: URL
  metadata: ExtractedMetadata
  contentType?: string
}

export interface ResourceTypeRule {
  id: string
  test: (input: ResourceTypeInput) => boolean
  output: ResourceType
}

