# 개발 문서

## 프로젝트 개요

`url-preview-engine`은 URL을 입력받아, 정적 HTML과 동적 렌더링 결과를 해석하고, 정규화된 preview card object를 반환하는 TypeScript 기반 엔진 패키지다.

## 처리 파이프라인

```
URL
→ normalize
→ fetch
→ static extract
→ dynamic extract (optional)
→ classify
→ select
→ compress
→ normalize
→ Preview Card Object
```

## 기술적 문제 정의

웹페이지는 크게 두 가지 방식으로 해석해야 한다.

### 1. 정적 렌더링 페이지

초기 HTML에 충분한 정보가 존재한다.

**예시:**
- OGP가 잘 구성된 블로그
- SSR 기반 뉴스/기사
- canonical / JSON-LD가 포함된 페이지

### 2. 동적 렌더링 페이지

초기 HTML에는 정보가 부족하고, JS 실행 후 DOM이 완성된다.

**예시:**
- SPA
- CSR 페이지
- hydration 이후 콘텐츠가 붙는 서비스

따라서 엔진은 두 경로를 모두 가져야 한다:

- **Static Extraction Path**
- **Dynamic Rendering Path**

## 시스템 처리 흐름

1. URL 입력
2. URL normalize
3. HTTP fetch
4. response type 판별
5. static extraction 시도
6. 필요 시 dynamic rendering 수행
7. provider classification
8. resource type / page kind classification
9. field selection
10. card compression
11. card normalization
12. preview card object 반환

## 핵심 아키텍처 모듈

### core

엔진의 진입점과 오케스트레이션 담당

- `preview-engine.ts` - 메인 엔진 로직
- `preview-factory.ts` - 카드 팩토리

### fetchers

입력 URL과 HTTP 응답 처리

- `url-normalizer.ts` - URL 정규화
- `html-fetcher.ts` - HTTP 요청 및 응답 처리

### extractors

정적/동적 추출 계층

- `extractor.interface.ts` - 추출기 인터페이스
- `static.extractor.ts` - 정적 추출 오케스트레이터
- `dynamic.extractor.ts` - 동적 추출 오케스트레이터
- `metascraper.extractor.ts` - metascraper 기반 추출
- `playwright.extractor.ts` - Playwright 기반 동적 추출

### classifiers

리소스 분류 계층

- `provider-classifier.ts` - provider 판별
- `url-classifier.ts` - URL 패턴 기반 분류
- `page-kind-classifier.ts` - 페이지 종류 분류
- `resource-type-classifier.ts` - 리소스 타입 추론

### selectors

후보 필드 중 대표값 선택

- `title-selector.ts` - 제목 선택 로직
- `description-selector.ts` - 설명 선택 로직
- `image-selector.ts` - 대표 이미지 선택
- `author-selector.ts` - 작성자 선택

### compressors

정보를 카드 예산 안으로 축약

- `card-compressor.ts` - 카드 압축 로직

### normalizers

최종 카드 객체 생성

- `base-normalizer.ts` - 기본 normalizer
- `video-normalizer.ts` - 영상 카드
- `article-normalizer.ts` - 아티클 카드
- `social-normalizer.ts` - 소셜 카드
- `homepage-normalizer.ts` - 홈페이지 카드
- `collection-normalizer.ts` - 컬렉션 카드
- `generic-normalizer.ts` - 일반 카드

### schemas / types

런타임 검증 및 타입 정의

- `card.ts` - 카드 타입 정의
- `metadata.ts` - 메타데이터 타입
- `classification.ts` - 분류 타입
- `card.schema.ts` - zod 스키마

## 사용할 오픈소스

### 1. metascraper 계열

**역할:**
- 정적 HTML 기반 metadata extraction
- og / twitter / canonical / author / date 등 후보 수집

**사용 패키지:**
- `metascraper`
- `metascraper-title`
- `metascraper-description`
- `metascraper-image`
- `metascraper-author`
- `metascraper-date`
- `metascraper-url`

**이유:**
- extraction layer를 빠르게 구성 가능
- HTML 기반 후보 수집 품질 확보
- 직접 구현 비용 감소

### 2. Playwright

**역할:**
- 동적 렌더링
- JavaScript 실행
- 렌더 완료 후 DOM 확보
- CSR/SPA 대응

**이유:**
- 실제 브라우저 수준 DOM 확보 가능
- 동적 페이지 fallback에 적합
- 렌더 결과를 기준으로 field selection 가능

### 3. Cheerio

**역할:**
- 정적 HTML 후처리
- selector 기반 보강 추출
- excerpt 및 특수 필드 추출 보조

**이유:**
- 사용성이 높음
- 커스텀 selector 작성이 쉬움
- metascraper 보강에 적합

### 4. zod

**역할:**
- 카드 스키마 검증
- normalizer 출력 검증
- 런타임 타입 안정성 확보

### 5. vitest

