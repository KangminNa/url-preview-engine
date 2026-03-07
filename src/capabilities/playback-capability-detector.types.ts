import type { ResourceType } from '../types/classification'

export interface PlaybackCapabilityInput {
  resolvedUrl: URL
  resourceType: ResourceType
  contentType?: string
  embeddable: boolean
}

