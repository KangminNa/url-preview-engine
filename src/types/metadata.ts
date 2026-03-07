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

export type ReaderBlock = ReaderTextBlock | ReaderImageBlock

export interface ReaderContent {
  html: string
  text: string
  blockCount: number
  truncated: boolean
  blocks?: ReaderBlock[]
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
}

export interface DynamicExtractorOptions {
  userAgent?: string
  timeoutMs?: number
  maxScrollSteps?: number
  scrollDelayMs?: number
}

export type DynamicExtractor = (
  url: string,
  options?: DynamicExtractorOptions,
) => Promise<ExtractedMetadata>
