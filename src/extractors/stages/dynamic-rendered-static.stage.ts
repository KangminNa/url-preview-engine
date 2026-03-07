import { extractStaticMetadata } from '../static.extractor'
import type { DynamicExtractionContext } from '../pipeline/context'
import { ExtractorStage } from '../pipeline/extractor-stage'

export class DynamicRenderedStaticStage extends ExtractorStage<DynamicExtractionContext> {
  public constructor() {
    super('dynamic-rendered-static')
  }

  public async execute(
    context: DynamicExtractionContext,
  ): Promise<DynamicExtractionContext> {
    if (!context.capture) {
      return context
    }

    const renderedMetadata = await extractStaticMetadata(
      context.capture.renderedHtml,
      context.capture.resolvedUrl,
    )

    return {
      ...context,
      renderedMetadata,
    }
  }
}

