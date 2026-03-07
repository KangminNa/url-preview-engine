import type { ReaderBlock, ReaderRenderDocument } from '../types/metadata'

export interface ViewRenderContext {
  blocks: ReaderBlock[]
  title?: string
}

export interface ViewRenderResult {
  html: string
  document: ReaderRenderDocument
}

export interface ViewEngine {
  render(context: ViewRenderContext): ViewRenderResult
}
