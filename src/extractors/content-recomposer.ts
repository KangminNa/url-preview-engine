import type {
  ReaderBlock,
  ReaderContent,
  ReaderTreeNode,
} from '../types/metadata'
import { evaluateReaderContentQuality } from '../content/content-quality-evaluator'
import { createDefaultViewEngine } from '../view/default-view-engine'

type AttributeValue = string | true
type InternalNode = InternalElementNode | InternalTextNode

interface InternalTextNode {
  kind: 'text'
  text: string
}

interface InternalElementNode {
  kind: 'element'
  tagName: string
  attrs: Record<string, AttributeValue>
  children: InternalNode[]
}

interface TreeLimitState {
  count: number
  limit: number
  truncated: boolean
}

interface RenderOptions {
  maxBlocks: number
  maxHtmlLength: number
  maxTextLength: number
  minTextLength: number
  titleHint?: string
}

interface RenderResult {
  html: string
  text: string
  blockCount: number
  truncated: boolean
  blocks: ReaderBlock[]
  renderDocument: ReaderContent['renderDocument']
}

interface FocusStats {
  textLength: number
  linkTextLength: number
  imageCount: number
  elementCount: number
}

interface FocusCandidate {
  node: InternalElementNode
  score: number
  textLength: number
}

interface TitleAnchorCandidate {
  node: InternalElementNode
  score: number
}

interface NoiseControl {
  noiseKeywords: string[]
  mainKeywords: string[]
  dropTags: Set<string>
}

export interface RecomposeOptions {
  source?: ReaderContent['source']
  captureMode?: ReaderContent['captureMode']
  maxBlocks?: number
  maxTreeNodes?: number
  maxHtmlLength?: number
  maxTextLength?: number
  minTextLength?: number
  focusMainContent?: boolean
  focusThreshold?: number
  focusTitleRoot?: boolean
  titleHint?: string
  noiseKeywords?: string[]
  mainKeywords?: string[]
  dropTags?: string[]
}

const DEFAULT_MAX_BLOCKS = 900
const DEFAULT_MAX_TREE_NODES = 4_000
const DEFAULT_MAX_HTML_LENGTH = 240_000
const DEFAULT_MAX_TEXT_LENGTH = 180_000
const DEFAULT_MIN_TEXT_LENGTH = 40
const DEFAULT_FOCUS_THRESHOLD = 180

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

const DROP_TAGS = new Set([
  'script',
  'style',
  'noscript',
  'template',
  'svg',
  'canvas',
  'object',
  'embed',
  'head',
])

const UNWRAP_TAGS = new Set(['html', 'body'])

const GLOBAL_ALLOWED_ATTRS = new Set([
  'id',
  'class',
  'role',
  'title',
  'aria-label',
  'lang',
  'dir',
])

const ATTRS_BY_TAG: Record<string, Set<string>> = {
  a: new Set(['href']),
  img: new Set(['src', 'data-src', 'alt', 'width', 'height', 'loading', 'decoding']),
  video: new Set(['src', 'poster', 'controls', 'autoplay', 'muted', 'loop', 'playsinline']),
  audio: new Set(['src', 'controls', 'autoplay', 'muted', 'loop']),
  iframe: new Set([
    'src',
    'title',
    'loading',
    'allow',
    'allowfullscreen',
    'referrerpolicy',
  ]),
  source: new Set(['src', 'type', 'media']),
  picture: new Set(['src']),
}

const BLOCK_BREAK_TAGS = new Set([
  'main',
  'article',
  'section',
  'div',
  'p',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'pre',
  'table',
  'tr',
  'td',
  'th',
  'video',
  'audio',
  'iframe',
])

const FOCUSABLE_TAGS = new Set(['main', 'article', 'section', 'div'])
const PRIMARY_CONTENT_TAGS = new Set(['main', 'article'])
const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4'])

const POSITIVE_HINT_PATTERN =
  /(content|main|article|post|entry|story|body|detail|viewer|view|read|doc|document|place|panel)/i

const NEGATIVE_HINT_PATTERN =
  /(nav|menu|header|footer|sidebar|toolbar|tabbar|share|ad|banner|popup|modal|cookie|login|search|gnb|lnb|snb)/i

const ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  nbsp: ' ',
  apos: "'",
  '#39': "'",
}

