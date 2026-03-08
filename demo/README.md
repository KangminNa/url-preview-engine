# Demo App

로컬에서 preview 엔진 결과를 화면으로 확인하는 데모입니다.

## 실행

```bash
npm run demo
```

기본 주소:

- `http://localhost:4173`

포트를 바꾸려면:

```bash
PORT=5000 npm run demo
```

## 구성

- `demo/server.mjs`: 정적 파일 + `/api/preview` + `/api/compare` API 서버
- `demo/public/index.html`: 입력 폼과 결과 레이아웃
- `demo/public/app.js`: URL 제출/카드 렌더링/JSON/오픈소스 비교 출력
  - 카드 내부 `Render Document` 섹션에서 `index.html`/`preview.css` 확인 가능
- `demo/public/styles.css`: 데모 UI 스타일

## 비교 대상 오픈소스

- `metascraper`
- `open-graph-scraper`
- `link-preview-js`
