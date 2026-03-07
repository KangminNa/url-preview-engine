import { buildStaticFallbackMetadata } from '../static-metadata-utils'
import type { StaticExtractionContext } from '../pipeline/context'
import { ExtractorStage } from '../pipeline/extractor-stage'

export class StaticFallbackStage extends ExtractorStage<StaticExtractionContext> {
  public constructor() {
    super('static-fallback')
  }

  public async execute(
    context: StaticExtractionContext,
  ): Promise<StaticExtractionContext> {
    const fallbackMetadata = buildStaticFallbackMetadata(
      context.html,
      context.url,
      context.recomposedContent,
    )

    return {
      ...context,
      fallbackMetadata,
    }
  }
}
