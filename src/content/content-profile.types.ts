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

