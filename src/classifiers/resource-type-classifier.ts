import type { ResourceType } from '../types/classification'
import type { ExtractedMetadata } from '../types/metadata'
import { classifyUrlShape, isLikelyArticlePath } from './url-classifier'
import type {
  ResourceTypeInput,
  ResourceTypeRule,
} from './resource-type-classifier.types'

const isContentType = (contentType: string | undefined, target: string): boolean => {
  if (!contentType) {
    return false
  }

  return contentType.toLowerCase().includes(target)
}

const hasAnyMetadataSignal = (metadata: ExtractedMetadata): boolean => {
  return Boolean(
    metadata.ogType ||
      metadata.description ||
      metadata.excerpt ||
      metadata.content?.text ||
      metadata.snapshot?.wordCount ||
      metadata.title,
  )
}

const metadataSuggestsArticle = (metadata: ExtractedMetadata): boolean => {
  const ogType = metadata.ogType?.toLowerCase()
  if (ogType) {
    if (ogType.includes('article')) {
      return true
    }

    if (
      ogType.includes('website') ||
      ogType.includes('profile') ||
      ogType.includes('video') ||
      ogType.includes('music')
    ) {
      return false
    }
  }

  if ((metadata.content?.text?.length ?? 0) >= 220) {
    return true
  }

  if ((metadata.description?.length ?? 0) >= 140) {
    return true
  }

  if ((metadata.excerpt?.length ?? 0) >= 140) {
    return true
  }

  if ((metadata.snapshot?.wordCount ?? 0) >= 180) {
    return true
  }

  return false
}

const RULES: ResourceTypeRule[] = [
  {
    id: 'direct-image',
    test: (input) =>
      classifyUrlShape(input.url) === 'direct-image' ||
      isContentType(input.contentType, 'image/'),
    output: 'image',
  },
  {
    id: 'direct-audio',
    test: (input) =>
      classifyUrlShape(input.url) === 'direct-audio' ||
      isContentType(input.contentType, 'audio/'),
    output: 'audio',
  },
  {
    id: 'direct-video',
    test: (input) =>
      classifyUrlShape(input.url) === 'direct-video' ||
      isContentType(input.contentType, 'video/'),
    output: 'video',
  },
  {
    id: 'og-social',
    test: (input) => {
      const ogType = input.metadata.ogType?.toLowerCase()
      return ogType?.includes('profile') || ogType?.includes('social') || false
    },
    output: 'social',
  },
  {
    id: 'og-article',
    test: (input) => {
      const ogType = input.metadata.ogType?.toLowerCase()
      return ogType?.includes('article') ?? false
    },
    output: 'article',
  },
  {
    id: 'article-path',
    test: (input) =>
      isLikelyArticlePath(input.url.pathname) &&
      (metadataSuggestsArticle(input.metadata) ||
        !hasAnyMetadataSignal(input.metadata)),
    output: 'article',
  },
  {
    id: 'root-website',
    test: (input) => input.url.pathname === '/' || input.url.pathname === '',
    output: 'website',
  },
]

export const classifyResourceType = (input: ResourceTypeInput): ResourceType => {
  for (const rule of RULES) {
    if (rule.test(input)) {
      return rule.output
    }
  }

  const urlShape = classifyUrlShape(input.url)
  if (urlShape === 'path-document') {
    return 'website'
  }

  return 'unknown'
}

export type { ResourceTypeInput } from './resource-type-classifier.types'
