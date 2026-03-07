import type { PageKind, ResourceType } from '../types/classification'

export interface PageKindInput {
  url: URL
  resourceType: ResourceType
}

export interface PageKindRule {
  id: string
  test: (input: PageKindInput) => boolean
  output: PageKind
}

