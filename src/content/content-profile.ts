import type { Provider } from '../types/classification'

export interface ContentProfileMatchInput {
  url: URL
  provider: Provider
}

export interface ContentExtractionRules {
  focusTitleNearestBody?: boolean
  timeoutMs?: number
  maxScrollSteps?: number
  scrollDelayMs?: number
  mainSelectors?: string[]
  removeSelectors?: string[]
  noiseKeywords?: string[]
  mainKeywords?: string[]
  dropTags?: string[]
}

const mergeUnique = (
  base: string[] | undefined,
  extra: string[] | undefined,
): string[] | undefined => {
  if (!base && !extra) {
    return undefined
  }

  return Array.from(new Set([...(base ?? []), ...(extra ?? [])]))
}

export const mergeContentExtractionRules = (
  base: ContentExtractionRules,
  extra: ContentExtractionRules,
): ContentExtractionRules => {
  return {
    focusTitleNearestBody:
      base.focusTitleNearestBody ?? extra.focusTitleNearestBody,
    timeoutMs: base.timeoutMs ?? extra.timeoutMs,
    maxScrollSteps: base.maxScrollSteps ?? extra.maxScrollSteps,
    scrollDelayMs: base.scrollDelayMs ?? extra.scrollDelayMs,
    mainSelectors: mergeUnique(base.mainSelectors, extra.mainSelectors),
    removeSelectors: mergeUnique(base.removeSelectors, extra.removeSelectors),
    noiseKeywords: mergeUnique(base.noiseKeywords, extra.noiseKeywords),
    mainKeywords: mergeUnique(base.mainKeywords, extra.mainKeywords),
    dropTags: mergeUnique(base.dropTags, extra.dropTags),
  }
}

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
