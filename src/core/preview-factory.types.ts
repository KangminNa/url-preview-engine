import type {
  InteractionMode,
  PageKind,
  Provider,
  ResourceType,
} from '../types/classification'
import type { ExtractedMetadata } from '../types/metadata'

export interface BuildCardInput {
  originalUrl: string
  resolvedUrl: string
  provider: Provider
  resourceType: ResourceType
  pageKind: PageKind
  metadata: ExtractedMetadata
  embeddable: boolean
  playable: boolean
  interactionMode: InteractionMode
  embedUrl?: string
}

