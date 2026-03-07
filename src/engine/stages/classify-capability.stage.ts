import type { PreviewPipelineState } from '../state'
import { PreviewStage } from './preview-stage'
import {
  applyCapabilityPolicies,
  applyClassificationPolicies,
  resolveCapabilityState,
  resolveClassificationState,
} from '../helpers/pipeline-helpers'
import {
  requireOriginalUrl,
  requirePolicies,
  requireProvider,
  requireResolvedUrl,
} from '../helpers/state-guards'

export class ClassifyCapabilityStage extends PreviewStage {
  public constructor() {
    super('classify-capability')
  }

  public async execute(
    state: PreviewPipelineState,
  ): Promise<PreviewPipelineState> {
    const resolvedUrl = requireResolvedUrl(state)
    const provider = requireProvider(state)
    const activePolicies = requirePolicies(state)
    const originalUrl = new URL(requireOriginalUrl(state))

    const baseClassification = resolveClassificationState({
      resolvedUrl,
      contentType: state.contentType,
      metadata: state.metadata,
    })
    const classification = applyClassificationPolicies(activePolicies, {
      url: resolvedUrl,
      provider,
      contentType: state.contentType,
      metadata: state.metadata,
      classification: baseClassification,
    })

    const baseCapability = resolveCapabilityState({
      resolvedUrl,
      originalUrl,
      contentType: state.contentType,
      metadata: state.metadata,
      classification,
    })
    const capability = applyCapabilityPolicies(activePolicies, {
      url: resolvedUrl,
      provider,
      contentType: state.contentType,
      metadata: state.metadata,
      classification,
      capability: baseCapability,
    })

    return {
      ...state,
      classification,
      capability,
    }
  }
}
