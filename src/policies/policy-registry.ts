import type { Provider } from '../types/classification'
import { SitePolicy } from './site-policy'
import { NaverMapSitePolicy } from './naver-map-site-policy'
import { YouTubeSitePolicy } from './youtube-site-policy'

const DEFAULT_POLICIES: SitePolicy[] = [
  new YouTubeSitePolicy(),
  new NaverMapSitePolicy(),
]

export class SitePolicyRegistry {
  private readonly policies: SitePolicy[]

  public constructor(policies: SitePolicy[]) {
    this.policies = [...policies].sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority
      }

      return left.id.localeCompare(right.id)
    })
  }

  public resolve(url: URL, provider: Provider): SitePolicy[] {
    return this.policies.filter((policy) =>
      policy.matches({
        url,
        provider,
      }),
    )
  }
}

export const createPolicyRegistry = (
  overrides: SitePolicy[] = [],
): SitePolicyRegistry => {
  return new SitePolicyRegistry([...overrides, ...DEFAULT_POLICIES])
}
