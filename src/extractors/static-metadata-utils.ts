import type {
  ContentSnapshot,
  ExtractedMetadata,
  ReaderContent,
} from '../types/metadata'
import { stripHtmlTags } from './content-recomposer'

const MAX_HIGHLIGHTS = 5
const MAX_KEYWORDS = 10

const normalizeText = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined
  }

  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized.length > 0 ? normalized : undefined
}

const normalizeArray = (
  values: string[] | undefined,
  maxItems: number,
): string[] | undefined => {
  if (!values || values.length === 0) {
    return undefined
  }

  const deduped = Array.from(
    new Set(
      values
        .map((item) => normalizeText(item))
        .filter((item): item is string => Boolean(item)),
    ),
  )

  if (deduped.length === 0) {
    return undefined
  }

  return deduped.slice(0, maxItems)
}

const resolveRelativeUrl = (
  candidate: string | undefined,
  baseUrl: string,
): string | undefined => {
  const normalized = normalizeText(candidate)
  if (!normalized) {
    return undefined
  }

  try {
    return new URL(normalized, baseUrl).toString()
  } catch {
    return undefined
  }
}

const matchMetaTag = (html: string, key: string): string | undefined => {
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    'i',
  )
  return pattern.exec(html)?.[1]
}

const matchTitle = (html: string): string | undefined => {
  return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim()
}

const matchHtmlLanguage = (html: string): string | undefined => {
  return normalizeText(html.match(/<html[^>]*\slang=["']([^"']+)["']/i)?.[1])
}

const matchFavicon = (html: string, baseUrl: string): string | undefined => {
  const href = html.match(
    /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>/i,
  )?.[1]

  return resolveRelativeUrl(href, baseUrl)
}

const extractKeywords = (html: string): string[] | undefined => {
  const raw = matchMetaTag(html, 'keywords')
  if (!raw) {
    return undefined
  }

  return normalizeArray(raw.split(',').map((item) => item.trim()), MAX_KEYWORDS)
}

const extractTagTexts = (html: string, tagPattern: RegExp): string[] => {
  return Array.from(html.matchAll(tagPattern))
    .map((match) => stripHtmlTags(match[1] ?? ''))
    .map((value) => normalizeText(value))
    .filter((value): value is string => Boolean(value))
}

const extractHighlights = (html: string): string[] | undefined => {
  const headings = extractTagTexts(html, /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)
    .filter((value) => value.length >= 6)
    .slice(0, 3)
  const paragraphs = extractTagTexts(html, /<p[^>]*>([\s\S]*?)<\/p>/gi)
    .filter((value) => value.length >= 40)
    .slice(0, 3)

  return normalizeArray([...headings, ...paragraphs], MAX_HIGHLIGHTS)
}

const extractWordCount = (text: string): number | undefined => {
  if (text.length === 0) {
    return undefined
  }

  const count = text.split(/\s+/).filter(Boolean).length
  return count > 0 ? count : undefined
}

const buildSnapshot = (
  html: string,
  baseUrl: string,
  readerContent: ReaderContent | undefined,
): ContentSnapshot | undefined => {
  const baselineText = readerContent?.text ?? stripHtmlTags(html)
  const wordCount = extractWordCount(baselineText)

  const snapshot: ContentSnapshot = {
    language: matchHtmlLanguage(html),
    faviconUrl: matchFavicon(html, baseUrl),
    estimatedReadingMinutes: wordCount
      ? Math.max(1, Math.round(wordCount / 220))
      : undefined,
    wordCount,
    keywords: extractKeywords(html),
    highlights: extractHighlights(readerContent?.html ?? html),
  }

  const hasSnapshotData = Object.values(snapshot).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0
    }

    return value !== undefined
  })

  return hasSnapshotData ? snapshot : undefined
}

