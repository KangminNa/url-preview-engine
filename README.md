# url-preview-engine

임의의 URL을 정규화된 렌더링 가능한 preview card object로 변환하는 TypeScript 패키지입니다.

`url-preview-engine`은 다음을 결합한 preview 정규화 엔진입니다:

- 정적 HTML 메타데이터 추출
- 동적 DOM 추출
- Provider 분류
- Resource/Page-kind 추론
- 필드 선택
- 카드 압축
- 스키마 기반 정규화

이 패키지는 엔진 레이어로 설계되었으며, 제품 UI가 아닙니다.
출력은 downstream 애플리케이션이 렌더링할 수 있는 타입이 명확한 preview card model입니다.

---

## 이 패키지가 하는 일

URL을 입력받아 다음 과정을 수행합니다:

1. 입력 URL 정규화
2. 대상 리소스 fetch
3. HTTP 응답 메타데이터 검사
4. 정적 HTML에서 후보 필드 추출
5. 필요시 페이지를 렌더링하고 최종 DOM에서 데이터 추출
6. provider / resource type / page kind 분류
7. 대표 필드 선택
8. 카드 예산 내로 결과 압축
9. 정규화된 preview card object 반환

이 패키지는 전체 웹페이지를 재현하는 것이 **목표가 아닙니다**.
**최소한의 타입화된 렌더링 가능한 preview model**을 생성하는 것이 목표입니다.

---

## 엔진 범위

### 포함

- URL 정규화
- HTTP 응답 검사
- 정적 HTML 추출
- 동적 렌더링 fallback
- Provider 감지
- Resource type 추론
- Page kind 분류
- 후보 필드 선택
- 카드 압축
- 타입화된 카드 정규화

### 제외

- 인증 / 사용자 관리
- 데이터베이스 영속화
- 아카이브/피드 UI
- 전체 페이지 복제
- 무제한 iframe 렌더링
- Provider 정책 우회
- 범용 크롤링 인프라

---

## 핵심 개념

### 1. 리소스 단위 구분

모든 URL이 같은 종류의 리소스를 가리키는 것은 아닙니다.

**예시:**

- `youtube.com/watch?v=...` → 개별 영상 리소스
- `youtube.com/playlist?...` → 컬렉션 리소스
- `youtube.com/@channel` → 프로필 리소스
- `youtube.com/` → 홈페이지 리소스

엔진은 정규화 전에 이러한 케이스를 구분해야 합니다.

### 2. 정적 추출 vs 동적 추출

일부 페이지는 초기 HTML에 충분한 정보를 노출합니다.
다른 페이지는 의미 있는 DOM이 나타나기 전에 JavaScript 실행이 필요합니다.

따라서 엔진은 두 가지 추출 경로를 지원합니다:

- **정적 추출 경로 (Static Extraction Path)**
- **동적 렌더링 경로 (Dynamic Rendering Path)**

### 3. 원시 추출이 아닌 후보 선택

이 엔진은 단순 스크래퍼가 아닙니다.
추출된 모든 필드를 반환하지 않습니다.

대신:

- 후보 값들을 수집하고
- 대표값을 순위화/선택하고
- 최소 카드 객체로 압축합니다

### 4. 카드 정규화

최종 출력은 타입화된 카드 객체이며, 원시 HTML도 아니고 임의의 메타데이터 덩어리도 아닙니다.

---

## 처리 파이프라인

```
URL
  ↓
정규화
  ↓
Fetch
  ↓
응답 검사
  ↓
정적 추출
  ↓
동적 추출 (선택적)
  ↓
Provider 분류
  ↓
Resource Type / Page Kind 분류
  ↓
후보 필드 선택
  ↓
카드 압축
  ↓
타입화된 카드로 정규화
  ↓
Preview Card Object 반환
```

---

## 정보 소스

### HTTP 응답 계층

**사용 목적:**

- content-type 감지
- 리다이렉트 해석
- 해석된 URL 추적
- frame/embed 정책 힌트
- 응답 수준 분류 신호

**예시:**

- `content-type`
- `x-frame-options`
- `content-security-policy`

### 정적 HTML 계층

**사용 목적:**

- `<title>`
- `<meta name="description">`
- Open Graph
- Twitter Cards
- canonical URL
- JSON-LD
- 이미지 후보
- 작성자/날짜 후보
- 발췌문 후보

### 렌더링된 DOM 계층

정적 HTML이 불충분할 때 사용됩니다.

**전형적인 케이스:**

- CSR / SPA 페이지
- hydration 의존 페이지
- JavaScript 실행 후 주입되는 콘텐츠

---

## 리소스 분류 모델

엔진은 resource type과 page kind를 구분합니다.

