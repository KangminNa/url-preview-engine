import { extractWithMetascraper } from '../metascraper.extractor'
import type { StaticExtractionContext } from '../pipeline/context'
import { ExtractorStage } from '../pipeline/extractor-stage'

export class StaticMetascraperStage extends ExtractorStage<StaticExtractionContext> {
  public constructor() {
    super('static-metascraper')
  }

  public async execute(
    context: StaticExtractionContext,
  ): Promise<StaticExtractionContext> {
    const metascraperMetadata = await extractWithMetascraper(
      context.html,
      context.url,
    )

    return {
      ...context,
      metascraperMetadata,
    }
  }
}

