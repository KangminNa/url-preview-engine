import type {
  DynamicExtractorOptions,
  ExtractedMetadata,
} from '../types/metadata'
import {
  createDefaultDynamicExtractorPipeline,
  createDynamicExtractionContext,
} from './pipeline/dynamic-extractor-pipeline'

const defaultDynamicExtractorPipeline = createDefaultDynamicExtractorPipeline()

export const extractWithPlaywright = async (
  url: string,
  options: DynamicExtractorOptions = {},
): Promise<ExtractedMetadata> => {
  const context = await defaultDynamicExtractorPipeline.run(
    createDynamicExtractionContext(url, options),
  )
  return context.metadata
}
