import { compressCard } from '../../compressors/card-compressor'
import { BaseCardSchema } from '../../schemas/card.schema'
import { buildPreviewCard } from '../../core/preview-factory'
import type { PreviewPipelineState } from '../state'
import { PreviewStage } from './preview-stage'
import { applyCardPolicies } from '../helpers/pipeline-helpers'
import {
  requireCapability,
  requireClassification,
  requireOriginalUrl,
  requirePolicies,
  requireProvider,
  requireResolvedUrl,
} from '../helpers/state-guards'

export class BuildCardStage extends PreviewStage {
  public constructor() {
    super('build-card')
  }

  public async execute(
    state: PreviewPipelineState,
  ): Promise<PreviewPipelineState> {
    const originalUrl = requireOriginalUrl(state)
    const resolvedUrl = requireResolvedUrl(state)
    const provider = requireProvider(state)
    const activePolicies = requirePolicies(state)
    const classification = requireClassification(state)
    const capability = requireCapability(state)

    let card = buildPreviewCard({
      originalUrl,
      resolvedUrl: resolvedUrl.toString(),
      provider,
      resourceType: classification.resourceType,
      pageKind: classification.pageKind,
      metadata: state.metadata,
      embeddable: capability.embeddable,
      playable: capability.playable,
      interactionMode: capability.interactionMode,
      embedUrl: capability.embedUrl,
    })

    card = applyCardPolicies(activePolicies, {
      url: resolvedUrl,
      provider,
      metadata: state.metadata,
      classification,
      capability,
      card,
    })

    const compressed = compressCard(card)
    BaseCardSchema.parse(compressed)

    return {
      ...state,
      card: compressed,
    }
  }
}
