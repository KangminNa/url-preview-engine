# Test Guide

이 프로젝트는 `vitest` 기반으로 테스트를 실행합니다.

## 사전 준비

1. Node.js `18+`
2. 의존성 설치

```bash
npm install
```

## 실행 명령

```bash
# watch mode
npm test

# 전체 테스트 1회 실행
npm run test:run

# unit 테스트만 실행
npm run test:unit

# integration 테스트만 실행
npm run test:integration

# 테스트 코드 타입체크
npm run typecheck:test

# 커버리지 리포트 생성
npm run test:coverage
```

## 테스트 구조

- `tests/unit`: 네트워크 없이 순수 분류/정규화 로직 검증
- `tests/integration`: `fetch` mock을 사용해 엔진 파이프라인 통합 검증
- `tests/fixtures`: HTML fixture 등 테스트 입력 데이터
- `tests/setup.ts`: 공통 mock 정리(afterEach)

## 권장 실행 순서

1. `npm run typecheck:test`
2. `npm run test:unit`
3. `npm run test:integration`
4. `npm run test:coverage`
