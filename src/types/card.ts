import type {
  InteractionMode,
  PageKind,
  Provider,
  ResourceType,
} from './classification'
import type { ContentSnapshot, ReaderContent } from './metadata'

export interface BaseCard {
  originalUrl: string
  resolvedUrl: string
  canonicalUrl?: string

  provider: Provider
  resourceType: ResourceType
  pageKind: PageKind

  title?: string
  description?: string
  imageUrl?: string
  siteName?: string
  author?: string
  publishedAt?: string
  snapshot?: ContentSnapshot
  content?: ReaderContent

  embeddable: boolean
  playable: boolean
  interactionMode: InteractionMode
}

export interface VideoCard extends BaseCard {
  resourceType: 'video'
  interactionMode: 'playable' | 'embeddable'
  embedUrl?: string
  duration?: number
}

export interface ArticleCard extends BaseCard {
  resourceType: 'article'
  interactionMode: 'expandable' | 'embeddable' | 'static'
  embedUrl?: string
  excerpt?: string
}

export interface ImageCard extends BaseCard {
  resourceType: 'image'
  interactionMode: 'playable'
  originalMediaUrl?: string
}

export interface AudioCard extends BaseCard {
  resourceType: 'audio'
  interactionMode: 'playable'
  originalMediaUrl?: string
}

export interface GenericCard extends BaseCard {
  resourceType: 'social' | 'website' | 'unknown'
  embedUrl?: string
}

export type PreviewCard =
  | VideoCard
  | ArticleCard
  | ImageCard
  | AudioCard
  | GenericCard
