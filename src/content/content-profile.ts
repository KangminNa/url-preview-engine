import type {
  ContentExtractionRules,
  ContentProfileMatchInput,
} from './content-profile.types'

export abstract class ContentProfile {
  public readonly id: string
  public readonly priority: number

  protected constructor(id: string, priority = 0) {
    this.id = id
    this.priority = priority
  }

  public abstract matches(input: ContentProfileMatchInput): boolean

  public resolveRules(
    input: ContentProfileMatchInput,
  ): ContentExtractionRules {
    void input
    return {}
  }
}

export type {
  ContentExtractionRules,
  ContentProfileMatchInput,
} from './content-profile.types'
