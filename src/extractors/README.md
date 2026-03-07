# Extractors

HTML/DOM에서 metadata 후보를 수집합니다.

## 역할

- `static.extractor.ts`
  - metascraper + fallback 병합
- `metascraper.extractor.ts`
  - metascraper rules 동적 import 실행
- `dynamic.extractor.ts`
  - 동적 렌더 fallback 오케스트레이션
- `playwright.extractor.ts`
  - Playwright로 렌더링 후 DOM 트리(body 기준) 추출
- `content-recomposer.ts`
  - 정적 HTML body 트리 파싱/저장 + text/image 블록 재구성

## 설계 포인트

- extractor는 "결정"이 아닌 "후보 수집/정규화"에 집중
- 정적/동적 본문은 같은 블록 렌더 규칙으로 처리
- recomposer는 `parse|capture(body tree) → sanitize → store tree → text/image render` 파이프라인
- 본문 추출은 `focusMainContent` 점수 기반 후보 선택을 우선 시도하고, 실패 시 `full-body`로 자동 fallback
- `focusTitleRoot + titleHint`를 주면 title과 매칭되는 heading subtree를 우선 선택
