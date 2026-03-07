# Capabilities

분류 결과를 바탕으로 상호작용 가능성을 판단합니다.

## 역할

- `embed-capability-detector.ts`
  - metadata(`oEmbed`, `player`) + URL 패턴 기반 embed 가능 여부 판단
- `playback-capability-detector.ts`
  - direct media / mime type / embeddable 여부로 재생 가능성 판단
- `interaction-mode-resolver.ts`
  - `embeddable > playable > expandable > static` 우선순위로 최종 모드 결정

## 설계 포인트

- site 하드코딩 대신 규칙 객체(`Rule Object`) 기반 판단
- "추출된 값"이 아니라 "렌더 가능성 판단"을 반환
