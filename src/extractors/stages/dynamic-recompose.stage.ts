import {
  recomposeReaderContent,
  recomposeReaderContentFromTree,
} from '../content-recomposer'
import type { DynamicExtractionContext } from '../pipeline/context'
import { ExtractorStage } from '../pipeline/extractor-stage'

const MAX_DYNAMIC_HTML_LENGTH = 260_000
const MAX_DYNAMIC_TEXT_LENGTH = 180_000
const MAX_DYNAMIC_BLOCKS = 1_200

export class DynamicRecomposeStage extends ExtractorStage<DynamicExtractionContext> {
  public constructor() {
    super('dynamic-recompose')
  }

  public async execute(
    context: DynamicExtractionContext,
  ): Promise<DynamicExtractionContext> {
    if (!context.capture) {
      return context
    }

    const titleHint = context.options.titleHint ?? context.renderedMetadata.title
    const baseOptions = {
      source: 'dynamic-dom' as const,
      captureMode: 'focused-body' as const,
      focusMainContent: true,
      focusTitleRoot: true,
      titleHint,
      maxHtmlLength: MAX_DYNAMIC_HTML_LENGTH,
      maxTextLength: MAX_DYNAMIC_TEXT_LENGTH,
      maxBlocks: MAX_DYNAMIC_BLOCKS,
      minTextLength: 80,
      noiseKeywords: context.options.noiseKeywords,
      mainKeywords: context.options.mainKeywords,
      dropTags: context.options.dropTags,
    }

    const recomposedContent = context.capture.domTree
      ? recomposeReaderContentFromTree(
          context.capture.domTree,
          context.capture.resolvedUrl,
          baseOptions,
        )
      : recomposeReaderContent(
          context.capture.renderedHtml,
          context.capture.resolvedUrl,
          baseOptions,
        )

    return {
      ...context,
      recomposedContent,
    }
  }
}

