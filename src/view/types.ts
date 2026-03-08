import type {
  ReaderBlock,
  ReaderRenderDocument,
  ReaderTreeNode,
} from '../types/metadata'

export interface ViewRenderContext {
  blocks: ReaderBlock[]
  title?: string
  tree?: ReaderTreeNode[]
  maxBlocks?: number
}

export interface ViewRenderResult {
  html: string
  document: ReaderRenderDocument
}

export interface ViewEngine {
  render(context: ViewRenderContext): ViewRenderResult
}
