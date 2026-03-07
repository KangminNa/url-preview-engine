import { captureWithPlaywright } from '../playwright-runtime'
import type { DynamicExtractionContext } from '../pipeline/context'
import { ExtractorStage } from '../pipeline/extractor-stage'

export class DynamicCaptureStage extends ExtractorStage<DynamicExtractionContext> {
  public constructor() {
    super('dynamic-capture')
  }

  public async execute(
    context: DynamicExtractionContext,
  ): Promise<DynamicExtractionContext> {
    const capture = await captureWithPlaywright(context.inputUrl, context.options)

    return {
      ...context,
      capture,
    }
  }
}

