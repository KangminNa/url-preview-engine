# 기획 문서

## 프로젝트 한 줄 정의

URL을 interaction-aware preview card object로 변환하는 embed-capable preview engine.

## 진짜 목표

이 프로젝트는 단순 링크 카드 생성기가 아니라, URL의 **소비 가능성(interaction capability)** 을 판별해 가능한 수준까지 카드 내부 소비를 허용하는 엔진이다.

즉 URL마다 아래를 판단한다.

- 임베드 가능한가
- 재생 가능한가
- 펼침 가능한가
- 정적 카드만 가능한가

## 핵심 문제 정의

### A. 직접 소비 가능한 URL

- YouTube/Vimeo 동영상
- 직접 이미지/오디오/비디오 URL
- 일부 소셜 포스트
- oEmbed 지원 리소스

### B. 직접 소비 불가능한 URL

- 일반 기사/블로그
- 홈페이지
- 컬렉션/프로필 페이지
- 로그인/정책 제한 페이지

프로젝트 목표는 모든 URL 임베드가 아니라, URL capability에 맞춰 안전한 렌더 계약을 반환하는 것이다.

## MVP 목표

1. provider 판별
2. resource type / page kind 분류
3. embed/playback capability 판별
4. interaction mode 결정
5. fallback 카드로 자연스러운 하향

## 판단 축

1. Provider: `youtube | vimeo | instagram | medium | naver-blog | generic | unknown`
2. Resource Type: `video | social | article | image | audio | website | unknown`
3. Page Kind: `atomic | homepage | collection | profile | unknown`
4. Interaction Capability: `static | expandable | playable | embeddable`

## 설계 원칙

1. 모든 URL을 embed하려고 하지 않는다.
2. embed 가능성은 metadata 존재 여부가 아니라 정책/패턴/렌더 가능성까지 포함한 판단 결과다.
3. rich interaction은 atomic resource에 우선 제공한다.
4. 산출물은 UI 데이터가 아니라 render contract다.

## MVP 우선순위

1순위:

- YouTube
- 일반 article/blog
- direct image URL

2순위:

- Instagram
- Vimeo
- direct audio URL

3순위:

- generic homepage/profile/collection fallback 강화

## 최종 산출물

반환 객체에는 최소 아래가 항상 있어야 한다.

- `provider`
- `resourceType`
- `pageKind`
- `embeddable`
- `playable`
- `interactionMode`
