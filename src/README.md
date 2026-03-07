# Source Architecture

`src`는 URL을 interaction-aware card로 변환하는 엔진 구현 계층입니다.

## 전체 흐름

1. `fetchers`: URL 정규화 + HTML fetch
2. `extractors`: metadata 후보 수집
3. `classifiers`: provider/resource/page-kind 분류
4. `capabilities`: embed/playback 가능성 판단
5. `selectors`: 대표 필드 선택
6. `normalizers`: 카드 타입별 결과 정규화
7. `compressors`: 카드 출력 길이/예산 제한
8. `schemas`: 런타임 계약 검증
9. `core`: 전체 오케스트레이션

## 진입점

- `index.ts`: public API export
- `core/preview-engine.ts`: `preview(url, options)` 구현
