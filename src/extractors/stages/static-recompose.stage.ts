import { recomposeReaderContent } from '../content-recomposer'
import type { StaticExtractionContext } from '../pipeline/context'
import { ExtractorStage } from '../pipeline/extractor-stage'

export class StaticRecomposeStage extends ExtractorStage<StaticExtractionContext> {
  public constructor() {
    super('static-recompose')
  }

  public async execute(
    context: StaticExtractionContext,
  ): Promise<StaticExtractionContext> {
    const titleHint =
      context.metascraperMetadata.title ??
      context.metascraperMetadata.siteName ??
      context.metascraperMetadata.author

    const recomposedContent = recomposeReaderContent(context.html, context.url, {
      source: 'static-html',
      captureMode: 'focused-body',
      focusMainContent: true,
      focusTitleRoot: true,
      titleHint,
      noiseKeywords: context.options.noiseKeywords,
      mainKeywords: context.options.mainKeywords,
      dropTags: context.options.dropTags,
    })

    return {
      ...context,
      recomposedContent,
    }
  }
}

