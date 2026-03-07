import type { ContentExtractionRules } from './content-profile.types'

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

