# Compressors

카드 출력을 interaction/표시 예산에 맞게 축약합니다.

## 역할

- `card-compressor.ts`
  - title/description/author/excerpt 길이 제한
  - 카드 payload를 예측 가능한 크기로 유지

## 설계 포인트

- extractor 단계에서 얻은 원본을 그대로 노출하지 않음
- UI가 바로 렌더 가능한 최소 계약 유지
