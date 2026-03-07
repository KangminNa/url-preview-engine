# url-preview-engine

URL을 입력받아 **정규화된 preview card object**를 반환하는 TypeScript 기반 preview engine 패키지입니다.

이 프로젝트는 단순한 메타데이터 추출기가 아니라,  
**정적 렌더링과 동적 렌더링을 모두 고려하여 URL이 가리키는 리소스를 해석하고, 대표성 있는 최소 정보만 선택해 렌더링 가능한 카드 모델로 정규화하는 엔진**을 목표로 합니다.

---

## 1. 프로젝트 목적

웹의 링크 미리보기는 보통 아래 수준에서 끝납니다.

- 제목
- 설명
- 대표 이미지

하지만 실제 URL은 훨씬 다양한 리소스를 가리킵니다.

- 개별 영상
- 소셜 포스트
- 블로그 글
- 기사
- 이미지
- 프로필 페이지
- 컬렉션 페이지
- 서비스 홈
- 동적 렌더링 기반 SPA 페이지

`url-preview-engine`은 이런 차이를 구분하지 않고 같은 방식으로 처리하는 대신,  
**URL의 리소스 타입과 단위를 먼저 판별하고, 정적 HTML과 동적 렌더링 결과를 모두 활용해 preview card object를 생성**하는 것을 목표로 합니다.

즉, 이 엔진은 다음을 수행합니다.

- URL 정규화
- HTTP 응답 및 문서 성격 판별
- 정적 HTML 기반 메타데이터 추출
- 동적 렌더링 기반 DOM 정보 추출
- provider 판별
- resource type / page kind 분류
- 후보 필드 선택
- 카드 예산(card budget)에 맞춘 정보 압축
- 최종 preview card object 반환

이 프로젝트는 서비스 자체가 아니라,  
향후 만들 아카이브/피드/SNS형 서비스의 **핵심 엔진 패키지**를 만드는 것이 목적입니다.

---

## 2. 핵심 철학

이 프로젝트의 핵심은 “많이 긁어오는 것”이 아니라,  
**적절한 단위로 분류하고, 대표값만 선택하고, 일관된 타입 객체로 정규화하는 것**입니다.

### 이 엔진이 지향하는 것
- 링크를 렌더링 가능한 카드 객체로 변환한다
- 모든 URL을 동일하게 다루지 않는다
- atomic resource와 homepage / collection / profile을 구분한다
- 정적 렌더링과 동적 렌더링을 모두 지원한다
- rich preview는 일부 타입에만 선택적으로 제공한다
- downstream app이 바로 사용할 수 있는 안전한 모델을 반환한다

### 이 엔진이 지향하지 않는 것
- 원본 웹페이지 전체 복제
- 범용 크롤러 플랫폼
- 모든 사이트의 iframe 렌더링
- 모든 동적 웹페이지 완벽 재현
- provider 정책 우회

---

## 3. 왜 정적 렌더링과 동적 렌더링이 모두 필요한가

웹페이지는 크게 두 방식으로 정보를 제공합니다.

### 1) 정적 렌더링 기반 페이지
초기 HTML 문서에 이미 충분한 정보가 있는 페이지입니다.

예:
- Open Graph가 잘 설정된 블로그
- 일반 뉴스 기사
- 서버 렌더링 기반 사이트
- canonical, meta description, JSON-LD가 포함된 페이지

이 경우에는 주로 아래를 읽으면 충분합니다.

- `<title>`
- `<meta>`
- Open Graph
- Twitter Cards
- canonical URL
- JSON-LD
- 본문 excerpt 후보

### 2) 동적 렌더링 기반 페이지
초기 HTML에는 정보가 부족하고, JavaScript 실행 이후 DOM이 완성되는 페이지입니다.

예:
- SPA
- CSR 기반 서비스
- JS hydration 이후에 콘텐츠가 붙는 페이지
- 일부 소셜/앱 스타일 페이지

