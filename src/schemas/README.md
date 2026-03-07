# Schemas

런타임에서 카드 계약을 검증합니다.

## 역할

- `card.schema.ts`
  - resource/page/interaction enum 검증
  - URL 필드/optional 필드 형태 검증

## 설계 포인트

- TypeScript 타입과 별도로 런타임 안전성 보장
- 잘못된 normalizer 출력이 downstream으로 전달되지 않게 차단
