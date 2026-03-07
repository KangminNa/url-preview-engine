# Core

엔진의 보조/호환 계층입니다.

## 역할

- `preview-engine.ts`
  - 호환용 export (`engine/preview-engine.ts` 위임)
- `preview-factory.ts`
  - `resourceType`에 맞는 normalizer 선택
- `preview-factory.types.ts`
  - 카드 팩토리 입력 interface

## 설계 포인트

- 오케스트레이션은 `engine/`으로 이동
- core는 카드 생성 팩토리/호환 레이어에 집중
