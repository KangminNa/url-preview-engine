import { mergeStaticMetadata } from '../static-metadata-utils'
import type { StaticExtractionContext } from '../pipeline/context'
import { ExtractorStage } from '../pipeline/extractor-stage'

export class StaticMergeStage extends ExtractorStage<StaticExtractionContext> {
  public constructor() {
    super('static-merge')
  }

  public async execute(
    context: StaticExtractionContext,
  ): Promise<StaticExtractionContext> {
    const metadata = mergeStaticMetadata(
      context.metascraperMetadata,
      context.fallbackMetadata,
    )

    return {
      ...context,
      metadata,
    }
  }
}

