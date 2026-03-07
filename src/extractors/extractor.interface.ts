import type { ExtractedMetadata } from '../types/metadata'

export interface ExtractorInput {
  url: string
  html: string
}

export interface MetadataExtractor {
  extract(input: ExtractorInput): Promise<ExtractedMetadata>
}
