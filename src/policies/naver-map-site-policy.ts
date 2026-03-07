import { SitePolicy } from './site-policy'
import type {
  CapabilityState,
  PolicyCapabilityInput,
  SitePolicyMatchInput,
} from './site-policy'

const NAVER_MAP_HOST_PATTERN = /(^|\.)map\.naver\.com$/i

const isNaverMapUrl = (url: URL): boolean => {
  return NAVER_MAP_HOST_PATTERN.test(url.hostname.toLowerCase())
}

const isEmbeddableUrl = (value: string | undefined): boolean => {
  if (!value) {
    return false
  }

  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export class NaverMapSitePolicy extends SitePolicy {
  public constructor() {
    super('naver-map', 110)
  }

  public matches(input: SitePolicyMatchInput): boolean {
    return input.provider === 'naver' && isNaverMapUrl(input.url)
  }

  public refineCapability(input: PolicyCapabilityInput): CapabilityState {
    if (!isNaverMapUrl(input.url)) {
      return input.capability
    }

    const embedUrl = input.metadata.playerUrl
    if (!isEmbeddableUrl(embedUrl)) {
      return input.capability
    }

    return {
      ...input.capability,
      embeddable: true,
      embedUrl,
      interactionMode: 'embeddable',
    }
  }
}
