# Types

엔진 전역에서 공유하는 도메인 타입 정의 계층입니다.

## 역할

- `classification.ts`
  - Provider
  - ResourceType
  - PageKind
  - InteractionMode
- `card.ts`
  - BaseCard + 타입별 카드 인터페이스
- `metadata.ts`
  - 추출 metadata, fetch result, preview options

## 설계 포인트

- 분류 축과 출력 계약을 코드 전역에서 동일하게 사용
- API surface를 단순하고 안정적으로 유지