const TITLE_SPLIT_PATTERN = /\s*(?:\||-|:|·|•|›|»)\s*/g
const defaultViewEngine = createDefaultViewEngine()
const DEFAULT_DROP_TAGS = new Set(['nav', 'aside', 'footer'])
const DEFAULT_NOISE_KEYWORDS = [
  'nav',
  'menu',
  'footer',
  'sidebar',
  'banner',
  'advert',
  'ad-',
  'promo',
  'recommend',
  'related',
  'ranking',
  'gnb',
  'lnb',
  'snb',
  '댓글',
  '인기',
  '추천',
  '광고',
]
const DEFAULT_MAIN_KEYWORDS = [
  'content',
  'article',
  'post',
  'story',
  'detail',
  'viewer',
  'read',
  'doc',
  '본문',
  '콘텐츠',
  '내용',
]

const emptyFocusStats = (): FocusStats => ({
  textLength: 0,
  linkTextLength: 0,
  imageCount: 0,
  elementCount: 0,
})

const mergeFocusStats = (left: FocusStats, right: FocusStats): FocusStats => ({
  textLength: left.textLength + right.textLength,
  linkTextLength: left.linkTextLength + right.linkTextLength,
  imageCount: left.imageCount + right.imageCount,
  elementCount: left.elementCount + right.elementCount,
})

const normalizeMatchText = (value: string | undefined | null): string => {
  if (!value) {
    return ''
  }

  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const normalizeKeyword = (value: string | undefined | null): string | undefined => {
  if (!value) {
    return undefined
  }

  const normalized = value.toLowerCase().trim()
  return normalized.length > 1 ? normalized : undefined
}

const mergeKeywords = (base: string[], extra: string[] | undefined): string[] => {
  const normalized = extra
    ?.map((keyword) => normalizeKeyword(keyword))
    .filter((keyword): keyword is string => Boolean(keyword))

  if (!normalized || normalized.length === 0) {
    return base
  }

  return Array.from(new Set([...base, ...normalized]))
}

const buildNoiseControl = (options: RecomposeOptions): NoiseControl => {
  const dropTags = new Set(
    (options.dropTags ?? [])
      .map((tag) => normalizeKeyword(tag))
      .filter((tag): tag is string => Boolean(tag)),
  )

  for (const tag of DEFAULT_DROP_TAGS) {
    dropTags.add(tag)
  }

  return {
    noiseKeywords: mergeKeywords(DEFAULT_NOISE_KEYWORDS, options.noiseKeywords),
    mainKeywords: mergeKeywords(DEFAULT_MAIN_KEYWORDS, options.mainKeywords),
    dropTags,
  }
}

const includesKeyword = (text: string, keywords: string[]): boolean => {
  if (!text) {
    return false
  }

  return keywords.some((keyword) => text.includes(keyword))
}

const buildTitleCandidates = (titleHint: string): string[] => {
  const base = normalizeMatchText(titleHint)
  if (!base) {
    return []
  }

  const parts = titleHint
    .split(TITLE_SPLIT_PATTERN)
    .map((part) => normalizeMatchText(part))
    .filter((part) => part.length >= 3)

  const deduped = Array.from(new Set([base, ...parts]))
  return deduped.slice(0, 6)
}

const scoreTitleMatch = (
  candidateText: string,
  normalizedCandidates: string[],
): number => {
  const target = normalizeMatchText(candidateText)
  if (!target || normalizedCandidates.length === 0) {
    return 0
  }

  let best = 0
  for (const candidate of normalizedCandidates) {
    if (!candidate) {
      continue
    }

    if (target.includes(candidate)) {
      const score = Math.min(1, candidate.length / Math.max(1, target.length))
      best = Math.max(best, 0.65 + score * 0.35)
      continue
    }

    const tokens = candidate.split(' ').filter((token) => token.length >= 2)
    if (tokens.length === 0) {
      continue
    }

    let matched = 0
    for (const token of tokens) {
      if (target.includes(token)) {
        matched += 1
      }
    }

    const overlap = matched / tokens.length
    best = Math.max(best, overlap * 0.7)
  }

  return best
}

const decodeHtmlEntities = (value: string): string => {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z0-9#]+);/g, (_, entity: string) => {
    const lowered = entity.toLowerCase()
    if (ENTITY_MAP[lowered]) {
      return ENTITY_MAP[lowered]
    }

    if (lowered.startsWith('#x')) {
      const code = Number.parseInt(lowered.slice(2), 16)
      if (Number.isFinite(code)) {
        return String.fromCodePoint(code)
      }
      return ''
    }

    if (lowered.startsWith('#')) {
      const code = Number.parseInt(lowered.slice(1), 10)
      if (Number.isFinite(code)) {
        return String.fromCodePoint(code)
      }
      return ''
    }

    return ''
  })
}

