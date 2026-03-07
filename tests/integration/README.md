# Integration Tests

`tests/integration`은 `preview()` 전체 파이프라인이 의도대로 연결되는지 검증합니다.

## 원칙

- 실제 HTTP 서버 대신 `global fetch` mock 사용
- extractor + classifier + capability + normalizer 흐름 검증
- fixture HTML을 활용해 추출 결과를 재현 가능하게 유지

## 현재 범위

- HTML 응답에서 body tree 추출 후 article 카드 정규화
- `content-type` 기반 direct media 분류(image)
- `oEmbed`/`player` 메타 기반 embeddable capability 판정
