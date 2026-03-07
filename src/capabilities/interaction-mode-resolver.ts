import type {
  InteractionMode,
} from '../types/classification'
import type { InteractionModeInput } from './interaction-mode-resolver.types'

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

export type { InteractionModeInput } from './interaction-mode-resolver.types'
