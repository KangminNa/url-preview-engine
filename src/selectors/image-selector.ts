import type { ExtractedMetadata } from '../types/metadata'

export const selectImageUrl = (
  metadata: ExtractedMetadata,
): string | undefined => {
  if (!metadata.imageUrl) {
    return undefined
  }

  const cleaned = metadata.imageUrl.trim()
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    return cleaned
  }

  return undefined
}
