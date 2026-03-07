import type { PageKind } from '../types/classification'
import { classifyUrlShape } from './url-classifier'
import type {
  PageKindInput,
  PageKindRule,
} from './page-kind-classifier.types'

const COLLECTION_PREFIXES = [
  '/tag/',
  '/tags/',
  '/category/',
  '/categories/',
  '/search',
  '/archive',
  '/topics/',
  '/collections/',
  '/list/',
]

const PROFILE_PREFIXES = [
  '/@',
  '/author/',
  '/profile/',
  '/users/',
  '/user/',
  '/member/',
]

const RULES: PageKindRule[] = [
  {
    id: 'root-homepage',
    test: (input) => classifyUrlShape(input.url) === 'root',
    output: 'homepage',
  },
  {
    id: 'collection-prefix',
    test: (input) => {
      const path = input.url.pathname.toLowerCase()
      return COLLECTION_PREFIXES.some((prefix) => path.startsWith(prefix))
    },
    output: 'collection',
  },
  {
    id: 'profile-prefix',
    test: (input) => {
      const path = input.url.pathname.toLowerCase()
      return PROFILE_PREFIXES.some((prefix) => path.startsWith(prefix))
    },
    output: 'profile',
  },
  {
    id: 'atomic-resource',
    test: (input) =>
      input.resourceType === 'video' ||
      input.resourceType === 'image' ||
      input.resourceType === 'audio' ||
      input.resourceType === 'article' ||
      input.resourceType === 'social',
    output: 'atomic',
  },
  {
    id: 'website-fallback',
    test: (input) => input.resourceType === 'website',
    output: 'unknown',
  },
]

export const classifyPageKind = (input: PageKindInput): PageKind => {
  for (const rule of RULES) {
    if (rule.test(input)) {
      return rule.output
    }
  }

  return 'unknown'
}

export type { PageKindInput } from './page-kind-classifier.types'