이 경우에는 단순 fetch만으로는 부족하고,  
**브라우저 렌더링 이후의 DOM**을 읽어야 합니다.

즉 이 엔진은 다음 두 경로를 모두 고려합니다.

- **Static Extraction Path**
- **Dynamic Rendering Path**

그리고 최종적으로 둘 중 더 적절한 결과를 정규화하여 카드 객체로 반환합니다.

---

## 4. 엔진 관점의 문제 정의

같은 도메인이라도 URL마다 의미가 다릅니다.

예를 들어 YouTube는 다음처럼 나뉩니다.

- `https://www.youtube.com/watch?v=...` → 단일 video resource
- `https://www.youtube.com/playlist?...` → collection resource
- `https://www.youtube.com/@channel` → profile resource
- `https://www.youtube.com/` → homepage resource

즉 엔진은 먼저 다음 질문에 답해야 합니다.

1. 이 URL은 어떤 provider인가?
2. 이 URL은 어떤 리소스 단위인가?
3. 이 URL은 정적 추출만으로 충분한가?
4. 동적 렌더링 fallback이 필요한가?
5. 어떤 후보 정보가 대표값으로 적절한가?
6. 최종 카드에는 어느 정도 정보까지만 담을 것인가?

즉 `url-preview-engine`은 단순 scraping 도구가 아니라,  
**classification → extraction → selection → compression → normalization pipeline**을 가진 엔진입니다.

---

## 5. MVP 목표

첫 MVP의 목표는 “모든 웹페이지 완벽 지원”이 아닙니다.

목표는 아래 5가지입니다.

1. URL을 입력받아 preview 후보 정보를 추출할 수 있어야 한다
2. URL의 provider / resource type / page kind를 분류할 수 있어야 한다
3. 정적 HTML 기반 추출을 지원해야 한다
4. 동적 렌더링 기반 추출 경로를 지원해야 한다
5. 정규화된 카드 객체를 일관되게 반환할 수 있어야 한다

---

## 6. MVP 지원 범위

### 1차 지원 Provider

#### Video
- YouTube

#### Social
- Instagram

#### Blog / Article
- 네이버 블로그
- 티스토리
- 브런치
- Velog
- Medium
- 일반 article / blog page

#### Generic Fallback
- 일반 웹페이지

### 1차 분류 대상
- `video`
- `social`
- `article`
- `website`
- `homepage`
- `collection`
- `profile`
- `unknown`

---

## 7. 처리 대상이 되는 정보 소스

이 엔진은 단순히 HTTP header만 읽는 방식으로 동작하지 않습니다.  
핵심은 **HTML 문서와 렌더링 결과 DOM**입니다.

### 1) HTTP 응답 레벨
주요 용도:
- `content-type` 판별
- redirect 추적
- final resolved URL 확보
- iframe 정책 참고 (`x-frame-options`, `content-security-policy`)

### 2) 정적 HTML 문서 레벨
주요 용도:
- `<title>`
- `<meta name="description">`
- Open Graph (`og:*`)
- Twitter Cards
- canonical
- JSON-LD
- 본문 excerpt 후보
- 대표 이미지 후보
- author/date 후보

### 3) 동적 렌더링 결과 레벨
주요 용도:
- CSR / SPA 사이트 대응
- JavaScript 실행 이후 DOM 기반 정보 보강
- 초기 HTML에 없는 콘텐츠 추출
- 렌더 완료 후 대표 요소 선택

즉 이 엔진은 다음을 모두 고려합니다.

- **HTTP response**
- **static HTML**
- **rendered DOM**

---

## 8. 처리 흐름

```text
URL 입력
  ↓
URL 정규화
  ↓
HTTP fetch
  ↓
응답 유형 판별
  ↓
정적 HTML 기반 추출 시도
  ↓
필요 시 동적 렌더링 수행
  ↓
Provider 판별
  ↓
Resource Type / Page Kind 분류
  ↓
후보 필드 선택
  ↓
Card Compression
  ↓
Preview Card Object 반환