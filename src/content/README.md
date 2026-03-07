# Content Layer

`content/`는 본문 추출 품질을 높이기 위한 전략 계층입니다.

## 구성

- `content-profile.ts`
  - 사이트별 추출 규칙(Strategy) 추상 클래스
- `content-profile.types.ts`
  - 프로파일 매칭 입력/룰 interface
- `content-profile-rules.ts`
  - 프로파일 규칙 병합 유틸
- `builtin-content-profiles.ts`
  - YouTube/Naver Map 기본 프로파일
- `content-profile-registry.ts`
  - 프로파일 우선순위 병합(Chain of Responsibility)
- `content-quality-evaluator.ts`
  - 추출 결과 품질 점수/등급 산출

## 목적

- 사이트 특성을 공통 엔진에서 해석 가능한 규칙으로 분리
- 정적/동적 추출 모두 동일한 규칙 적용
- 카드에 품질 신호(`content.quality`)를 제공해 fallback 판단 가능
