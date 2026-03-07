import type { DynamicExtractorOptions } from '../../types/metadata'
import type { StaticExtractionContext } from './context'
import { ExtractorPipeline } from './extractor-pipeline'
import { StaticFallbackStage } from '../stages/static-fallback.stage'
import { StaticMergeStage } from '../stages/static-merge.stage'
import { StaticMetascraperStage } from '../stages/static-metascraper.stage'
import { StaticRecomposeStage } from '../stages/static-recompose.stage'

export const createDefaultStaticExtractorPipeline =
  (): ExtractorPipeline<StaticExtractionContext> => {
    return new ExtractorPipeline<StaticExtractionContext>([
      new StaticMetascraperStage(),
      new StaticRecomposeStage(),
      new StaticFallbackStage(),
      new StaticMergeStage(),
    ])
  }

export const createStaticExtractionContext = (
  html: string,
  url: string,
  options: DynamicExtractorOptions = {},
): StaticExtractionContext => ({
  html,
  url,
  options,
  metascraperMetadata: {},
  fallbackMetadata: {},
  metadata: {},
})

