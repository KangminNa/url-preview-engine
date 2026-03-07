import { describe, expect, it } from 'vitest'

import { evaluateReaderContentQuality } from '../../src/content/content-quality-evaluator'
import type { ReaderBlock } from '../../src/types/metadata'

describe('content quality evaluator', () => {
  it('scores dense main content higher than noisy short content', () => {
    const richBlocks: ReaderBlock[] = [
      { type: 'text', text: '핵심 본문 제목' },
      {
        type: 'text',
        text: '사용자가 링크 진입 전에 읽어야 하는 핵심 내용이 충분한 길이로 포함되어 있습니다.',
      },
      {
        type: 'text',
        text: '추가 문단은 문맥을 보강하고 본문 신뢰도를 높이는 역할을 합니다.',
      },
      { type: 'image', src: 'https://example.com/cover.jpg', alt: 'cover' },
    ]

    const noisyBlocks: ReaderBlock[] = [
      { type: 'text', text: '추천 추천 추천' },
      { type: 'text', text: '광고 배너 메뉴' },
    ]

    const rich = evaluateReaderContentQuality({
      text: richBlocks.map((block) => (block.type === 'text' ? block.text : '')).join(' '),
      blocks: richBlocks,
      treeNodeCount: 120,
      titleHint: '핵심 본문 제목',
      mainKeywords: ['본문', '핵심', '내용'],
      noiseKeywords: ['추천', '광고', '배너', 'menu'],
      truncated: false,
    })

    const noisy = evaluateReaderContentQuality({
      text: noisyBlocks.map((block) => (block.type === 'text' ? block.text : '')).join(' '),
      blocks: noisyBlocks,
      treeNodeCount: 40,
      titleHint: '핵심 본문 제목',
      mainKeywords: ['본문', '핵심', '내용'],
      noiseKeywords: ['추천', '광고', '배너', 'menu'],
      truncated: false,
    })

    expect(rich.score).toBeGreaterThan(noisy.score)
    expect(rich.score).toBeGreaterThanOrEqual(35)
    expect(noisy.score).toBeLessThanOrEqual(45)
  })
})