const matchOEmbedUrl = (html: string, baseUrl: string): string | undefined => {
  const href = html.match(
    /<link[^>]+type=["']application\/(?:json|xml)\+oembed["'][^>]+href=["']([^"']+)["'][^>]*>/i,
  )?.[1]
  return resolveRelativeUrl(href, baseUrl)
}

const readTagAttribute = (
  tag: string,
  attribute: string,
): string | undefined => {
  const pattern = new RegExp(
    `${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>"']+))`,
    'i',
  )
  const match = pattern.exec(tag)
  return normalizeText(match?.[1] ?? match?.[2] ?? match?.[3])
}

const normalizeMatchText = (value: string | undefined): string | undefined => {
  const normalized = normalizeText(value)
  if (!normalized) {
    return undefined
  }

  return normalized
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const buildTitleCandidates = (title: string | undefined): string[] => {
  const base = normalizeMatchText(title)
  if (!base) {
    return []
  }

  const parts = title
    ?.split(/\s*(?:\||-|:|·|•|›|»)\s*/g)
    .map((part) => normalizeMatchText(part))
    .filter((part): part is string => Boolean(part && part.length >= 2))

  return Array.from(new Set([base, ...(parts ?? [])])).slice(0, 6)
}

const scoreTitleSimilarity = (
  iframeTitle: string | undefined,
  titleCandidates: string[],
): number => {
  const target = normalizeMatchText(iframeTitle)
  if (!target || titleCandidates.length === 0) {
    return 0
  }

  let best = 0
  for (const candidate of titleCandidates) {
    if (target.includes(candidate)) {
      best = Math.max(best, 1)
      continue
    }

    const tokens = candidate.split(' ').filter((token) => token.length >= 2)
    if (tokens.length === 0) {
      continue
    }

    const matched = tokens.filter((token) => target.includes(token)).length
    best = Math.max(best, matched / tokens.length)
  }

  return best
}

const matchIframePlayerUrl = (
  html: string,
  baseUrl: string,
  titleHint?: string,
): string | undefined => {
  const titleCandidates = buildTitleCandidates(titleHint)
  const iframes = Array.from(html.matchAll(/<iframe\b[^>]*>/gi))
  if (iframes.length === 0) {
    return undefined
  }

  let bestUrl: string | undefined
  let bestScore = 0

  for (const match of iframes) {
    const tag = match[0]
    const src = resolveRelativeUrl(readTagAttribute(tag, 'src'), baseUrl)
    if (!src) {
      continue
    }

    if (titleCandidates.length === 0) {
      return src
    }

    const iframeTitle = readTagAttribute(tag, 'title')
    const score = scoreTitleSimilarity(iframeTitle, titleCandidates)
    if (score > bestScore) {
      bestScore = score
      bestUrl = src
    }
  }

  if (bestUrl && bestScore >= 0.5) {
    return bestUrl
  }

  return undefined
}

const mergeSnapshots = (
  primary: ContentSnapshot | undefined,
  fallback: ContentSnapshot | undefined,
): ContentSnapshot | undefined => {
  if (!primary && !fallback) {
    return undefined
  }

  const merged: ContentSnapshot = {
    language: primary?.language ?? fallback?.language,
    faviconUrl: primary?.faviconUrl ?? fallback?.faviconUrl,
    estimatedReadingMinutes:
      primary?.estimatedReadingMinutes ?? fallback?.estimatedReadingMinutes,
    wordCount: primary?.wordCount ?? fallback?.wordCount,
    keywords: primary?.keywords ?? fallback?.keywords,
    highlights: primary?.highlights ?? fallback?.highlights,
  }

  const hasData = Object.values(merged).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0
    }

    return value !== undefined
  })

  return hasData ? merged : undefined
}

