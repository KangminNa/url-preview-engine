# Normalizers

분류/판단 결과를 최종 카드 타입으로 정규화합니다.

## 역할

- `base-normalizer.ts`: 공통 필드 조립
- `video-normalizer.ts`: `VideoCard` 생성
- `article-normalizer.ts`: `ArticleCard` 생성
- `image-normalizer.ts`: `ImageCard` / `AudioCard` 생성
- `generic-normalizer.ts`: social/website/unknown 카드 생성

## 설계 포인트

- 타입별 카드 구조를 명시적으로 분리
- UI 소비를 위한 render contract 일관성 보장
