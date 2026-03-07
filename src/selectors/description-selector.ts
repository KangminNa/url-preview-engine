import type { ExtractedMetadata } from '../types/metadata'

const clean = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined
  }

  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > 0 ? normalized : undefined
}

export const selectDescription = (
  metadata: ExtractedMetadata,
): string | undefined => {
  return clean(metadata.description)
}
