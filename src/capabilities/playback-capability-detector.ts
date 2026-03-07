import type { ResourceType } from '../types/classification'

export interface PlaybackCapabilityInput {
  resolvedUrl: URL
  resourceType: ResourceType
  contentType?: string
  embeddable: boolean
}

const directMediaPlayable = (
  url: URL,
  contentType: string | undefined,
  resourceType: ResourceType,
): boolean => {
  if (resourceType === 'image' || resourceType === 'audio') {
    return true
  }

  if (resourceType === 'video' && contentType?.toLowerCase().includes('video/')) {
    return true
  }

  const pathname = url.pathname.toLowerCase()
  if (resourceType === 'video') {
    return ['.mp4', '.webm', '.mov', '.m4v', '.ogv'].some((ext) =>
      pathname.endsWith(ext),
    )
  }

  return false
}

export const detectPlaybackCapability = ({
  resolvedUrl,
  resourceType,
  contentType,
  embeddable,
}: PlaybackCapabilityInput): boolean => {
  if (embeddable && resourceType === 'video') {
    return true
  }

  return directMediaPlayable(resolvedUrl, contentType, resourceType)
}
