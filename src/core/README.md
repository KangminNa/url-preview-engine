# Core

엔진 오케스트레이션 계층입니다.

## 역할

- `preview-engine.ts`
  - 전체 파이프라인 실행
  - fetch 실패 시 graceful fallback
  - 최종 결과를 schema로 검증
- `preview-factory.ts`
  - `resourceType`에 맞는 normalizer 선택

## 설계 포인트

- 네트워크/추출/분류/판단/정규화를 한곳에서 순서 보장
- `ContentProfileRegistry` + `SitePolicyRegistry`를 조합해
  추출 전략과 capability 보정 책임을 분리
- 기능 모듈은 작게 분리하고 Core는 조합에 집중
