import type { EmbedCapabilityResult } from '../capabilities/embed-capability-detector'
import type {
  InteractionMode,
  PageKind,
  Provider,
  ResourceType,
} from '../types/classification'
import type { PreviewCard } from '../types/card'
import type {
  DynamicExtractorOptions,
  ExtractedMetadata,
} from '../types/metadata'

export interface ClassificationState {
  resourceType: ResourceType
  pageKind: PageKind
}

export interface CapabilityState extends EmbedCapabilityResult {
  playable: boolean
  interactionMode: InteractionMode
}

export interface SitePolicyMatchInput {
  url: URL
  provider: Provider
}

export interface PolicyDynamicOptionsInput {
  url: URL
  provider: Provider
  options: DynamicExtractorOptions
}

export interface PolicyMetadataInput {
  url: URL
  provider: Provider
  contentType?: string
  metadata: ExtractedMetadata
}

export interface PolicyClassificationInput {
  url: URL
  provider: Provider
  contentType?: string
  metadata: ExtractedMetadata
  classification: ClassificationState
}

export interface PolicyCapabilityInput {
  url: URL
  provider: Provider
  contentType?: string
  metadata: ExtractedMetadata
  classification: ClassificationState
  capability: CapabilityState
}

export interface PolicyCardInput {
  url: URL
  provider: Provider
  metadata: ExtractedMetadata
  classification: ClassificationState
  capability: CapabilityState
  card: PreviewCard
}

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