**역할:**
- unit test
- classification test
- normalizer test
- extraction test

### 6. tsup

**역할:**
- TypeScript package build
- ESM/CJS 대응

### 7. eslint / prettier

**역할:**
- 코드 품질 및 스타일 관리

## 오픈소스 활용 전략

### 오픈소스에 맡길 것

- 정적 HTML metadata extraction
- 동적 렌더링 DOM 확보
- HTML 선택자 기반 후처리 보조
- 스키마 검증 도구

### 직접 구현할 것

- URL 분류 규칙
- provider 판별
- page kind 판별
- static/dynamic 경로 결정
- field selection 규칙
- card compression 규칙
- card normalization 규칙
- interaction hint 생성

**즉, 오픈소스는 재료를 모으는 계층이고, 엔진의 핵심 가치는 그 재료를 어떤 카드 객체로 정규화하는가에 있다.**

## 카드 객체 모델

```typescript
export type ResourceType =
  | 'video'
  | 'social'
  | 'article'
  | 'website'
  | 'homepage'
  | 'collection'
  | 'profile'
  | 'image'
  | 'unknown'

export type InteractionMode =
  | 'static'
  | 'expandable'
  | 'playable'
  | 'embeddable'

export interface BaseCard {
  originalUrl: string
  resolvedUrl: string
  canonicalUrl?: string
  provider: string
  resourceType: ResourceType
  title?: string
  description?: string
  imageUrl?: string
  siteName?: string
  author?: string
  publishedAt?: string
  embeddable: boolean
  interactionMode: InteractionMode
}

export interface VideoCard extends BaseCard {
  resourceType: 'video'
  interactionMode: 'playable' | 'embeddable'
  embedUrl?: string
  duration?: number
}

export interface ArticleCard extends BaseCard {
  resourceType: 'article'
  interactionMode: 'expandable' | 'static'
  excerpt?: string
}
```

## 카드 압축 규칙

카드는 원본 페이지의 복제가 아니라 **최소 대표 표현**이어야 한다.

### Compression Budget

- `title`: 1개
- `description`: 1개
- `image`: 최대 1개
- `author`: 최대 1명
- `excerpt`: 길이 제한
- `embed`: 최대 1개

## 최소 공개 API

```typescript
import { preview } from 'url-preview-engine'

const card = await preview('https://www.youtube.com/watch?v=abc123')
```

**예상 결과:**

```typescript
{
  provider: 'youtube',
  resourceType: 'video',
  title: '영상 제목',
  description: '영상 설명',
  imageUrl: 'https://...',
  embedUrl: 'https://www.youtube.com/embed/abc123',
  embeddable: true,
  interactionMode: 'playable',
  duration: 360
}
```

## 개발 단계

### Phase 1 — Package Skeleton

- TypeScript 초기화
- lint/test/build 설정
- card types 및 zod schema 정의
- engine interface 정의

### Phase 2 — Static Extraction

- URL normalize
- HTTP fetch
- metascraper 연동
- generic metadata 확보

### Phase 3 — Dynamic Extraction

- Playwright extractor 추가
- static 실패/부족 시 fallback 연결
- 렌더 후 DOM 기반 보강

### Phase 4 — Classification

- provider classifier
- url shape classifier
- page kind classifier
- resource type classifier

### Phase 5 — Normalization

- field selector
- card compressor
- provider/type별 normalizer 구현
- interactionMode 결정 로직 구현

### Phase 6 — Hardening

- 예외 처리
- 테스트 확대
- README/examples 정리
- npm 배포 준비

## 패키지 구조

```
src/
  index.ts

  core/
    preview-engine.ts
    preview-factory.ts

  types/
    card.ts
    metadata.ts
    classification.ts

  schemas/
    card.schema.ts

  extractors/
    extractor.interface.ts
    static.extractor.ts
    dynamic.extractor.ts
    metascraper.extractor.ts
    playwright.extractor.ts

  fetchers/
    url-normalizer.ts
    html-fetcher.ts

  classifiers/
    provider-classifier.ts
    url-classifier.ts
    page-kind-classifier.ts
    resource-type-classifier.ts

  selectors/
    title-selector.ts
    description-selector.ts
    image-selector.ts
    author-selector.ts

  compressors/
    card-compressor.ts

  normalizers/
    base-normalizer.ts
    video-normalizer.ts
    article-normalizer.ts
    social-normalizer.ts
    homepage-normalizer.ts
    collection-normalizer.ts
    generic-normalizer.ts

tests/
  unit/
  integration/
  fixtures/
```

## 최종 기술 정의

이 프로젝트는 다음과 같이 정의할 수 있다:

**정적 HTML과 동적 렌더링 결과를 모두 활용해 URL을 해석하고, 리소스 타입과 단위를 분류한 뒤, 대표성 있는 최소 정보를 선택하여 렌더링 및 상호작용 가능한 preview card object로 정규화하는 엔진 패키지**