export const buildStaticFallbackMetadata = (
  html: string,
  url: string,
  readerContent?: ReaderContent,
): ExtractedMetadata => {
  const fallbackTitle = matchTitle(html)
  const iframePlayerUrl = matchIframePlayerUrl(html, url, fallbackTitle)

  const description =
    matchMetaTag(html, 'description') ?? matchMetaTag(html, 'og:description')

  const firstParagraph = extractTagTexts(
    readerContent?.html ?? html,
    /<p[^>]*>([\s\S]*?)<\/p>/gi,
  ).find((value) => value.length >= 60)

  const canonicalUrl = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i,
  )?.[1]

  const playerUrl =
    matchMetaTag(html, 'twitter:player') ??
    matchMetaTag(html, 'og:video') ??
    matchMetaTag(html, 'og:video:url') ??
    matchMetaTag(html, 'og:video:secure_url') ??
    iframePlayerUrl

  return {
    title: fallbackTitle,
    description,
    imageUrl: matchMetaTag(html, 'og:image'),
    siteName: matchMetaTag(html, 'og:site_name'),
    author: matchMetaTag(html, 'author'),
    publishedAt: matchMetaTag(html, 'article:published_time'),
    canonicalUrl,
    ogType: matchMetaTag(html, 'og:type'),
    excerpt: firstParagraph,
    oEmbedUrl: matchOEmbedUrl(html, url),
    playerUrl,
    snapshot: buildSnapshot(html, url, readerContent),
    content: readerContent,
  }
}

export const mergeStaticMetadata = (
  primary: ExtractedMetadata,
  fallback: ExtractedMetadata,
): ExtractedMetadata => ({
  title: normalizeText(primary.title) ?? normalizeText(fallback.title),
  description:
    normalizeText(primary.description) ?? normalizeText(fallback.description),
  imageUrl: normalizeText(primary.imageUrl) ?? normalizeText(fallback.imageUrl),
  siteName: normalizeText(primary.siteName) ?? normalizeText(fallback.siteName),
  author: normalizeText(primary.author) ?? normalizeText(fallback.author),
  publishedAt:
    normalizeText(primary.publishedAt) ?? normalizeText(fallback.publishedAt),
  canonicalUrl:
    normalizeText(primary.canonicalUrl) ?? normalizeText(fallback.canonicalUrl),
  ogType: normalizeText(primary.ogType) ?? normalizeText(fallback.ogType),
  excerpt: normalizeText(primary.excerpt) ?? normalizeText(fallback.excerpt),
  duration: primary.duration ?? fallback.duration,
  mimeType: normalizeText(primary.mimeType) ?? normalizeText(fallback.mimeType),
  oEmbedUrl: normalizeText(primary.oEmbedUrl) ?? normalizeText(fallback.oEmbedUrl),
  playerUrl: normalizeText(primary.playerUrl) ?? normalizeText(fallback.playerUrl),
  snapshot: mergeSnapshots(primary.snapshot, fallback.snapshot),
  content: primary.content ?? fallback.content,
})

export const mergeDynamicMetadata = (
  primary: ExtractedMetadata,
  fallback: ExtractedMetadata,
): ExtractedMetadata => ({
  title: primary.title ?? fallback.title,
  description: primary.description ?? fallback.description,
  imageUrl: primary.imageUrl ?? fallback.imageUrl,
  siteName: primary.siteName ?? fallback.siteName,
  author: primary.author ?? fallback.author,
  publishedAt: primary.publishedAt ?? fallback.publishedAt,
  canonicalUrl: primary.canonicalUrl ?? fallback.canonicalUrl,
  excerpt: primary.excerpt ?? fallback.excerpt,
  duration: primary.duration ?? fallback.duration,
  mimeType: primary.mimeType ?? fallback.mimeType,
  ogType: primary.ogType ?? fallback.ogType,
  oEmbedUrl: primary.oEmbedUrl ?? fallback.oEmbedUrl,
  playerUrl: primary.playerUrl ?? fallback.playerUrl,
  snapshot: primary.snapshot ?? fallback.snapshot,
  content: primary.content ?? fallback.content,
})

export const resolveExcerptFromText = (text: string): string | undefined => {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length < 60) {
    return undefined
  }

  return normalized.slice(0, 320)
}
