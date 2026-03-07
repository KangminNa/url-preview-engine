# Fetchers

입력 URL과 HTTP 응답을 다룹니다.

## 역할

- `url-normalizer.ts`
  - 스킴 보정(`https://`)
  - 지원 프로토콜 검사(http/https)
  - hash 제거
- `html-fetcher.ts`
  - redirect follow
  - content-type 기반 HTML 읽기 여부 결정
  - 최대 바이트 제한으로 과대 응답 방지
- `html-fetcher.types.ts`
  - fetch 옵션 interface

## 설계 포인트

- fetch 실패는 엔진 실패가 아니라 URL-only 추론 fallback으로 처리
