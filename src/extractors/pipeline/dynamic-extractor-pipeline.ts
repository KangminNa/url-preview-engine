import type { DynamicExtractorOptions } from '../../types/metadata'
import type { DynamicExtractionContext } from './context'
import { ExtractorPipeline } from './extractor-pipeline'
import { DynamicCaptureStage } from '../stages/dynamic-capture.stage'
import { DynamicMergeStage } from '../stages/dynamic-merge.stage'
import { DynamicRecomposeStage } from '../stages/dynamic-recompose.stage'
import { DynamicRenderedStaticStage } from '../stages/dynamic-rendered-static.stage'

export const createDefaultDynamicExtractorPipeline =
  (): ExtractorPipeline<DynamicExtractionContext> => {
    return new ExtractorPipeline<DynamicExtractionContext>([
      new DynamicCaptureStage(),
      new DynamicRenderedStaticStage(),
      new DynamicRecomposeStage(),
      new DynamicMergeStage(),
    ])
  }

export const createDynamicExtractionContext = (
  inputUrl: string,
  options: DynamicExtractorOptions = {},
): DynamicExtractionContext => ({
  inputUrl,
  options,
  renderedMetadata: {},
  metadata: {},
})

