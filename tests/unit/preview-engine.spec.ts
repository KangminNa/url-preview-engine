import { describe, expect, it, vi } from 'vitest'

import { ContentProfile, preview } from '../../src'
import { SitePolicy } from '../../src/policies'

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

  it('applies youtube site policy without relying on metadata fetch', async () => {
    const card = await preview('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
      fetchHtml: false,
      dynamicFallback: false,
    })

    expect(card.provider).toBe('youtube')
    expect(card.resourceType).toBe('video')
    expect(card.pageKind).toBe('atomic')
    expect(card.embeddable).toBe(true)
    expect(card.playable).toBe(true)
    expect(card.interactionMode).toBe('embeddable')
    expect('embedUrl' in card ? card.embedUrl : undefined).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    )
  })

  it('supports custom site policy overrides with same preview API', async () => {
    class ExampleEmbedPolicy extends SitePolicy {
      public constructor() {
        super('example-embed', 300)
      }

      public matches(input: { url: URL; provider: string }): boolean {
        return (
          input.provider === 'example' &&
          input.url.hostname.toLowerCase().endsWith('.example.com')
        )
      }

      public refineCapability(input: Parameters<SitePolicy['refineCapability']>[0]) {
        return {
          ...input.capability,
          embeddable: true,
          embedUrl: 'https://player.example.com/embed/forced',
          interactionMode: 'embeddable',
        }
      }
    }

    const card = await preview('https://docs.example.com/2026/03/08/post', {
      fetchHtml: false,
      dynamicFallback: false,
      sitePolicies: [new ExampleEmbedPolicy()],
    })

    expect(card.provider).toBe('example')
    expect(card.embeddable).toBe(true)
    expect(card.interactionMode).toBe('embeddable')
    expect('embedUrl' in card ? card.embedUrl : undefined).toBe(
      'https://player.example.com/embed/forced',
    )
  })

  it('applies site-specific content extraction rules to reduce noisy sections', async () => {
    class ExampleContentProfile extends ContentProfile {
      public constructor() {
        super('example-content', 310)
      }

      public matches(input: { url: URL; provider: string }): boolean {
        return input.provider === 'example'
      }

      public resolveRules() {
        return {
          noiseKeywords: ['sidebar', 'ranking', '추천'],
          mainKeywords: ['content', '본문'],
        }
      }
    }

    const html = `<!doctype html>
      <html>
        <head>
          <title>Example Post</title>
        </head>
        <body>
          <section class="sidebar-ranking">
            <h3>추천</h3>
            <p>사이드바 추천 컨텐츠</p>
          </section>
          <article class="content-main">
            <h1>핵심 본문</h1>
            <p>여기가 메인 content 본문이며 사용자가 URL 진입 전에 읽고 싶은 핵심 문장입니다.</p>
          </article>
        </body>
      </html>`

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(html, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    )

    const card = await preview('https://example.com/posts/1', {
      dynamicFallback: false,
      contentProfiles: [new ExampleContentProfile()],
    })

    expect(card.content).toBeDefined()
    expect(card.content?.text).toContain('핵심 본문')
    expect(card.content?.text).not.toContain('사이드바 추천')
  })

  it('applies naver map policy using iframe matched by metadata title', async () => {
    const html = `<!doctype html>
      <html lang="ko">
        <head>
          <title>한스배럴 - 네이버지도</title>
          <meta property="og:type" content="website" />
        </head>
        <body>
          <iframe
            title="한스배럴 - 네이버지도"
            src="https://map.naver.com/p/entry/place/1827136953"
          ></iframe>
          <main><p>지도 본문</p></main>
        </body>
      </html>`

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(html, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    )

    const card = await preview(
      'https://map.naver.com/p/smart-around/place/1827136953',
      {
        dynamicFallback: false,
      },
    )

    expect(card.provider).toBe('naver')
    expect(card.title).toBe('한스배럴 - 네이버지도')
    expect(card.embeddable).toBe(true)
    expect(card.interactionMode).toBe('embeddable')
    expect('embedUrl' in card ? card.embedUrl : undefined).toBe(
      'https://map.naver.com/p/entry/place/1827136953',
    )
  })

  it('passes naver map dynamic title-anchor options to dynamic extractor', async () => {
    const html = `<!doctype html>
      <html lang="ko">
        <head>
          <title>한스배럴 - 네이버지도</title>
        </head>
        <body>
          <span class="GHAhO">한스배럴</span>
        </body>
      </html>`

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(html, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    )

    const dynamicExtractor = vi.fn().mockResolvedValue({})
    await preview('https://map.naver.com/p/smart-around/place/1827136953', {
      dynamicFallback: true,
      dynamicExtractor,
    })

    expect(dynamicExtractor).toHaveBeenCalledOnce()
    const dynamicOptions = dynamicExtractor.mock.calls[0]?.[1]
    expect(dynamicOptions?.focusTitleNearestBody).toBe(true)
    expect(dynamicOptions?.titleHint).toBe('한스배럴 - 네이버지도')
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

  it('keeps higher-quality static content when dynamic content quality is lower', async () => {
    const html = `<!doctype html>
      <html lang="ko">
        <head>
          <title>Quality Article</title>
        </head>
        <body>
          <main>
            <article>
              <h1>고품질 본문</h1>
              <p>이 문장은 사용자가 실제로 소비해야 하는 메인 콘텐츠이며 정보 밀도가 높은 텍스트입니다.</p>
              <p>추가 문단으로 본문 길이를 충분히 확보해 품질 점수가 높게 계산되도록 구성합니다.</p>
              <p>세 번째 문단은 요약, 근거, 맥락을 함께 제공하며 링크 진입 전 판단에 필요한 정보를 상세히 설명합니다.</p>
              <p>네 번째 문단은 도메인 배경과 핵심 포인트를 반복 없이 정리해서 본문 품질 평가의 텍스트 길이와 의미 밀도를 올립니다.</p>
            </article>
          </main>
        </body>
      </html>`

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(html, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    )

    const dynamicExtractor = vi.fn().mockResolvedValue({
      content: {
        html: '<p>짧음</p>',
        text: '짧음',
        blockCount: 1,
        truncated: false,
      },
    })

    const card = await preview('https://example.com/posts/quality', {
      dynamicFallback: true,
      dynamicExtractor,
    })

    expect(dynamicExtractor).toHaveBeenCalledOnce()
    expect(card.content?.text).toContain('고품질 본문')
    expect(card.content?.text).not.toBe('짧음')
    expect(card.content?.quality?.score).toBeGreaterThan(0)
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
