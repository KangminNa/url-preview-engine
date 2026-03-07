import type { Provider } from '../types/classification'
import {
  createDefaultContentProfiles,
} from './builtin-content-profiles'
import {
  mergeContentExtractionRules,
} from './content-profile'
import type {
  ContentExtractionRules,
  ContentProfile,
  ContentProfileMatchInput,
} from './content-profile'

export class ContentProfileRegistry {
  private readonly profiles: ContentProfile[]

  public constructor(profiles: ContentProfile[]) {
    this.profiles = [...profiles].sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority
      }

      return left.id.localeCompare(right.id)
    })
  }

  public resolve(url: URL, provider: Provider): ContentExtractionRules {
    const input: ContentProfileMatchInput = {
      url,
      provider,
    }

    return this.profiles.reduce<ContentExtractionRules>((resolved, profile) => {
      if (!profile.matches(input)) {
        return resolved
      }

      const profileRules = profile.resolveRules(input)
      return mergeContentExtractionRules(resolved, profileRules)
    }, {})
  }
}

export const createContentProfileRegistry = (
  overrides: ContentProfile[] = [],
): ContentProfileRegistry => {
  return new ContentProfileRegistry([
    ...overrides,
    ...createDefaultContentProfiles(),
  ])
}