const normalizeText = (value: string | undefined | null): string | undefined => {
  if (!value) {
    return undefined
  }

  const normalized = decodeHtmlEntities(value).replace(/\s+/g, ' ').trim()
  return normalized.length > 0 ? normalized : undefined
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

const isAllowedHrefProtocol = (url: URL): boolean => {
  return (
    url.protocol === 'http:' ||
    url.protocol === 'https:' ||
    url.protocol === 'mailto:' ||
    url.protocol === 'tel:'
  )
}

const isAllowedSrcProtocol = (url: URL): boolean => {
  return url.protocol === 'http:' || url.protocol === 'https:'
}

const sanitizeLinkTarget = (raw: string | undefined, baseUrl: string): string | undefined => {
  const resolved = resolveRelativeUrl(raw, baseUrl)
  if (!resolved) {
    return undefined
  }

  try {
    const parsed = new URL(resolved)
    return isAllowedHrefProtocol(parsed) ? parsed.toString() : undefined
  } catch {
    return undefined
  }
}

const sanitizeMediaSource = (raw: string | undefined, baseUrl: string): string | undefined => {
  const resolved = resolveRelativeUrl(raw, baseUrl)
  if (!resolved) {
    return undefined
  }

  try {
    const parsed = new URL(resolved)
    return isAllowedSrcProtocol(parsed) ? parsed.toString() : undefined
  } catch {
    return undefined
  }
}

const parseTagName = (token: string): string | undefined => {
  const name = token.match(/^<\s*\/?\s*([a-zA-Z0-9:-]+)/)?.[1]
  return name?.toLowerCase()
}

const extractAttributeSource = (token: string, tagName: string): string => {
  const startPattern = new RegExp(`^<\\s*${tagName}\\s*`, 'i')
  return token.replace(startPattern, '').replace(/\/?\s*>$/, '')
}

const parseAttributes = (source: string): Record<string, AttributeValue> => {
  const output: Record<string, AttributeValue> = {}
  const pattern = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+)))?/g

  let match = pattern.exec(source)
  while (match) {
    const name = (match[1] ?? '').toLowerCase()
    if (!name || name === '/') {
      match = pattern.exec(source)
      continue
    }

    const raw = match[2] ?? match[3] ?? match[4]
    output[name] = raw === undefined ? true : decodeHtmlEntities(raw)
    match = pattern.exec(source)
  }

  return output
}

const createRoot = (): InternalElementNode => ({
  kind: 'element',
  tagName: 'root',
  attrs: {},
  children: [],
})

const parseHtmlTree = (html: string): InternalElementNode => {
  const root = createRoot()
  const stack: InternalElementNode[] = [root]
  const tokens = html.match(/<!--[\s\S]*?-->|<\/?[^>]+>|[^<]+/g) ?? []

  for (const token of tokens) {
    if (token.startsWith('<!--')) {
      continue
    }

    if (token.startsWith('</')) {
      const closeTag = parseTagName(token)
      if (!closeTag) {
        continue
      }

      for (let index = stack.length - 1; index > 0; index -= 1) {
        if (stack[index]?.tagName === closeTag) {
          stack.length = index
          break
        }
      }
      continue
    }

    if (token.startsWith('<')) {
      if (/^<\s*!/i.test(token) || /^<\s*\?/i.test(token)) {
        continue
      }

      const tagName = parseTagName(token)
      if (!tagName) {
        continue
      }

      const node: InternalElementNode = {
        kind: 'element',
        tagName,
        attrs: parseAttributes(extractAttributeSource(token, tagName)),
        children: [],
      }

      stack[stack.length - 1]?.children.push(node)

      const selfClosing = token.endsWith('/>') || VOID_TAGS.has(tagName)
      if (!selfClosing) {
        stack.push(node)
      }
      continue
    }

    stack[stack.length - 1]?.children.push({
      kind: 'text',
      text: token,
    })
  }

  return root
}

const isSafeAttrName = (tagName: string, name: string): boolean => {
  if (name.startsWith('on') || name === 'style' || name === 'srcdoc') {
    return false
  }

  if (name.startsWith('data-') || name.startsWith('aria-')) {
    return true
  }

  if (GLOBAL_ALLOWED_ATTRS.has(name)) {
    return true
  }

  return ATTRS_BY_TAG[tagName]?.has(name) ?? false
}

