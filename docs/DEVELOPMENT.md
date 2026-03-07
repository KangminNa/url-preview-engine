# 개발 문서

## 엔진 개요

`url-preview-engine`은 URL을 입력받아 extraction 결과를 분류/판단하고, interaction-aware preview card로 정규화하는 TypeScript 패키지다.

## 처리 흐름

```text
URL
-> normalize
-> fetch
-> static extract
-> dynamic extract (optional)
-> provider classify
-> resourceType classify
-> pageKind classify
-> embed capability detect
-> playback capability detect
-> interaction mode resolve
-> select
-> compress
-> normalize
-> Preview Card
```

## 모듈 구조

```text
src/
  core/
    preview-engine.ts
    preview-factory.ts

  fetchers/
    url-normalizer.ts
    html-fetcher.ts

  extractors/
    static.extractor.ts
    dynamic.extractor.ts
    metascraper.extractor.ts
    playwright.extractor.ts

  classifiers/
    provider-classifier.ts
    resource-type-classifier.ts
    page-kind-classifier.ts
    url-classifier.ts

  capabilities/
    embed-capability-detector.ts
    playback-capability-detector.ts
    interaction-mode-resolver.ts

  selectors/
  compressors/
  normalizers/
  schemas/
  types/
```

## Capability 레이어

### `embed-capability-detector.ts`

판단 기준:

- provider 허용 목록
- URL 패턴 기반 embed URL 생성 가능성
- pageKind가 atomic인지 여부

MVP 구현:

- YouTube watch/shorts/embed -> embed URL 생성
- Vimeo numeric path -> embed URL 생성

### `playback-capability-detector.ts`

판단 기준:

- direct media URL 여부
- MIME type(video/audio/image)
- embeddable video 여부

### `interaction-mode-resolver.ts`

결정 우선순위:

1. `embeddable`
2. `playable`
3. `expandable` (article + atomic)
4. `static`

## 카드 계약

```ts
interface BaseCard {
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
  embeddable: boolean
  playable: boolean
  interactionMode: InteractionMode
}
```

## 압축 규칙 (MVP)

- `title`: 1개, 길이 제한
- `description`: 1개, 길이 제한
- `image`: 최대 1개
- `author`: 최대 1명
- `excerpt`: 길이 제한
- `embed`: 최대 1개

## 오픈소스 역할

- `metascraper*`: 정적 metadata 후보 수집
- `zod`: 카드 계약 런타임 검증
- `playwright`(선택): 동적 렌더 fallback

## 현재 구현 상태

완료:

- 타입/스키마
- 분류기(provider/resourceType/pageKind)
- capability detector 3종
- preview 오케스트레이션
- 카드 normalizer/compressor

## 테스트 환경

- 테스트 러너: `vitest`
- 설정 파일: `vitest.config.ts`
- 공통 setup: `tests/setup.ts`
- 테스트 타입체크: `tsconfig.test.json`
- 통합 테스트 방식: `global fetch` mock 기반 응답 시뮬레이션

실행 명령:

1. `npm test` (watch)
2. `npm run test:run`
3. `npm run test:unit`
4. `npm run test:integration`
5. `npm run typecheck:test`
6. `npm run test:coverage`

다음 단계:

1. Playwright 동적 추출 실구현
2. provider별 규칙 고도화(Instagram/oEmbed 등)
3. 테스트 픽스처와 회귀 테스트 추가
