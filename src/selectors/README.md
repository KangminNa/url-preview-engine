# Selectors

여러 후보 중 카드 대표 필드를 선택합니다.

## 역할

- `title-selector.ts`
- `description-selector.ts`
- `image-selector.ts`
- `author-selector.ts`

## 설계 포인트

- 공백/빈 문자열 정리
- fallback 규칙 일관화
- normalizer가 단순 조립만 하도록 입력 정제 책임 분리
