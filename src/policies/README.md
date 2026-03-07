# Policies

사이트별 대응 규칙을 `SitePolicy` 추상 클래스로 분리합니다.

## 목적

- `preview(url, options)` API는 그대로 유지
- 공통 엔진 흐름은 유지하면서 사이트별 정책만 교체/추가
- URL/metadata/classification/capability/card 단계별 훅 제공
- 본문 추출 튜닝은 `content/ContentProfile`에서 담당하고, 이 레이어는
  classification/capability/card 보정에 집중

## 구성

- `site-policy.ts`
  - 사이트 정책 추상 클래스
- `policy-registry.ts`
  - 정책 등록/매칭/우선순위 관리
- `youtube-site-policy.ts`
  - 기본 제공 정책 예시 (YouTube)
- `naver-map-site-policy.ts`
  - 네이버 지도 iframe 기반 임베드 capability 보정

## 사용

```ts
import { preview, SitePolicy } from 'url-preview-engine'

class MyPolicy extends SitePolicy {
  constructor() {
    super('my-policy', 300)
  }

  matches(input) {
    return input.provider === 'example'
  }
}

const card = await preview('https://example.com/post/1', {
  sitePolicies: [new MyPolicy()],
})
```
