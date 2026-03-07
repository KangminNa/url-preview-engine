import type {
  DynamicExtractorOptions,
  ExtractedMetadata,
} from '../types/metadata'
import { extractWithPlaywright } from './playwright.extractor'

export const extractDynamicMetadata = async (
  url: string,
  options: DynamicExtractorOptions = {},
): Promise<ExtractedMetadata> => {
  return extractWithPlaywright(url, options)
}
