import { ContentProfile } from './content-profile'
import type { ContentExtractionRules, ContentProfileMatchInput } from './content-profile'

const YOUTUBE_HOST_PATTERN = /(^|\.)youtube\.com$|(^|\.)youtu\.be$/i
const NAVER_MAP_HOST_PATTERN = /(^|\.)map\.naver\.com$/i

const YOUTUBE_RULES: ContentExtractionRules = {
  mainSelectors: ['#primary', '#primary-inner', '#content', 'main', '[role="main"]'],
  removeSelectors: [
    '#masthead-container',
    '#guide',
    '#secondary',
    '#related',
    '#chat',
    'ytd-mini-guide-renderer',
    'ytd-merch-shelf-renderer',
  ],
  noiseKeywords: ['related', 'recommend', 'sidebar', 'shorts', 'ad', 'sponsored'],
  mainKeywords: ['content', 'description', 'watch', 'comment', '본문', '댓글'],
}

const NAVER_MAP_RULES: ContentExtractionRules = {
  focusTitleNearestBody: true,
  mainSelectors: ['#app', '#content', 'main', '[role="main"]', '[class*="place"]'],
  removeSelectors: [
    'header',
    'nav',
    'footer',
    '[class*="toolbar"]',
    '[class*="control"]',
    '[class*="floating"]',
  ],
  noiseKeywords: ['gnb', 'lnb', 'snb', 'menu', 'banner', 'ad', '광고', '추천'],
  mainKeywords: ['place', 'content', 'detail', 'panel', '본문', '리뷰', '주소'],
}

const isYouTubeHost = (host: string): boolean => {
  return YOUTUBE_HOST_PATTERN.test(host.toLowerCase())
}

const isNaverMapHost = (host: string): boolean => {
  return NAVER_MAP_HOST_PATTERN.test(host.toLowerCase())
}

export class YouTubeContentProfile extends ContentProfile {
  public constructor() {
    super('youtube-content', 120)
  }

  public matches(input: ContentProfileMatchInput): boolean {
    return input.provider === 'youtube' || isYouTubeHost(input.url.hostname)
  }

  public resolveRules(): ContentExtractionRules {
    return YOUTUBE_RULES
  }
}

export class NaverMapContentProfile extends ContentProfile {
  public constructor() {
    super('naver-map-content', 110)
  }

  public matches(input: ContentProfileMatchInput): boolean {
    return input.provider === 'naver' && isNaverMapHost(input.url.hostname)
  }

  public resolveRules(): ContentExtractionRules {
    return NAVER_MAP_RULES
  }
}

export const createDefaultContentProfiles = (): ContentProfile[] => {
  return [new YouTubeContentProfile(), new NaverMapContentProfile()]
}
