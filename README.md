# url-preview-engine

URL을 구조화된 미리보기 카드 객체로 변환하는 preview engine입니다.

## 개요

url-preview-engine은 URL을 분석하여 메타데이터와 콘텐츠 신호를 추출하고, 리소스 타입을 판별한 뒤, 렌더링 가능한 정규화된 preview card object를 반환하는 TypeScript 기반 패키지입니다.

이 프로젝트는 아직 완성형 서비스나 아카이브 플랫폼이 아닙니다.
현재 목표는 앞으로 만들 수 있는 다음과 같은 서비스들의 핵심 엔진 패키지를 만드는 것입니다.

- 개인 URL 아카이브 서비스
- SNS/피드형 링크 공유 서비스
- Smart Preview API
- 브라우저 확장 프로그램
- 내부 링크 미리보기 렌더링 시스템

이 프로젝트의 핵심 목표는 아래 한 문장으로 정리할 수 있습니다.

**원시 URL을 미니 웹페이지 수준의 preview model로 변환한다.**

---

## 프로젝트 목적

대부분의 링크 미리보기는 아래 수준에서 멈춥니다.

- 제목
- 설명
- 대표 이미지

하지만 이 프로젝트는 여기서 한 단계 더 나아가는 것을 목표로 합니다.

url-preview-engine은 다음을 지향합니다.

- URL을 안전하게 정규화하고 가져오기
- 웹페이지의 메타데이터 추출하기
- provider와 콘텐츠 타입 판별하기
- 가능한 경우 임베드 가능성 판단하기
- 결과를 재사용 가능한 카드 객체로 정규화하기
- 다양한 서비스에서 활용 가능한 일관된 preview model 제공하기

즉, 이 패키지는 단순한 메타데이터 추출기가 아니라,
링크를 렌더링 가능한 미니 웹페이지 카드로 바꾸는 엔진을 목표로 합니다.

---

## MVP 범위

첫 번째 MVP에서는 모든 웹페이지를 완벽하게 지원하는 것이 아니라,
실용적이고 자주 쓰이는 URL 유형을 우선 지원하는 것을 목표로 합니다.

### 1차 지원 대상

**Video**
- YouTube

**Social**
- Instagram

**Blog / Article**
- 네이버 블로그
- 티스토리
- 브런치
- Velog
- Medium
- 일반 blog/article 페이지

**Generic Fallback**
- 기본 메타데이터를 가진 일반 웹페이지

---

## MVP에서 제공할 기능

- 입력 URL 정규화
- 대상 HTML fetch
- 메타데이터 추출
- provider 판별
- resource type 추론
- 정규화된 preview card object 생성
- 일부 주요 플랫폼에 대한 타입별 normalizer 제공

---

## MVP에서 아직 하지 않는 것

- 로그인 / 회원가입
- DB 저장
- 아카이브/피드 UI
- 결제 / 수익화
- 브라우저 수준의 전체 페이지 재현
- 모든 웹사이트에 대한 iframe 기반 렌더링
- 모든 동적 페이지에 대한 완벽 대응

---

## 핵심 개념

이 엔진의 내부 흐름은 아래와 같이 설계합니다.

```
URL
→ normalize
→ fetch
→ metadata 추출
→ provider 판별
→ resource type 추론
→ card object 정규화
→ downstream app에서 렌더링
```

이 패키지의 목적은 원본 HTML을 그대로 반환하는 것이 아닙니다.
목적은 안전하고 일관되게 렌더링 가능한 typed preview model을 반환하는 것입니다.

---

## 카드 모델 설계 철학

Preview Card는 크게 두 층으로 구성됩니다.

### 1. 공통 메타데이터 레이어

대부분의 URL이 공통적으로 제공할 수 있는 정보입니다.

- title
- description
- image
- site name
- provider
- author
- published date
- canonical URL

### 2. 타입별 렌더링 레이어

콘텐츠 타입에 따라 추가되는 필드입니다.

- video player / embed 정보
- article excerpt
- social caption
- image 중심 렌더링 힌트

즉, 엔진은 아래를 반환해야 합니다.

- 공통 base card 구조
- 타입별 확장 구조

---

## 예시 카드 타입

### BaseCard

```typescript
export type ResourceType =
  | 'video'
  | 'social'
  | 'article'
  | 'website'
  | 'image'
  | 'unknown'

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
}
```

### VideoCard

```typescript
export interface VideoCard extends BaseCard {
  resourceType: 'video'
  embedUrl?: string
  duration?: number
}
```

### ArticleCard

```typescript
export interface ArticleCard extends BaseCard {
  resourceType: 'article'
  excerpt?: string
}
```

---

## 렌더링 전략

이 엔진은 모든 URL을 iframe으로 처리하는 구조를 목표로 하지 않습니다.

대신 아래와 같은 전략을 따릅니다.

- 대부분의 페이지는 기본 메타데이터 카드로 처리
- 직접 미디어가 가능하면 native media rendering 사용
- 지원하는 provider에 한해 embed-aware rendering 지원

예시:
- YouTube → video-style preview card, 필요 시 embeddable
- Blog article → image + title + excerpt + author/date
- 일반 웹페이지 → fallback metadata card

---

## 예정 기술 스택

### 언어 / 런타임
- TypeScript
- Node.js

### 핵심 라이브러리
- metascraper : metadata extraction
- zod : schema validation 및 normalization
- vitest : 테스트
- tsup : 패키지 빌드
- eslint, prettier : 코드 품질 관리

### 추후 확장 가능성
- htmlparser2 : 커스텀 파싱 보강
- Playwright 또는 browser 기반 fallback : 동적 페이지 대응

---

## 예정 패키지 구조

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

  extractors/
    extractor.interface.ts
    metascraper.extractor.ts

  fetchers/
    url-normalizer.ts
    html-fetcher.ts

  detectors/
    provider-detector.ts
    resource-type-detector.ts
    embed-detector.ts

  normalizers/
    card-normalizer.ts
    article-normalizer.ts
    video-normalizer.ts
    social-normalizer.ts
    generic-normalizer.ts
```

---

## 개발 단계

### Phase 1 — Package Skeleton
- TypeScript package 초기화
- lint / test / build 설정
- preview card 타입 정의
- engine interface 정의

### Phase 2 — Generic Preview Extraction
- URL normalize
- HTML fetch
- metadata extractor 연동
- generic preview card 반환

### Phase 3 — Provider Detection
- YouTube, Instagram, blog/article 계열 도메인 판별
- provider / resource type 기반 분기

### Phase 4 — Type-specific Normalization
- video card normalization
- article card normalization
- social card normalization

### Phase 5 — Hardening
- 에러 처리 보강
- 테스트 커버리지 확대
- README와 예제 보강
- npm publish 준비

---

## Non-Goals

이 프로젝트는 첫 MVP에서 아래를 목표로 하지 않습니다.

- 원본 웹페이지 전체 복제
- provider 보안 정책 우회
- 모든 URL의 iframe 렌더링
- 범용 크롤링 플랫폼 구축

현재의 목표는 더 좁고 명확합니다.

**재사용 가능한 URL → Preview Card Engine을 만든다.**

---

## 향후 방향

이 패키지는 앞으로 아래와 같은 시스템의 핵심 엔진이 되는 것을 목표로 합니다.

- URL 아카이브 서비스
- 링크 기반 SNS 피드
- 북마크 시각화 도구
- Preview API
- 외부 임베드용 preview widget

---

## 현재 상태

현재는 초기 MVP 설계 단계입니다.

초기 목표는 아래 3가지를 안정화하는 것입니다.

1. preview extraction
2. provider detection
3. card normalization

