# Unit Tests

`tests/unit`은 URL 분류/상호작용 모드 결정 같은 핵심 로직을 빠르게 검증하는 계층입니다.

## 원칙

- 외부 네트워크 호출 없음
- 입력 URL 중심 결정 로직 검증
- 실패 시 원인 지점이 분명해야 함

## 현재 범위

- direct media URL: `playable` + `image/video/audio`
- root URL: `static` + `website`
- document path: `expandable` + `article`
- metadata player/oEmbed 기반 `embeddable` 판정
