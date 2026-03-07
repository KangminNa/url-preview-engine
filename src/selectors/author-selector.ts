import type { ExtractedMetadata } from '../types/metadata'

export const selectAuthor = (metadata: ExtractedMetadata): string | undefined => {
  const author = metadata.author?.trim()
  return author && author.length > 0 ? author : undefined
}
