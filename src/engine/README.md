# Engine

엔진 오케스트레이션 계층입니다.

## 목적

- `preview(url, options)` 흐름을 단계별 파이프라인으로 분리
- 파일명만 봐도 실행 순서를 알 수 있도록 구성
- 단계 클래스 상속 구조로 책임을 명확히 분리

## 실행 순서

1. `bootstrap.stage.ts`
2. `fetch-static.stage.ts`
3. `dynamic-extract.stage.ts`
4. `classify-capability.stage.ts`
5. `build-card.stage.ts`

## 패턴

- `Template Method / Inheritance`
  - `PreviewStage` 추상 클래스를 기반으로 각 단계 구현
- `Pipeline`
  - `PreviewPipeline`이 stage 목록을 순차 실행
- `Strategy + Chain`
  - `ContentProfileRegistry`/`SitePolicyRegistry`를 stage 내부에서 조합
