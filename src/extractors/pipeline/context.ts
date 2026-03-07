import type {
  DynamicExtractorOptions,
  ExtractedMetadata,
  ReaderContent,
  ReaderTreeNode,
} from '../../types/metadata'

export interface StaticExtractionContext {
  html: string
  url: string
  options: DynamicExtractorOptions
  metascraperMetadata: ExtractedMetadata
  recomposedContent?: ReaderContent
  fallbackMetadata: ExtractedMetadata
  metadata: ExtractedMetadata
}

export interface DynamicCaptureResult {
  resolvedUrl: string
  renderedHtml: string
  domTree?: ReaderTreeNode[]
}

export interface DynamicExtractionContext {
  inputUrl: string
  options: DynamicExtractorOptions
  capture?: DynamicCaptureResult
  renderedMetadata: ExtractedMetadata
  recomposedContent?: ReaderContent
  metadata: ExtractedMetadata
}

