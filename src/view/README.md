# View

`view/`는 추출된 block/tree를 실제 미리보기 문서(`index.html`, `preview.css`)로 변환합니다.

## 알고리즘

`semantic-tree-renderer.ts`

1. `ReaderTreeNode` 순회
2. 의미 단위 토큰으로 변환
   - heading / paragraph / image / video / iframe / list
3. heading 기준 section 분할
4. section을 조합해 semantic HTML 생성
5. CSS 클래스(`pv-*`)로 문서 스타일링

트리 렌더가 불가능하면 `default-view-engine.ts`가 block 기반 렌더로 자동 fallback 합니다.