const sanitizeAttributes = (
  tagName: string,
  attrs: Record<string, AttributeValue>,
  baseUrl: string,
): Record<string, AttributeValue> => {
  const sanitized: Record<string, AttributeValue> = {}

  for (const [name, raw] of Object.entries(attrs)) {
    if (!isSafeAttrName(tagName, name)) {
      continue
    }

    if (raw === true) {
      sanitized[name] = true
      continue
    }

    const value = normalizeText(raw)
    if (!value) {
      continue
    }

    if (name === 'href') {
      const href = sanitizeLinkTarget(value, baseUrl)
      if (href) {
        sanitized.href = href
      }
      continue
    }

    if (name === 'src' || name === 'data-src' || name === 'poster') {
      const src = sanitizeMediaSource(value, baseUrl)
      if (src) {
        if (name === 'poster') {
          sanitized.poster = src
        } else {
          sanitized.src = src
        }
      }
      continue
    }

    sanitized[name] = value
  }

  return sanitized
}

const sanitizeInternalNode = (node: InternalNode, baseUrl: string): InternalNode[] => {
  if (node.kind === 'text') {
    const text = normalizeText(node.text)
    return text ? [{ kind: 'text', text }] : []
  }

  const tagName = node.tagName.toLowerCase()
  if (DROP_TAGS.has(tagName)) {
    return []
  }

  const children = node.children.flatMap((child) => sanitizeInternalNode(child, baseUrl))
  if (UNWRAP_TAGS.has(tagName)) {
    return children
  }

  const attrs = sanitizeAttributes(tagName, node.attrs, baseUrl)
  if (tagName === 'img' && typeof attrs.src !== 'string') {
    return []
  }

  if (tagName === 'iframe' && typeof attrs.src !== 'string') {
    return []
  }

  return [
    {
      kind: 'element',
      tagName,
      attrs,
      children,
    },
  ]
}

const sanitizeTreeInputNode = (node: ReaderTreeNode, baseUrl: string): InternalNode[] => {
  if (node.kind === 'text') {
    const text = normalizeText(node.text)
    return text ? [{ kind: 'text', text }] : []
  }

  const attrs = sanitizeAttributes(node.tagName.toLowerCase(), node.attrs ?? {}, baseUrl)
  const children = node.children.flatMap((child) => sanitizeTreeInputNode(child, baseUrl))
  return sanitizeInternalNode(
    {
      kind: 'element',
      tagName: node.tagName.toLowerCase(),
      attrs,
      children,
    },
    baseUrl,
  )
}

const toReaderTreeNode = (node: InternalNode, state: TreeLimitState): ReaderTreeNode | undefined => {
  if (state.count >= state.limit) {
    state.truncated = true
    return undefined
  }

  state.count += 1

  if (node.kind === 'text') {
    return {
      kind: 'text',
      text: node.text,
    }
  }

  const children: ReaderTreeNode[] = []
  for (const child of node.children) {
    const next = toReaderTreeNode(child, state)
    if (!next) {
      break
    }
    children.push(next)
  }

  if (children.length < node.children.length) {
    state.truncated = true
  }

  if (Object.keys(node.attrs).length === 0) {
    return {
      kind: 'element',
      tagName: node.tagName,
      children,
    }
  }

  return {
    kind: 'element',
    tagName: node.tagName,
    attrs: node.attrs,
    children,
  }
}

const limitTreeNodes = (
  nodes: InternalNode[],
  maxTreeNodes: number,
): {
  tree: ReaderTreeNode[] | undefined
  nodeCount: number
  truncated: boolean
} => {
  if (nodes.length === 0) {
    return {
      tree: undefined,
      nodeCount: 0,
      truncated: false,
    }
  }

  const state: TreeLimitState = {
    count: 0,
    limit: maxTreeNodes,
    truncated: false,
  }

  const tree: ReaderTreeNode[] = []
  for (const node of nodes) {
    const next = toReaderTreeNode(node, state)
    if (!next) {
      break
    }
    tree.push(next)
  }

  return {
    tree,
    nodeCount: state.count,
    truncated: state.truncated,
  }
}

const readStringAttr = (
  attrs: Record<string, AttributeValue> | undefined,
  key: string,
): string | undefined => {
  if (!attrs) {
    return undefined
  }

  const value = attrs[key]
  return typeof value === 'string' ? value : undefined
}

