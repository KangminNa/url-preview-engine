import type {
  PageKind,
  ResourceType,
} from '../types/classification'

export interface InteractionModeInput {
  embeddable: boolean
  playable: boolean
  resourceType: ResourceType
  pageKind: PageKind
}

