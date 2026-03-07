import {
  mergeDynamicMetadata,
  resolveExcerptFromText,
} from '../static-metadata-utils'
import type { DynamicExtractionContext } from '../pipeline/context'
import { ExtractorStage } from '../pipeline/extractor-stage'

export class DynamicMergeStage extends ExtractorStage<DynamicExtractionContext> {
  public constructor() {
    super('dynamic-merge')
  }

  public async execute(
    context: DynamicExtractionContext,
  ): Promise<DynamicExtractionContext> {
    if (!context.capture) {
      return context
    }

    if (!context.recomposedContent) {
      return {
        ...context,
        metadata: context.renderedMetadata,
      }
    }

    const metadata = mergeDynamicMetadata(
      {
        content: context.recomposedContent,
        excerpt: resolveExcerptFromText(context.recomposedContent.text),
      },
      context.renderedMetadata,
    )

    return {
      ...context,
      metadata,
    }
  }
}

