import { describe, expect, it, vi } from 'vitest'

import { preview } from '../../src'

describe('preview engine', () => {
  it('classifies direct image url as playable image card', async () => {
    const card = await preview('https://cdn.example.com/media/cover.png', {
      fetchHtml: false,
      dynamicFallback: false,
    })

    expect(card.provider).toBe('example')
    expect(card.resourceType).toBe('image')
    expect(card.pageKind).toBe('atomic')
    expect(card.playable).toBe(true)
    expect(card.interactionMode).toBe('playable')
  })

  it('classifies direct video url as playable video card', async () => {
    const card = await preview('https://files.example.com/videos/sample.mp4', {
      fetchHtml: false,
      dynamicFallback: false,
    })

    expect(card.resourceType).toBe('video')
    expect(card.pageKind).toBe('atomic')
    expect(card.playable).toBe(true)
  })

  it('classifies root path as homepage website card', async () => {
    const card = await preview('https://news.example.com/', {
      fetchHtml: false,
      dynamicFallback: false,
    })

    expect(card.provider).toBe('example')
    expect(card.resourceType).toBe('website')
    expect(card.pageKind).toBe('homepage')
    expect(card.interactionMode).toBe('static')
  })

  it('classifies document-like path as article card', async () => {
    const card = await preview('https://news.example.com/2026/03/08/post-slug', {
      fetchHtml: false,
      dynamicFallback: false,
    })

    expect(card.resourceType).toBe('article')
    expect(card.pageKind).toBe('atomic')
    expect(card.interactionMode).toBe('expandable')
  })

  it('detects embeddable from metadata player url without provider hardcoding', async () => {
    const html = `<!doctype html>
      <html lang="en">
        <head>
          <meta property="og:type" content="article" />
          <meta property="twitter:player" content="https://player.example.com/embed/abc" />
          <title>Player document</title>
        </head>
        <body>
          <main><article><p>본문 텍스트가 있습니다. 충분한 길이로 작성합니다.</p></article></main>
        </body>
      </html>`

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(html, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    )

    const card = await preview('https://publisher.example.com/posts/1', {
      dynamicFallback: false,
    })

    expect(card.resourceType).toBe('article')
    expect(card.embeddable).toBe(true)
    expect(card.interactionMode).toBe('embeddable')
    expect('embedUrl' in card ? card.embedUrl : undefined).toBe(
      'https://player.example.com/embed/abc',
    )
  })

  it('runs dynamic extractor when enabled and merges metadata', async () => {
    const dynamicExtractor = vi.fn().mockResolvedValue({
      title: '동적 추출 제목',
      description: '동적으로 추출된 설명',
      ogType: 'article',
      content: {
        html: '<div><p>동적 렌더링 이후 본문입니다.</p></div>',
        text: '동적 렌더링 이후 본문입니다.',
        blockCount: 1,
        truncated: false,
        tree: [
          {
            kind: 'element',
            tagName: 'div',
            children: [{ kind: 'text', text: '동적 렌더링 이후 본문입니다.' }],
          },
        ],
        treeNodeCount: 2,
      },
    })

    const card = await preview('https://example.com/posts/dynamic-doc', {
      fetchHtml: false,
      dynamicFallback: true,
      dynamicExtractor,
    })

    expect(dynamicExtractor).toHaveBeenCalledOnce()
    expect(card.title).toBe('동적 추출 제목')
    expect(card.content?.text).toContain('동적 렌더링 이후')
  })
})