const readSourceFromChild = (node: InternalElementNode): string | undefined => {
  for (const child of node.children) {
    if (child.kind !== 'element' || child.tagName !== 'source') {
      continue
    }

    const source = readStringAttr(child.attrs, 'src')
    if (source) {
      return source
    }
  }

  return undefined
}

const readHintText = (node: InternalElementNode): string => {
  const id = readStringAttr(node.attrs, 'id')
  const className = readStringAttr(node.attrs, 'class')
  const role = readStringAttr(node.attrs, 'role')
  const title = readStringAttr(node.attrs, 'title')
  const ariaLabel = readStringAttr(node.attrs, 'aria-label')

  return [id, className, role, title, ariaLabel]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase()
}

const collectNodeText = (node: InternalNode, maxLength: number): string => {
  let output = ''

  const walk = (next: InternalNode): void => {
    if (output.length >= maxLength) {
      return
    }

    if (next.kind === 'text') {
      const text = normalizeText(next.text)
      if (!text) {
        return
      }

      output = `${output} ${text}`.trim()
      return
    }

    for (const child of next.children) {
      walk(child)
      if (output.length >= maxLength) {
        break
      }
    }
  }

  walk(node)
  return output
}

const analyzeFocusStats = (node: InternalNode, inLink: boolean): FocusStats => {
  if (node.kind === 'text') {
    return {
      ...emptyFocusStats(),
      textLength: node.text.length,
      linkTextLength: inLink ? node.text.length : 0,
    }
  }

  let stats: FocusStats = {
    ...emptyFocusStats(),
    elementCount: 1,
  }

  const childInLink = inLink || node.tagName === 'a'
  for (const child of node.children) {
    const childStats = analyzeFocusStats(child, childInLink)
    stats = mergeFocusStats(stats, childStats)
  }

  if (node.tagName === 'img') {
    stats.imageCount += 1
  }

  return stats
}

const isLikelyNoiseNode = (
  node: InternalElementNode,
  stats: FocusStats,
  noiseControl: NoiseControl,
): boolean => {
  if (noiseControl.dropTags.has(node.tagName)) {
    return true
  }

  const hint = readHintText(node)
  const hasMainHint = includesKeyword(hint, noiseControl.mainKeywords)
  if (hasMainHint) {
    return false
  }

  const hasNoiseHint = includesKeyword(hint, noiseControl.noiseKeywords)
  if (hasNoiseHint && stats.textLength < 1_600 && stats.imageCount < 4) {
    return true
  }

  const linkDensity =
    stats.textLength > 0 ? stats.linkTextLength / stats.textLength : 0
  if (
    !PRIMARY_CONTENT_TAGS.has(node.tagName) &&
    linkDensity >= 0.82 &&
    stats.textLength < 420
  ) {
    return true
  }

  return false
}

const resolveTitleAnchorFromAncestors = (
  chain: InternalElementNode[],
): InternalElementNode | undefined => {
  if (chain.length === 0) {
    return undefined
  }

  for (let index = chain.length - 1; index >= 0; index -= 1) {
    const current = chain[index]
    if (!current) {
      continue
    }

    if (
      current.tagName === 'article' ||
      current.tagName === 'main' ||
      current.tagName === 'section'
    ) {
      return current
    }
  }

  for (let index = chain.length - 1; index >= 0; index -= 1) {
    const current = chain[index]
    if (current?.tagName === 'div') {
      return current
    }
  }

  return chain[chain.length - 1]
}

