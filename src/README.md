# Source Architecture

`src`는 URL을 interaction-aware card로 변환하는 엔진 구현 계층입니다.

## 전체 흐름

1. `fetchers`: URL 정규화 + HTML fetch
2. `extractors`: metadata 후보 수집
3. `content`: 사이트별 본문 추출 전략 + 품질 평가
4. `classifiers`: provider/resource/page-kind 분류
5. `capabilities`: embed/playback 가능성 판단
6. `policies`: 사이트별 정책 훅(분류/능력/메타데이터 보정)
7. `selectors`: 대표 필드 선택
8. `normalizers`: 카드 타입별 결과 정규화
9. `compressors`: 카드 출력 길이/예산 제한
10. `schemas`: 런타임 계약 검증
11. `engine`: 단계형 파이프라인 오케스트레이션
12. `core`: 카드 팩토리 등 호환/보조 계층
13. `view`: tree/block을 `index.html + css`로 렌더링

## 패턴

- `Strategy`
  - `ContentProfile`로 사이트별 main-content 추출 규칙 주입
- `Chain of Responsibility`
  - `ContentProfileRegistry`가 우선순위 프로파일을 순차 병합
- `Template Method`
  - `SitePolicy` 훅으로 classification/capability/card 보정

## 파일 규칙

- `*.types.ts`: `type/interface` 정의 전용 파일
- `*.ts`(로직 파일): 함수/클래스/실행 로직 전용
- 클래스가 있는 파일에는 interface를 두지 않고, 필요 타입은 `*.types.ts`에서 import

## 진입점

- `index.ts`: public API export
- `engine/preview-engine.ts`: `preview(url, options)` 구현
