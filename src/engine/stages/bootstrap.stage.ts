import { classifyProvider } from '../../classifiers/provider-classifier'
import { createContentProfileRegistry } from '../../content/content-profile-registry'
import { normalizeUrl } from '../../fetchers/url-normalizer'
import { createPolicyRegistry } from '../../policies/policy-registry'
import type { PreviewPipelineState } from '../state'
import { PreviewStage } from './preview-stage'
import {
  applyContentRules,
  applyDynamicOptionsPolicies,
} from '../helpers/pipeline-helpers'

export class BootstrapStage extends PreviewStage {
  public constructor() {
    super('bootstrap')
  }

  public async execute(
    state: PreviewPipelineState,
  ): Promise<PreviewPipelineState> {
    const normalizedUrl = normalizeUrl(state.inputUrl)
    const originalUrl = normalizedUrl.toString()
    const initialProvider = classifyProvider(normalizedUrl)

    const policyRegistry = createPolicyRegistry(state.options.sitePolicies)
    const contentProfileRegistry = createContentProfileRegistry(
      state.options.contentProfiles,
    )
    const activePolicies = policyRegistry.resolve(normalizedUrl, initialProvider)
    const activeContentRules = contentProfileRegistry.resolve(
      normalizedUrl,
      initialProvider,
    )

    let dynamicOptions = applyContentRules(
      {
        userAgent: state.options.userAgent,
        ...(state.options.dynamicOptions ?? {}),
      },
      activeContentRules,
    )

    dynamicOptions = applyDynamicOptionsPolicies(activePolicies, {
      url: normalizedUrl,
      provider: initialProvider,
      options: dynamicOptions,
    })

    return {
      ...state,
      normalizedUrl,
      originalUrl,
      resolvedUrl: normalizedUrl,
      initialProvider,
      provider: initialProvider,
      policyRegistry,
      contentProfileRegistry,
      activePolicies,
      activeContentRules,
      fetchEnabled: state.options.fetchHtml ?? true,
      dynamicFallback: state.options.dynamicFallback ?? true,
      dynamicExtractor: state.options.dynamicExtractor,
      dynamicOptions,
    }
  }
}