const resolveTitleAnchoredNodes = (
  nodes: InternalNode[],
  titleHint: string,
  noiseControl: NoiseControl,
): {
  nodes: InternalNode[]
  focused: boolean
} => {
  const normalizedTitleCandidates = buildTitleCandidates(titleHint)
  if (normalizedTitleCandidates.length === 0) {
    return {
      nodes,
      focused: false,
    }
  }

  const candidates: TitleAnchorCandidate[] = []
  const seen = new Set<InternalElementNode>()

  const walk = (node: InternalNode, chain: InternalElementNode[]): void => {
    if (node.kind === 'text') {
      return
    }

    const nextChain = [...chain, node]
    if (HEADING_TAGS.has(node.tagName)) {
      const headingText = collectNodeText(node, 320)
      const titleScore = scoreTitleMatch(headingText, normalizedTitleCandidates)
      if (titleScore >= 0.4) {
        const anchor = resolveTitleAnchorFromAncestors(chain)
        if (anchor && !seen.has(anchor)) {
          seen.add(anchor)
          const stats = analyzeFocusStats(anchor, false)
          if (!isLikelyNoiseNode(anchor, stats, noiseControl)) {
            const hint = readHintText(anchor)
            const positiveBoost = POSITIVE_HINT_PATTERN.test(hint) ? 110 : 0
            const negativePenalty = NEGATIVE_HINT_PATTERN.test(hint) ? 130 : 0
            const linkDensity =
              stats.textLength > 0 ? stats.linkTextLength / stats.textLength : 0

            candidates.push({
              node: anchor,
              score:
                titleScore * 1_000 +
                stats.textLength +
                stats.imageCount * 120 +
                positiveBoost -
                linkDensity * 260 -
                negativePenalty -
                Math.max(0, stats.elementCount - 320) * 1.1,
            })
          }
        }
      }
    }

    for (const child of node.children) {
      walk(child, nextChain)
    }
  }

  for (const node of nodes) {
    walk(node, [])
  }

  if (candidates.length === 0) {
    return {
      nodes,
      focused: false,
    }
  }

  candidates.sort((left, right) => right.score - left.score)
  const best = candidates[0]
  if (!best || best.score < 220) {
    return {
      nodes,
      focused: false,
    }
  }

  return {
    nodes: [best.node],
    focused: true,
  }
}

const scoreFocusCandidate = (node: InternalElementNode, stats: FocusStats): number => {
  const hint = readHintText(node)
  const hasPositiveHint = POSITIVE_HINT_PATTERN.test(hint)
  const hasNegativeHint = NEGATIVE_HINT_PATTERN.test(hint) && !hasPositiveHint
  const linkDensity =
    stats.textLength > 0 ? stats.linkTextLength / stats.textLength : 0
  const semanticBoost = PRIMARY_CONTENT_TAGS.has(node.tagName) ? 220 : 0
  const hintBoost = hasPositiveHint ? 120 : 0
  const hintPenalty = hasNegativeHint ? 160 : 0
  const oversizePenalty = Math.max(0, stats.elementCount - 280) * 1.6

  return (
    stats.textLength +
    stats.imageCount * 180 +
    semanticBoost +
    hintBoost -
    linkDensity * 420 -
    hintPenalty -
    oversizePenalty
  )
}

const collectFocusCandidates = (
  node: InternalNode,
  inLink: boolean,
  candidates: FocusCandidate[],
  noiseControl: NoiseControl,
): FocusStats => {
  if (node.kind === 'text') {
    return {
      ...emptyFocusStats(),
      textLength: node.text.length,
      linkTextLength: inLink ? node.text.length : 0,
    }
  }

  let stats: FocusStats = {
    ...emptyFocusStats(),
    elementCount: 1,
  }

  const childInLink = inLink || node.tagName === 'a'
  for (const child of node.children) {
    const childStats = collectFocusCandidates(
      child,
      childInLink,
      candidates,
      noiseControl,
    )
    stats = mergeFocusStats(stats, childStats)
  }

  if (node.tagName === 'img') {
    stats.imageCount += 1
  }

  if (
    FOCUSABLE_TAGS.has(node.tagName) &&
    (stats.textLength >= 60 || stats.imageCount >= 1) &&
    !isLikelyNoiseNode(node, stats, noiseControl)
  ) {
    candidates.push({
      node,
      score: scoreFocusCandidate(node, stats),
      textLength: stats.textLength,
    })
  }

  return stats
}

const resolveRenderNodes = (
  nodes: InternalNode[],
  focusThreshold: number,
  focusMainContent: boolean,
  noiseControl: NoiseControl,
): {
  nodes: InternalNode[]
  focused: boolean
} => {
  if (!focusMainContent || nodes.length === 0) {
    return {
      nodes,
      focused: false,
    }
  }

  const candidates: FocusCandidate[] = []
  for (const node of nodes) {
    collectFocusCandidates(node, false, candidates, noiseControl)
  }

  if (candidates.length === 0) {
    return {
      nodes,
      focused: false,
    }
  }

  candidates.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score
    }
    return right.textLength - left.textLength
  })

  const best = candidates[0]
  if (!best || best.score < focusThreshold) {
    return {
      nodes,
      focused: false,
    }
  }

  return {
    nodes: [best.node],
    focused: true,
  }
}

