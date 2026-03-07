import type {
  ContentExtractionRules,
} from '../content/content-profile.types'
import type { ContentProfileRegistry } from '../content/content-profile-registry'
import type { SitePolicy } from '../policies/site-policy'
import type { SitePolicyRegistry } from '../policies/policy-registry'
import type { PreviewCard } from '../types/card'
import type { Provider } from '../types/classification'
import type {
  DynamicExtractor,
  DynamicExtractorOptions,
  ExtractedMetadata,
  PreviewOptions,
} from '../types/metadata'
import type {
  CapabilityState,
  ClassificationState,
} from '../policies/site-policy.types'

export interface PreviewPipelineState {
  inputUrl: string
  options: PreviewOptions

  normalizedUrl?: URL
  originalUrl?: string
  resolvedUrl?: URL
  initialProvider?: Provider
  provider?: Provider
  contentType?: string

  policyRegistry?: SitePolicyRegistry
  contentProfileRegistry?: ContentProfileRegistry
  activePolicies?: SitePolicy[]
  activeContentRules?: ContentExtractionRules

  fetchEnabled?: boolean
  dynamicFallback?: boolean
  dynamicExtractor?: DynamicExtractor
  dynamicOptions?: DynamicExtractorOptions

  metadata: ExtractedMetadata
  classification?: ClassificationState
  capability?: CapabilityState
  card?: PreviewCard
}
