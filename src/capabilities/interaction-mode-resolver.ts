import type {
  InteractionMode,
  PageKind,
  ResourceType,
} from '../types/classification'

export interface InteractionModeInput {
  embeddable: boolean
  playable: boolean
  resourceType: ResourceType
  pageKind: PageKind
}

export const resolveInteractionMode = ({
  embeddable,
  playable,
  resourceType,
  pageKind,
}: InteractionModeInput): InteractionMode => {
  if (embeddable) {
    return 'embeddable'
  }

  if (playable) {
    return 'playable'
  }

  if (resourceType === 'article' && pageKind === 'atomic') {
    return 'expandable'
  }

  return 'static'
}
