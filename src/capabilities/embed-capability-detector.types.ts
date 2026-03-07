import type { PageKind, ResourceType } from '../types/classification'
import type { ExtractedMetadata } from '../types/metadata'

export interface EmbedCapabilityResult {
  embeddable: boolean
  embedUrl?: string
}

export interface EmbedCapabilityInput {
  url: URL
  resourceType: ResourceType
  pageKind: PageKind
  metadata: ExtractedMetadata
}

export interface EmbedRule {
  id: string
  test: (input: EmbedCapabilityInput) => boolean
  resolve: (input: EmbedCapabilityInput) => EmbedCapabilityResult
}

