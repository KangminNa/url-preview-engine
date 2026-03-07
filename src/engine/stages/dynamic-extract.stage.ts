import { extractDynamicMetadata } from '../../extractors/dynamic.extractor'
import type { DynamicExtractorOptions } from '../../types/metadata'
import type { PreviewPipelineState } from '../state'
import { PreviewStage } from './preview-stage'
import {
  applyMetadataPolicies,
  mergeMetadata,
} from '../helpers/pipeline-helpers'
import {
  requireDynamicOptions,
  requirePolicies,
  requireProvider,
  requireResolvedUrl,
} from '../helpers/state-guards'

export class DynamicExtractStage extends PreviewStage {
  public constructor() {
    super('dynamic-extract')
  }

  public async execute(
    state: PreviewPipelineState,
  ): Promise<PreviewPipelineState> {
    if (state.dynamicFallback === false) {
      return state
    }

    const resolvedUrl = requireResolvedUrl(state)
    const provider = requireProvider(state)
    const activePolicies = requirePolicies(state)
    const dynamicOptions = requireDynamicOptions(state)
    const dynamicExtractor = state.dynamicExtractor ?? extractDynamicMetadata

    const runtimeDynamicOptions: DynamicExtractorOptions = {
      ...dynamicOptions,
      titleHint: dynamicOptions.titleHint ?? state.metadata.title,
    }

    const dynamicMetadata = await dynamicExtractor(
      resolvedUrl.toString(),
      runtimeDynamicOptions,
    )
    const merged = mergeMetadata(dynamicMetadata, state.metadata)
    const metadata = applyMetadataPolicies(activePolicies, {
      url: resolvedUrl,
      provider,
      contentType: state.contentType,
      metadata: merged,
    })

    return {
      ...state,
      metadata,
    }
  }
}
