import type {
  DynamicExtractorOptions,
  ExtractedMetadata,
} from '../types/metadata'
import {
  createDefaultStaticExtractorPipeline,
  createStaticExtractionContext,
} from './pipeline/static-extractor-pipeline'

const defaultStaticExtractorPipeline = createDefaultStaticExtractorPipeline()

export const extractStaticMetadata = async (
  html: string,
  url: string,
  options: DynamicExtractorOptions = {},
): Promise<ExtractedMetadata> => {
  const context = await defaultStaticExtractorPipeline.run(
    createStaticExtractionContext(html, url, options),
  )
  return context.metadata
}
