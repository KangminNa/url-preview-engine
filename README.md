# url-preview-engine

`url-preview-engine`은 URL을 단순 metadata가 아닌 **interaction-aware preview card**로 정규화하는 TypeScript 엔진 패키지입니다.

핵심 목적:

- URL의 provider / resource type / page kind 판별
- embed / playback capability 판별
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
    truncated: false
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