const pushTextBlock = (
  blocks: ReaderBlock[],
  text: string,
  forceBreak: boolean,
): void => {
  const normalized = normalizeText(text)
  if (!normalized) {
    return
  }

  const last = blocks[blocks.length - 1]
  if (!forceBreak && last?.type === 'text') {
    last.text = `${last.text} ${normalized}`.trim()
    return
  }

  blocks.push({
    type: 'text',
    text: normalized,
  })
}

const collectBlocks = (
  nodes: InternalNode[],
  noiseControl: NoiseControl,
): ReaderBlock[] => {
  const blocks: ReaderBlock[] = []
  let pendingBreak = true

  const walk = (node: InternalNode): void => {
    if (node.kind === 'text') {
      pushTextBlock(blocks, node.text, pendingBreak)
      pendingBreak = false
      return
    }

    const isBlockBoundary = BLOCK_BREAK_TAGS.has(node.tagName)
    if (isBlockBoundary) {
      pendingBreak = true
    }

    const hint = readHintText(node)
    const needsNoiseCheck =
      noiseControl.dropTags.has(node.tagName) ||
      includesKeyword(hint, noiseControl.noiseKeywords)
    if (needsNoiseCheck) {
      const stats = analyzeFocusStats(node, false)
      if (isLikelyNoiseNode(node, stats, noiseControl)) {
        return
      }
    }

    if (node.tagName === 'img') {
      const src = readStringAttr(node.attrs, 'src')
      if (src) {
        const alt = readStringAttr(node.attrs, 'alt')
        blocks.push({
          type: 'image',
          src,
          alt,
        })
        pendingBreak = true
      }
      return
    }

    if (node.tagName === 'video') {
      const src = readStringAttr(node.attrs, 'src') ?? readSourceFromChild(node)

      if (src) {
        const poster = readStringAttr(node.attrs, 'poster')
        blocks.push({
          type: 'video',
          src,
          poster,
        })
        pendingBreak = true
      }
      return
    }

    if (node.tagName === 'iframe') {
      const src = readStringAttr(node.attrs, 'src')
      if (src) {
        const title = readStringAttr(node.attrs, 'title')
        blocks.push({
          type: 'iframe',
          src,
          title,
        })
        pendingBreak = true
      }
      return
    }

    for (const child of node.children) {
      walk(child)
    }

    if (isBlockBoundary) {
      pendingBreak = true
    }
  }

  for (const node of nodes) {
    walk(node)
  }

  return blocks.filter((block) => {
    if (block.type === 'text') {
      return block.text.length > 0
    }
    return Boolean(block.src)
  })
}

