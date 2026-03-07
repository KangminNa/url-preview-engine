import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { preview } from '../../src'

const currentDir = dirname(fileURLToPath(import.meta.url))
const articleHtml = readFileSync(
  join(currentDir, '../fixtures/article-page.html'),
  'utf8',
)

describe('preview integration (mocked fetch)', () => {
  it('extracts tree-based body content from static html response', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(articleHtml, {
          status: 200,
          headers: {
            'content-type': 'text/html; charset=utf-8',
          },
        }),
      )

    const card = await preview('https://docs.example.com/2026/03/08/test-post', {
      dynamicFallback: false,
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(card.provider).toBe('example')
    expect(card.resourceType).toBe('article')
    expect(card.pageKind).toBe('atomic')
    expect(card.interactionMode).toBe('expandable')
    expect(card.title).toBe('테스트 아티클 제목')
    expect(card.content?.blockCount).toBeGreaterThan(0)
    expect((card.content?.treeNodeCount ?? 0) > 0).toBe(true)
    expect(card.content?.html).toContain('테스트 아티클 제목')
    expect(card.content?.text).toContain('링크를 클릭하지 않아도')
  })

  it('classifies media by content-type response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('binary', {
        status: 200,
        headers: {
          'content-type': 'image/png',
        },
      }),
    )

    const card = await preview('https://assets.example.com/media/cover', {
      dynamicFallback: false,
    })

    expect(card.resourceType).toBe('image')
    expect(card.pageKind).toBe('atomic')
    expect(card.playable).toBe(true)
  })

  it('classifies sparse js-app shell html as website/static', async () => {
    const shellHtml = `<!doctype html>
      <html lang="ko">
        <head>
          <meta property="og:type" content="website" />
          <script type="module" src="/assets/app.js"></script>
        </head>
        <body>
          <div id="root"></div>
        </body>
      </html>`

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(shellHtml, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    )

    const card = await preview('https://app.example.com/p/place/1827136953', {
      dynamicFallback: false,
    })

    expect(card.resourceType).toBe('website')
    expect(card.interactionMode).toBe('static')
  })

  it('detects embeddable from oembed link tag', async () => {
    const html = `<!doctype html>
      <html lang="en">
        <head>
          <title>oEmbed Test</title>
          <meta property="og:type" content="article" />
          <link rel="alternate" type="application/json+oembed" href="https://api.example.com/oembed?url=https://news.example.com/post/1" />
        </head>
        <body>
          <main><article><h1>문서 제목</h1><p>본문 데이터입니다. 충분한 길이로 작성합니다.</p></article></main>
        </body>
      </html>`

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(html, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    )

    const card = await preview('https://news.example.com/post/1', {
      dynamicFallback: false,
    })

    expect(card.resourceType).toBe('article')
    expect(card.embeddable).toBe(true)
    expect(card.interactionMode).toBe('embeddable')
    expect('embedUrl' in card ? card.embedUrl : undefined).toBe(
      'https://api.example.com/oembed?url=https://news.example.com/post/1',
    )
  })

  it('keeps tree payload when dynamic extractor is used', async () => {
    const dynamicExtractor = vi.fn().mockResolvedValue({
      title: '동적 문서',
      ogType: 'article',
      content: {
        html: '<main><article><p>동적 본문입니다.</p></article></main>',
        text: '동적 본문입니다.',
        blockCount: 2,
        truncated: false,
        tree: [
          {
            kind: 'element',
            tagName: 'main',
            children: [
              {
                kind: 'element',
                tagName: 'article',
                children: [{ kind: 'text', text: '동적 본문입니다.' }],
              },
            ],
          },
        ],
        treeNodeCount: 3,
      },
    })

    const card = await preview('https://example.com/path/doc', {
      fetchHtml: false,
      dynamicFallback: true,
      dynamicExtractor,
    })

    expect(dynamicExtractor).toHaveBeenCalledOnce()
    expect(card.title).toBe('동적 문서')
    expect((card.content?.treeNodeCount ?? 0) > 0).toBe(true)
    expect(card.content?.text).toContain('동적 본문')
  })
})
