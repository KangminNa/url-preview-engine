export type Provider = string

export type ResourceType =
  | 'video'
  | 'social'
  | 'article'
  | 'image'
  | 'audio'
  | 'website'
  | 'unknown'

export type PageKind =
  | 'atomic'
  | 'homepage'
  | 'collection'
  | 'profile'
  | 'unknown'

export type InteractionMode =
  | 'static'
  | 'expandable'
  | 'playable'
  | 'embeddable'
