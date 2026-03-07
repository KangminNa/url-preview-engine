# Extractors

Extractor 레이어는 `static / dynamic / recompose`를 stage 파이프라인으로 분리해
"후보 수집 + 본문 재구성"만 담당합니다.

## 폴더 구조

- `pipeline/`
  - `extractor-stage.ts`: stage 추상 클래스
  - `extractor-pipeline.ts`: stage 실행기
  - `context.ts`: static/dynamic 컨텍스트 정의
  - `static-extractor-pipeline.ts`: static stage 조합
  - `dynamic-extractor-pipeline.ts`: dynamic stage 조합
- `stages/`
  - static:
    - `static-metascraper.stage.ts`
    - `static-recompose.stage.ts`
    - `static-fallback.stage.ts`
    - `static-merge.stage.ts`
  - dynamic:
    - `dynamic-capture.stage.ts`
    - `dynamic-rendered-static.stage.ts`
    - `dynamic-recompose.stage.ts`
    - `dynamic-merge.stage.ts`
- `static.extractor.ts`: static 파이프라인 엔트리
- `playwright.extractor.ts`: dynamic 파이프라인 엔트리
- `dynamic.extractor.ts`: 외부 호출용 얇은 래퍼
- `playwright-runtime.ts`: Playwright 캡처/DOM 트리 수집 구현
- `content-recomposer.ts`: HTML/DOM 트리를 뷰 엔진 렌더 가능한 블록/문서로 재구성
- `static-metadata-utils.ts`: static/dynamic metadata merge 및 fallback 유틸

## Stage 흐름

### Static

1. `static-metascraper`: metascraper 후보 수집
2. `static-recompose`: body 파싱 후 reader content 생성
3. `static-fallback`: meta/iframe/snapshot 기반 fallback metadata 구성
4. `static-merge`: metascraper + fallback 병합

### Dynamic

1. `dynamic-capture`: Playwright로 렌더링 + DOM tree 캡처
2. `dynamic-rendered-static`: 렌더된 HTML에 static extractor 재사용
3. `dynamic-recompose`: DOM tree(우선) 또는 HTML에서 reader content 재구성
4. `dynamic-merge`: dynamic content/excerpt + rendered metadata 병합

## 설계 원칙

- extractor는 "판단"이 아니라 "추출/재구성"에 집중
- static/dynamic 모두 최종적으로 동일한 `ReaderContent` 계약으로 정규화
- site-specific 정책은 extractor 밖(policy/profile)에서 주입
