import type { SitePolicy } from '../policies/site-policy'
import type { ContentProfile } from '../content/content-profile'

export interface ContentSnapshot {
  language?: string
  faviconUrl?: string
  estimatedReadingMinutes?: number
  wordCount?: number
  keywords?: string[]
  highlights?: string[]
}

export interface ReaderTreeTextNode {
  kind: 'text'
  text: string
}

export interface ReaderTreeElementNode {
  kind: 'element'
  tagName: string
  attrs?: Record<string, string | true>
  children: ReaderTreeNode[]
}

export type ReaderTreeNode = ReaderTreeTextNode | ReaderTreeElementNode

export interface ReaderTextBlock {
  type: 'text'
  text: string
}

export interface ReaderImageBlock {
  type: 'image'
  src: string
  alt?: string
}

export interface ReaderVideoBlock {
  type: 'video'
  src: string
  poster?: string
}

export interface ReaderIframeBlock {
  type: 'iframe'
  src: string
  title?: string
}

export type ReaderBlock =
  | ReaderTextBlock
  | ReaderImageBlock
  | ReaderVideoBlock
  | ReaderIframeBlock

export interface ReaderRenderDocument {
  indexHtml: string
  css: string
}

export interface ReaderContentQualitySignals {
  textLength: number
  blockCount: number
  mediaCount: number
  treeNodeCount?: number
  titleSimilarity: number
  noiseRatio: number
  mainKeywordHits: number
  truncated: boolean
}

export interface ReaderContentQuality {
  score: number
  grade: 'poor' | 'fair' | 'good' | 'excellent'
  signals: ReaderContentQualitySignals
}

export interface ReaderContent {
  html: string
  text: string
  blockCount: number
  truncated: boolean
  quality?: ReaderContentQuality
  blocks?: ReaderBlock[]
  renderDocument?: ReaderRenderDocument
  tree?: ReaderTreeNode[]
  treeNodeCount?: number
  source?: 'dynamic-dom' | 'static-html'
  captureMode?: 'full-body' | 'focused-body'
}

export interface ExtractedMetadata {
  title?: string
  description?: string
  imageUrl?: string
  siteName?: string
  author?: string
  publishedAt?: string
  canonicalUrl?: string
  excerpt?: string
  duration?: number
  mimeType?: string
  ogType?: string
  oEmbedUrl?: string
  playerUrl?: string
  snapshot?: ContentSnapshot
  content?: ReaderContent
}

export interface FetchResult {
  resolvedUrl: string
  status?: number
  headers?: Record<string, string>
  contentType?: string
  html?: string
}

export interface PreviewOptions {
  fetchHtml?: boolean
  dynamicFallback?: boolean
  userAgent?: string
  dynamicOptions?: DynamicExtractorOptions
  dynamicExtractor?: DynamicExtractor
  sitePolicies?: SitePolicy[]
  contentProfiles?: ContentProfile[]
}

export interface DynamicExtractorOptions {
  userAgent?: string
  timeoutMs?: number
  maxScrollSteps?: number
  scrollDelayMs?: number
  titleHint?: string
  focusTitleNearestBody?: boolean
  mainSelectors?: string[]
  removeSelectors?: string[]
  noiseKeywords?: string[]
  mainKeywords?: string[]
  dropTags?: string[]
}

export type DynamicExtractor = (
  url: string,
  options?: DynamicExtractorOptions,
) => Promise<ExtractedMetadata>
