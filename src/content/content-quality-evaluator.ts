import type { ReaderBlock, ReaderContentQuality } from '../types/metadata'

interface EvaluateQualityInput {
  text: string
  blocks: ReaderBlock[]
  treeNodeCount?: number
  titleHint?: string
  noiseKeywords: string[]
  mainKeywords: string[]
  truncated: boolean
}

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value))
}

const normalize = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const tokenize = (value: string): string[] => {
  const normalized = normalize(value)
  if (!normalized) {
    return []
  }

  return normalized.split(' ').filter((token) => token.length >= 2)
}

const overlapRatio = (text: string, target: string | undefined): number => {
  if (!target) {
    return 0
  }

  const textTokens = new Set(tokenize(text))
  const targetTokens = tokenize(target)
  if (textTokens.size === 0 || targetTokens.length === 0) {
    return 0
  }

  let matched = 0
  for (const token of targetTokens) {
    if (textTokens.has(token)) {
      matched += 1
    }
  }

  return clamp(matched / targetTokens.length, 0, 1)
}

const keywordHitCount = (text: string, keywords: string[]): number => {
  const normalizedText = normalize(text)
  if (!normalizedText || keywords.length === 0) {
    return 0
  }

  let hits = 0
  for (const keyword of keywords) {
    const normalizedKeyword = normalize(keyword)
    if (!normalizedKeyword) {
      continue
    }
    if (normalizedText.includes(normalizedKeyword)) {
      hits += 1
    }
  }
  return hits
}

const resolveGrade = (
  score: number,
): ReaderContentQuality['grade'] => {
  if (score >= 80) {
    return 'excellent'
  }

  if (score >= 60) {
    return 'good'
  }

  if (score >= 40) {
    return 'fair'
  }

  return 'poor'
}

export const evaluateReaderContentQuality = (
  input: EvaluateQualityInput,
): ReaderContentQuality => {
  const textLength = input.text.length
  const mediaCount = input.blocks.filter((block) => block.type !== 'text').length
  const blockCount = input.blocks.length
  const titleSimilarity = overlapRatio(input.text, input.titleHint)
  const noiseHits = keywordHitCount(input.text, input.noiseKeywords)
  const mainHits = keywordHitCount(input.text, input.mainKeywords)

  const noiseRatio =
    noiseHits + mainHits > 0 ? noiseHits / (noiseHits + mainHits) : 0

  const textScore = clamp((textLength / 1400) * 38, 0, 38)
  const blockScore = clamp((blockCount / 42) * 16, 0, 16)
  const mediaScore = clamp(mediaCount, 0, 3) * 2
  const titleScore = titleSimilarity * 16
  const mainScore = clamp(mainHits, 0, 6) * 4
  const treeScore =
    typeof input.treeNodeCount === 'number'
      ? clamp((input.treeNodeCount / 1200) * 8, 0, 8)
      : 0

  const noisePenalty = noiseRatio * 18
  const truncatedPenalty = input.truncated ? 8 : 0

  const score = clamp(
    Math.round(
      textScore +
        blockScore +
        mediaScore +
        titleScore +
        mainScore +
        treeScore -
        noisePenalty -
        truncatedPenalty,
    ),
    0,
    100,
  )

  return {
    score,
    grade: resolveGrade(score),
    signals: {
      textLength,
      blockCount,
      mediaCount,
      treeNodeCount: input.treeNodeCount,
      titleSimilarity: Number(titleSimilarity.toFixed(3)),
      noiseRatio: Number(noiseRatio.toFixed(3)),
      mainKeywordHits: mainHits,
      truncated: input.truncated,
    },
  }
}