### ResourceType

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
```

### 왜 중요한가

같은 provider라도 URL 형태와 page kind에 따라 매우 다른 카드를 생성할 수 있습니다.

**예시:**

- watch 페이지 → video card로 정규화
- 루트 페이지 → homepage card로 정규화
- playlist → collection card로 정규화

---

## 카드 모델

### BaseCard

```typescript
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
```

### VideoCard

```typescript
export interface VideoCard extends BaseCard {
  resourceType: 'video'
  interactionMode: 'playable' | 'embeddable'
  embedUrl?: string
  duration?: number
}
```

### ArticleCard

```typescript
export interface ArticleCard extends BaseCard {
  resourceType: 'article'
  interactionMode: 'expandable' | 'static'
  excerpt?: string
}
```

---

## 카드 압축 정책

엔진은 무제한 추출 데이터를 노출하지 않습니다.
후보 필드를 최소 렌더링 예산으로 압축합니다.

**일반적인 제약:**

- `title`: 1개
- `description`: 1개
- `image`: 최대 1개
- `author`: 최대 1명
- `excerpt`: 길이 제한
- `embed`: 최대 1개

이를 통해 출력을 작고, 예측 가능하며, 렌더링 지향적으로 유지합니다.

---

## 오픈소스 의존성

이 프로젝트는 의도적으로 추출 및 렌더링 계층에 오픈소스 라이브러리를 사용하면서,
분류 및 정규화 로직은 자체 구현합니다.

### 정적 추출

- `metascraper`
- `metascraper-title`
- `metascraper-description`
- `metascraper-image`
- `metascraper-author`
- `metascraper-date`
- `metascraper-url`

**역할:**

- 정적 HTML에서 메타데이터 후보 추출
- title / description / image / author / date / canonical URL 후보 수집

### 동적 렌더링

- `playwright`

**역할:**

- JavaScript 의존 페이지 렌더링
- 클라이언트 측 실행 후 최종 DOM 접근
- 정적 추출이 불충분할 때 fallback 제공

### HTML 후처리

- `cheerio`
- 선택적으로 `htmlparser2`

**역할:**

- 커스텀 필드 추출
- 발췌문 추출
- selector 기반 DOM/HTML 정제
- provider별 fallback 파싱

### 스키마 검증

- `zod`

**역할:**

- 정규화된 카드 출력 검증
- 타입화된 런타임 스키마 강제
- 잘못된 출력으로부터 downstream 렌더링 계층 보호

### 테스트 / 패키징

- `vitest`
- `tsup`
- `eslint`
- `prettier`

---

## 아키텍처 경계

### OSS에 위임

- 정적 HTML에서 메타데이터 추출
- 동적 페이지를 위한 브라우저 렌더링
- DOM 쿼리 유틸리티
- 런타임 스키마 검증

### 이 패키지에서 구현

- URL 정규화 정책
- Provider 감지
- Page kind 분류
- Resource type 추론
- 정적 vs 동적 전략 선택
- 후보 순위화 / 필드 선택
- 카드 압축
- 타입화된 정규화
- 인터랙션 힌트 생성

**이 패키지의 주요 가치는 추출만이 아닙니다.**
**추출된 후보 위에 구축된 정규화 로직입니다.**

---

## 계획된 패키지 구조

```
src/
  index.ts

  core/
    preview-engine.ts
    preview-factory.ts

  types/
    card.ts
    metadata.ts
    provider.ts
    classification.ts

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
    url-classifier.ts
    provider-classifier.ts
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

  schemas/
    card.schema.ts
```

---

## MVP 대상

### Providers

- YouTube
- Instagram
- 네이버 블로그
- 티스토리
- 브런치
- Velog
- Medium
- 일반 article/blog 페이지
- 일반 웹사이트 fallback

### 출력 목표

- 안정적인 타입화된 카드 출력
- 정적 + 동적 추출 지원
- Provider 인식 정규화
- Page kind 구분
- 렌더링 지향 인터랙션 힌트

---

## 최소 API

```typescript
import { preview } from 'url-preview-engine'

const card = await preview('https://www.youtube.com/watch?v=abc123')
```

**출력 예시:**

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

**다른 예시:**

```typescript
const card = await preview('https://www.youtube.com/')

// 출력:
{
  provider: 'youtube',
  resourceType: 'homepage',
  title: 'YouTube',
  description: '...',
  imageUrl: 'https://...',
  embeddable: false,
  interactionMode: 'static'
}
```

---

## 개발 단계

### Phase 1 — Package Skeleton

- TypeScript 설정
- lint / test / build 구성
- 핵심 타입 정의
- 카드 스키마

### Phase 2 — Static Extraction

- URL 정규화
- HTTP fetch
- metascraper 통합
- 기본 메타데이터 후보 수집

### Phase 3 — Dynamic Extraction

- Playwright 통합
- fallback 렌더링 경로
- 렌더링된 DOM 추출

### Phase 4 — Classification

- Provider 분류
- URL 형태 분류
- Page kind 분류
- Resource type 추론

### Phase 5 — Normalization

- 필드 selector
- 카드 압축
- Provider/type별 normalizer
- 인터랙션 모드 생성

### Phase 6 — Hardening

- 에러 처리
- 테스트 확장
- 예제
- npm 배포 준비

---

## 현재 상태

초기 MVP 설계 단계입니다.

**현재 우선순위:**

1. URL 정규화
2. 정적 추출
3. 동적 추출
4. Provider 분류
5. Resource 분류
6. 카드 정규화

---

## 문서

- [기획 문서](./docs/PLANNING.md) - 프로젝트 배경 및 제품 범위
- [개발 문서](./docs/DEVELOPMENT.md) - 상세 아키텍처 및 구현 가이드

---

## 라이선스

MIT