const blocksToText = (blocks: ReaderBlock[]): string => {
  return blocks
    .filter((block): block is Extract<ReaderBlock, { type: 'text' }> => block.type === 'text')
    .map((block) => block.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const renderFromNodes = (
  nodes: InternalNode[],
  options: RenderOptions,
  noiseControl: NoiseControl,
): RenderResult | undefined => {
  const blocks = collectBlocks(nodes, noiseControl)
  if (blocks.length === 0) {
    return undefined
  }

  let truncated = false
  let activeBlocks = blocks

  if (activeBlocks.length > options.maxBlocks) {
    activeBlocks = activeBlocks.slice(0, options.maxBlocks)
    truncated = true
  }

  let rendered = defaultViewEngine.render({
    blocks: activeBlocks,
    title: options.titleHint,
  })
  let html = rendered.html
  while (html.length > options.maxHtmlLength && activeBlocks.length > 0) {
    activeBlocks = activeBlocks.slice(0, activeBlocks.length - 1)
    truncated = true
    rendered = defaultViewEngine.render({
      blocks: activeBlocks,
      title: options.titleHint,
    })
    html = rendered.html
  }

  if (activeBlocks.length === 0 || html.length === 0) {
    return undefined
  }

  let text = blocksToText(activeBlocks)
  const hasVisual = activeBlocks.some((block) => block.type !== 'text')
  if (text.length < options.minTextLength && !hasVisual) {
    return undefined
  }

  if (text.length > options.maxTextLength) {
    text = text.slice(0, options.maxTextLength)
    truncated = true
  }

  return {
    html,
    text,
    blockCount: activeBlocks.length,
    truncated,
    blocks: activeBlocks,
    renderDocument: rendered.document,
  }
}

const normalizeRenderOptions = (options: RecomposeOptions): RenderOptions => ({
  maxBlocks: options.maxBlocks ?? DEFAULT_MAX_BLOCKS,
  maxHtmlLength: options.maxHtmlLength ?? DEFAULT_MAX_HTML_LENGTH,
  maxTextLength: options.maxTextLength ?? DEFAULT_MAX_TEXT_LENGTH,
  minTextLength: options.minTextLength ?? DEFAULT_MIN_TEXT_LENGTH,
  titleHint: options.titleHint,
})

const composeContent = (
  allNodes: InternalNode[],
  options: RecomposeOptions,
): ReaderContent | undefined => {
  const maxTreeNodes = options.maxTreeNodes ?? DEFAULT_MAX_TREE_NODES
  const focusThreshold = options.focusThreshold ?? DEFAULT_FOCUS_THRESHOLD
  const focusMainContent = options.focusMainContent ?? false
  const focusTitleRoot = options.focusTitleRoot ?? false
  const titleHint = options.titleHint
  const noiseControl = buildNoiseControl(options)
  const treePayload = limitTreeNodes(allNodes, maxTreeNodes)
  const renderOptions = normalizeRenderOptions(options)

  const titleSelection =
    focusTitleRoot && titleHint
      ? resolveTitleAnchoredNodes(allNodes, titleHint, noiseControl)
      : undefined
  const focusSelection = resolveRenderNodes(
    allNodes,
    focusThreshold,
    focusMainContent,
    noiseControl,
  )
  const firstSelection = titleSelection?.focused ? titleSelection : focusSelection

  let renderResult = renderFromNodes(
    firstSelection.nodes,
    renderOptions,
    noiseControl,
  )
  let usedFocusedNodes = firstSelection.focused

  if (!renderResult && titleSelection?.focused) {
    renderResult = renderFromNodes(
      focusSelection.nodes,
      renderOptions,
      noiseControl,
    )
    usedFocusedNodes = focusSelection.focused
  }

  if (!renderResult && usedFocusedNodes) {
    renderResult = renderFromNodes(allNodes, renderOptions, noiseControl)
    usedFocusedNodes = false
  }

  if (!renderResult) {
    return undefined
  }

  const truncated = renderResult.truncated || treePayload.truncated
  const quality = evaluateReaderContentQuality({
    text: renderResult.text,
    blocks: renderResult.blocks,
    treeNodeCount: treePayload.nodeCount,
    titleHint: options.titleHint,
    noiseKeywords: noiseControl.noiseKeywords,
    mainKeywords: noiseControl.mainKeywords,
    truncated,
  })

  return {
    html: renderResult.html,
    text: renderResult.text,
    blockCount: renderResult.blockCount,
    truncated,
    quality,
    blocks: renderResult.blocks,
    renderDocument: renderResult.renderDocument,
    tree: treePayload.tree,
    treeNodeCount: treePayload.nodeCount,
    source: options.source,
    captureMode:
      options.captureMode ?? (usedFocusedNodes ? 'focused-body' : 'full-body'),
  }
}

const sanitizeInternalNodes = (
  nodes: InternalNode[],
  baseUrl: string,
): InternalNode[] => {
  return nodes.flatMap((node) => sanitizeInternalNode(node, baseUrl))
}

const sanitizeTreeNodes = (
  nodes: ReaderTreeNode[],
  baseUrl: string,
): InternalNode[] => {
  return nodes.flatMap((node) => sanitizeTreeInputNode(node, baseUrl))
}

export const extractBodyHtml = (documentHtml: string): string => {
  const body = documentHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1]
  return body ?? documentHtml
}

export const stripHtmlTags = (input: string): string => {
  return decodeHtmlEntities(
    input
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )
}

export const recomposeReaderContentFromTree = (
  tree: ReaderTreeNode[],
  baseUrl: string,
  options: RecomposeOptions = {},
): ReaderContent | undefined => {
  const sanitizedNodes = sanitizeTreeNodes(tree, baseUrl)
  if (sanitizedNodes.length === 0) {
    return undefined
  }

  return composeContent(sanitizedNodes, options)
}

export const recomposeReaderContent = (
  documentHtml: string,
  baseUrl: string,
  options: RecomposeOptions = {},
): ReaderContent | undefined => {
  const bodyHtml = extractBodyHtml(documentHtml)
  const parsedTree = parseHtmlTree(bodyHtml)
  const sanitizedNodes = sanitizeInternalNodes(parsedTree.children, baseUrl)
  if (sanitizedNodes.length === 0) {
    return undefined
  }

  return composeContent(sanitizedNodes, options)
}
