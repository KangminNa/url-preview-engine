# url-preview-engine

`url-preview-engine`은 URL을 단순 metadata가 아닌 **interaction-aware preview card**로 정규화하는 TypeScript 엔진 패키지입니다.

핵심 목적:

- URL의 provider / resource type / page kind 판별
- embed / playback capability 판별
- 사이트별 main-content 추출 전략 적용
- 추출 품질 점수 기반으로 더 나은 콘텐츠 선택
- UI가 바로 소비할 수 있는 render contract 반환

## One-liner

URL을 입력받아, 가능한 경우 카드 내부에서 직접 소비 가능한 임베드/재생 가능한 preview card object로 변환한다.

## MVP Scope

1순위:

- YouTube (watch/shorts/embed 중심)
- 일반 article/blog 페이지
- 직접 이미지 URL

2순위:

- Instagram
- Vimeo
- 직접 오디오 링크

## Card Axes

엔진은 최소 4축을 판단합니다.

1. `provider`
2. `resourceType`
3. `pageKind`
4. `interactionMode`

### Types

```ts
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
```

## API

```ts
import { preview } from 'url-preview-engine'

const card = await preview('https://www.youtube.com/watch?v=abc123')
```

예상 출력:

```ts
{
  provider: 'youtube',
  resourceType: 'video',
  pageKind: 'atomic',
  title: '...',
  embeddable: true,
  playable: true,
  interactionMode: 'embeddable',
  embedUrl: 'https://www.youtube.com/embed/abc123',
  snapshot: {
    language: 'ko',
    estimatedReadingMinutes: 3,
    keywords: ['preview', 'engine'],
    highlights: ['핵심 문장 1', '핵심 문장 2']
  },
  content: {
    html: '<h1>...</h1><p>...</p>',
    text: '본문 텍스트 ...',
    blockCount: 24,
    truncated: false,
    quality: {
      score: 82,
      grade: 'excellent'
    }
  }
}
```

YouTube 홈:

```ts
await preview('https://www.youtube.com/')

// => {
//   provider: 'youtube',
//   resourceType: 'website',
//   pageKind: 'homepage',
//   embeddable: false,
//   playable: false,
//   interactionMode: 'static'
// }
```

## Pipeline

```text
URL Input
  -> URL Normalize
  -> HTTP Fetch
  -> Static Extract
  -> Dynamic Extract (optional)
  -> Content Profile Resolve (site-specific extraction strategy)
  -> Content Quality Evaluate / Better-content select
  -> Provider Classify
  -> ResourceType Classify
  -> PageKind Classify
  -> Embed/Playback Capability Detect
  -> Interaction Mode Resolve
  -> Field Select
  -> Card Compress
  -> Render Contract Return
```

## Architecture

```text
src/
  core/
  content/
  fetchers/
  extractors/
  classifiers/
  capabilities/
  selectors/
  compressors/
  normalizers/
  schemas/
  types/
```

핵심 신규 모듈:

- `capabilities/embed-capability-detector.ts`
- `capabilities/playback-capability-detector.ts`
- `capabilities/interaction-mode-resolver.ts`
- `content/content-profile.ts`
- `content/content-profile-registry.ts`
- `content/content-quality-evaluator.ts`

## Design Patterns

- `Template Method`: `SitePolicy` 훅으로 분류/능력/카드 보정
- `Strategy`: `ContentProfile`로 사이트별 본문 추출 규칙 주입
- `Chain of Responsibility`: `ContentProfileRegistry`가 우선순위대로 규칙 병합

## Package Structure

```text
core/
  preview-engine.ts          # 전체 파이프라인 오케스트레이션
content/
  content-profile.ts         # 사이트별 추출 전략 계약(Strategy)
  builtin-content-profiles.ts
  content-profile-registry.ts
  content-quality-evaluator.ts
extractors/
  static.extractor.ts        # 정적 HTML 추출
  playwright.extractor.ts    # 동적 DOM 추출
  content-recomposer.ts      # tree -> blocks/html/renderDocument + quality
policies/
  site-policy.ts             # 사이트별 capability/classification 보정
view/
  default-view-engine.ts     # blocks -> index.html/css 렌더
```

## 더 디테일한 Preview를 얻는 방법

1. `contentProfiles`로 사이트별 규칙 추가
2. `mainSelectors/removeSelectors`로 본문 루트와 노이즈 영역 명시
3. `mainKeywords/noiseKeywords/dropTags`로 본문/잡음 점수 튜닝
4. `dynamicFallback: true` 유지해 정적 실패 시 동적 DOM 보강
5. `card.content.quality`를 보고 UI에서 low-score fallback 처리

예시:

```ts
import { ContentProfile, preview } from 'url-preview-engine'

class BlogProfile extends ContentProfile {
  constructor() {
    super('blog-profile', 300)
  }

  matches({ provider }) {
    return provider === 'example'
  }

  resolveRules() {
    return {
      mainSelectors: ['main article', '#content'],
      removeSelectors: ['header', 'footer', '.related', '.ad'],
      mainKeywords: ['본문', 'article', 'content'],
      noiseKeywords: ['추천', '광고', 'ranking', 'sidebar'],
      dropTags: ['nav', 'aside'],
    }
  }
}

const card = await preview('https://example.com/post/1', {
  contentProfiles: [new BlogProfile()],
  dynamicFallback: true,
})
```

## Non-goals

- 모든 URL 강제 embed
- provider 정책 우회 렌더링
- 원본 페이지 복제
- 서비스 UI/피드/저장 기능

## Development

```bash
npm run build
npm run test:run
```

## Local Demo

```bash
npm run demo
```

브라우저에서 `http://localhost:4173` 접속 후 URL을 입력하면, 카드 렌더링 결과와 raw JSON을 동시에 확인할 수 있습니다.

데모에는 오픈소스(`metascraper`, `open-graph-scraper`, `link-preview-js`) 비교 패널도 포함되어 있습니다.

## Testing

```bash
# watch mode
npm test

# 전체 테스트 1회 실행
npm run test:run

# 단위 테스트만
npm run test:unit

# 통합 테스트만 (mocked fetch 기반)
npm run test:integration

# 테스트 코드 타입체크
npm run typecheck:test

# 커버리지 리포트
npm run test:coverage
```

## License

MIT
