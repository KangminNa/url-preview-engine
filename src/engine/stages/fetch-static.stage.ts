import { classifyProvider } from '../../classifiers/provider-classifier'
import { extractStaticMetadata } from '../../extractors/static.extractor'
import { fetchHtml } from '../../fetchers/html-fetcher'
import { normalizeUrl } from '../../fetchers/url-normalizer'
import type { PreviewPipelineState } from '../state'
import { PreviewStage } from './preview-stage'
import {
  applyContentRules,
  applyDynamicOptionsPolicies,
  applyMetadataPolicies,
} from '../helpers/pipeline-helpers'
import {
  requireContentProfileRegistry,
  requireDynamicOptions,
  requireNormalizedUrl,
  requirePolicies,
  requirePolicyRegistry,
} from '../helpers/state-guards'

export class FetchStaticStage extends PreviewStage {
  public constructor() {
    super('fetch-static')
  }

  public async execute(
    state: PreviewPipelineState,
  ): Promise<PreviewPipelineState> {
    if (state.fetchEnabled === false) {
      return state
    }

    const normalizedUrl = requireNormalizedUrl(state)
    const policyRegistry = requirePolicyRegistry(state)
    const contentProfileRegistry = requireContentProfileRegistry(state)
    const dynamicOptions = requireDynamicOptions(state)

    try {
      const fetched = await fetchHtml(normalizedUrl, {
        userAgent: state.options.userAgent,
      })

      const resolvedUrl = normalizeUrl(fetched.resolvedUrl)
      const provider = classifyProvider(resolvedUrl)
      const contentType = fetched.contentType
      const activePolicies = policyRegistry.resolve(resolvedUrl, provider)
      const activeContentRules = contentProfileRegistry.resolve(
        resolvedUrl,
        provider,
      )

      let resolvedDynamicOptions = applyContentRules(
        dynamicOptions,
        activeContentRules,
      )
      resolvedDynamicOptions = applyDynamicOptionsPolicies(activePolicies, {
        url: resolvedUrl,
        provider,
        options: resolvedDynamicOptions,
      })

      let metadata = state.metadata
      if (fetched.html) {
        const staticMetadata = await extractStaticMetadata(
          fetched.html,
          resolvedUrl.toString(),
          resolvedDynamicOptions,
        )
        metadata = applyMetadataPolicies(activePolicies, {
          url: resolvedUrl,
          provider,
          contentType,
          metadata: staticMetadata,
        })
      }

      return {
        ...state,
        resolvedUrl,
        provider,
        contentType,
        activePolicies,
        activeContentRules,
        dynamicOptions: resolvedDynamicOptions,
        metadata,
      }
    } catch {
      // Network failures should degrade to URL-only inference.
      return {
        ...state,
        activePolicies: requirePolicies(state),
      }
    }
  }
}
