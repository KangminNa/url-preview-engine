import { describe, expect, it } from 'vitest'

import { recomposeReaderContent } from '../../src/extractors/content-recomposer'

describe('content recomposer', () => {
  it('removes scripts/events and keeps safe reconstructed html', () => {
    const html = `<!doctype html>
      <html>
        <body>
          <header><nav>메뉴</nav></header>
          <main>
            <article>
              <h1>본문 제목</h1>
              <p onclick="alert(1)">본문 문장입니다. 미리보기에서 보여야 합니다.</p>
              <a href="/post/1" onclick="evil()">원문 링크</a>
              <img src="/assets/cover.jpg" onerror="evil()" alt="대표 이미지" />
            </article>
          </main>
          <script>window.hack = true</script>
        </body>
      </html>`

    const content = recomposeReaderContent(html, 'https://example.com/article/1', {
      source: 'static-html',
      captureMode: 'full-body',
      minTextLength: 10,
    })

    expect(content).toBeDefined()
    expect(content?.html).toContain('<p>본문 제목</p>')
    expect(content?.html).toContain('<p>원문 링크</p>')
    expect(content?.html).toContain('src="https://example.com/assets/cover.jpg"')
    expect(content?.html).not.toContain('<script')
    expect(content?.html).not.toContain('onclick=')
    expect(content?.html).not.toContain('<a ')
    expect(content?.text).toContain('본문 문장입니다.')
    expect((content?.tree?.length ?? 0) > 0).toBe(true)
    expect((content?.treeNodeCount ?? 0) > 0).toBe(true)
    expect(content?.blocks?.some((block) => block.type === 'image')).toBe(true)
  })

  it('drops javascript href/src and keeps readable body', () => {
    const html = `<!doctype html>
      <html>
        <body>
          <article>
            <h2>보안 테스트</h2>
            <p>이 본문은 악성 속성을 제거한 뒤에도 남아야 합니다.</p>
            <a href="javascript:alert('xss')">나쁜 링크</a>
            <img src="javascript:alert('xss')" alt="bad" />
          </article>
        </body>
      </html>`

    const content = recomposeReaderContent(html, 'https://example.com/post', {
      source: 'static-html',
      captureMode: 'focused-body',
      minTextLength: 10,
    })

    expect(content).toBeDefined()
    expect(content?.html).not.toContain('javascript:')
    expect(content?.html).toContain('<p>나쁜 링크</p>')
    expect(content?.html).not.toContain('<img')
    expect(content?.text).toContain('보안 테스트')
  })

  it('recomposes content in top-to-bottom tree order', () => {
    const html = `<!doctype html>
      <html>
        <body>
          <section id="a"><h2>첫 번째 섹션</h2><p>위쪽 컨텐츠</p></section>
          <section id="b"><h2>두 번째 섹션</h2><p>아래 컨텐츠</p></section>
        </body>
      </html>`

    const content = recomposeReaderContent(html, 'https://example.com/post', {
      source: 'static-html',
      captureMode: 'full-body',
      minTextLength: 10,
    })

    expect(content).toBeDefined()
    const firstIndex = content?.html.indexOf('첫 번째 섹션') ?? -1
    const secondIndex = content?.html.indexOf('두 번째 섹션') ?? -1
    expect(firstIndex).toBeGreaterThanOrEqual(0)
    expect(secondIndex).toBeGreaterThan(firstIndex)
  })

  it('focuses content subtree when navigation noise dominates', () => {
    const html = `<!doctype html>
      <html>
        <body>
          <header>
            <nav>
              <ul>
                <li><a href="/m1">메뉴 1</a></li>
                <li><a href="/m2">메뉴 2</a></li>
                <li><a href="/m3">메뉴 3</a></li>
                <li><a href="/m4">메뉴 4</a></li>
                <li><a href="/m5">메뉴 5</a></li>
                <li><a href="/m6">메뉴 6</a></li>
              </ul>
            </nav>
          </header>
          <main id="content">
            <article>
              <h1>핵심 본문 제목</h1>
              <p>이 문단은 미리보기의 본문 영역으로 선택되어야 합니다.</p>
              <p>링크보다 텍스트 밀도가 높고 실제 콘텐츠를 설명합니다.</p>
            </article>
          </main>
        </body>
      </html>`

    const content = recomposeReaderContent(html, 'https://example.com/post', {
      source: 'static-html',
      captureMode: 'focused-body',
      focusMainContent: true,
      minTextLength: 10,
    })

    expect(content).toBeDefined()
    expect(content?.captureMode).toBe('focused-body')
    expect(content?.text).toContain('핵심 본문 제목')
    expect(content?.text).not.toContain('메뉴 1')
  })

  it('anchors subtree from heading matching title hint', () => {
    const html = `<!doctype html>
      <html>
        <head>
          <title>핵심 가이드 | Example Blog</title>
        </head>
        <body>
          <header>
            <h1>Example Blog</h1>
            <nav>
              <ul>
                <li>홈</li>
                <li>카테고리</li>
                <li>랭킹</li>
              </ul>
            </nav>
          </header>
          <main>
            <article>
              <h2>핵심 가이드</h2>
              <p>이 영역만 title-anchor로 선택되어야 합니다.</p>
              <p>실제 본문 문단입니다.</p>
            </article>
          </main>
        </body>
      </html>`

    const content = recomposeReaderContent(html, 'https://example.com/guide', {
      source: 'static-html',
      captureMode: 'focused-body',
      focusMainContent: true,
      focusTitleRoot: true,
      titleHint: '핵심 가이드 | Example Blog',
      minTextLength: 10,
    })

    expect(content).toBeDefined()
    expect(content?.text).toContain('핵심 가이드')
    expect(content?.text).toContain('실제 본문 문단입니다')
    expect(content?.text).not.toContain('카테고리')
  })

  it('rebuilds blocks with iframe/video and emits render document assets', () => {
    const html = `<!doctype html>
      <html>
        <body>
          <main>
            <h1>미리보기 문서</h1>
            <p>본문 텍스트</p>
            <video src="/videos/sample.mp4" poster="/images/poster.jpg" controls></video>
            <iframe src="https://player.example.com/embed/abc" title="샘플 플레이어"></iframe>
          </main>
        </body>
      </html>`

    const content = recomposeReaderContent(html, 'https://example.com/post', {
      source: 'static-html',
      captureMode: 'full-body',
      minTextLength: 5,
    })

    expect(content).toBeDefined()
    expect(content?.blocks?.some((block) => block.type === 'video')).toBe(true)
    expect(content?.blocks?.some((block) => block.type === 'iframe')).toBe(true)
    expect(content?.html).toContain('<video')
    expect(content?.html).toContain('<iframe')
    expect(content?.quality?.score).toBeGreaterThan(0)
    expect(content?.renderDocument?.indexHtml).toContain('preview.css')
    expect(content?.renderDocument?.css).toContain('.preview-root')
  })

  it('filters noisy subtree with site-tuned noise/main hints', () => {
    const html = `<!doctype html>
      <html>
        <body>
          <section class="sidebar-ranking">
            <h3>추천 글</h3>
            <p>사이드바 추천 컨텐츠입니다.</p>
          </section>
          <section class="content-main">
            <h1>핵심 본문</h1>
            <p>사용자가 실제로 보고 싶은 본문 데이터입니다.</p>
          </section>
        </body>
      </html>`

    const content = recomposeReaderContent(html, 'https://example.com/post', {
      source: 'static-html',
      captureMode: 'full-body',
      minTextLength: 5,
      noiseKeywords: ['sidebar', 'ranking', '추천'],
      mainKeywords: ['content', '본문'],
    })

    expect(content).toBeDefined()
    expect(content?.text).toContain('핵심 본문')
    expect(content?.text).not.toContain('사이드바 추천')
  })
})
