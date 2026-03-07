import type { PreviewCard } from '../types/card'
import type {
  DynamicExtractorOptions,
  ExtractedMetadata,
} from '../types/metadata'
import type {
  CapabilityState,
  ClassificationState,
  PolicyCapabilityInput,
  PolicyCardInput,
  PolicyClassificationInput,
  PolicyDynamicOptionsInput,
  PolicyMetadataInput,
  SitePolicyMatchInput,
} from './site-policy.types'

export abstract class SitePolicy {
  public readonly id: string
  public readonly priority: number

  protected constructor(id: string, priority = 0) {
    this.id = id
    this.priority = priority
  }

  public abstract matches(input: SitePolicyMatchInput): boolean

  public resolveDynamicOptions(
    input: PolicyDynamicOptionsInput,
  ): DynamicExtractorOptions {
    return input.options
  }

  public refineMetadata(input: PolicyMetadataInput): ExtractedMetadata {
    return input.metadata
  }

  public refineClassification(
    input: PolicyClassificationInput,
  ): ClassificationState {
    return input.classification
  }

  public refineCapability(input: PolicyCapabilityInput): CapabilityState {
    return input.capability
  }

  public refineCard(input: PolicyCardInput): PreviewCard {
    return input.card
  }
}

export type {
  CapabilityState,
  ClassificationState,
  PolicyCapabilityInput,
  PolicyCardInput,
  PolicyClassificationInput,
  PolicyDynamicOptionsInput,
  PolicyMetadataInput,
  SitePolicyMatchInput,
} from './site-policy.types'
