import type {
  ReaderBlock,
  ReaderContent,
  ReaderTreeNode,
} from '../types/metadata'

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
}

interface RenderResult {
  html: string
  text: string
  blockCount: number
  truncated: boolean
  blocks: ReaderBlock[]
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
  'iframe',
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

const escapeHtml = (value: string): string => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

const escapeAttribute = (value: string): string => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
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

    if (name === 'src' || name === 'data-src') {
      const src = sanitizeMediaSource(value, baseUrl)
      if (src) {
        sanitized.src = src
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
    const childStats = collectFocusCandidates(child, childInLink, candidates)
    stats = mergeFocusStats(stats, childStats)
  }

  if (node.tagName === 'img') {
    stats.imageCount += 1
  }

  if (
    FOCUSABLE_TAGS.has(node.tagName) &&
    (stats.textLength >= 60 || stats.imageCount >= 1)
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
    collectFocusCandidates(node, false, candidates)
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

const collectBlocks = (nodes: InternalNode[]): ReaderBlock[] => {
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

const renderBlocksHtml = (blocks: ReaderBlock[]): string => {
  return blocks
    .map((block) => {
      if (block.type === 'text') {
        return `<p>${escapeHtml(block.text)}</p>`
      }

      const alt = block.alt ? escapeAttribute(block.alt) : ''
      const altAttr = alt ? ` alt="${alt}"` : ' alt=""'
      return `<img src="${escapeAttribute(block.src)}"${altAttr} loading="lazy" />`
    })
    .join('')
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
): RenderResult | undefined => {
  const blocks = collectBlocks(nodes)
  if (blocks.length === 0) {
    return undefined
  }

  let truncated = false
  let activeBlocks = blocks

  if (activeBlocks.length > options.maxBlocks) {
    activeBlocks = activeBlocks.slice(0, options.maxBlocks)
    truncated = true
  }

  let html = renderBlocksHtml(activeBlocks)
  while (html.length > options.maxHtmlLength && activeBlocks.length > 0) {
    activeBlocks = activeBlocks.slice(0, activeBlocks.length - 1)
    truncated = true
    html = renderBlocksHtml(activeBlocks)
  }

  if (activeBlocks.length === 0 || html.length === 0) {
    return undefined
  }

  let text = blocksToText(activeBlocks)
  const hasImage = activeBlocks.some((block) => block.type === 'image')
  if (text.length < options.minTextLength && !hasImage) {
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
  }
}

const normalizeRenderOptions = (options: RecomposeOptions): RenderOptions => ({
  maxBlocks: options.maxBlocks ?? DEFAULT_MAX_BLOCKS,
  maxHtmlLength: options.maxHtmlLength ?? DEFAULT_MAX_HTML_LENGTH,
  maxTextLength: options.maxTextLength ?? DEFAULT_MAX_TEXT_LENGTH,
  minTextLength: options.minTextLength ?? DEFAULT_MIN_TEXT_LENGTH,
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
  const treePayload = limitTreeNodes(allNodes, maxTreeNodes)
  const renderOptions = normalizeRenderOptions(options)

  const titleSelection =
    focusTitleRoot && titleHint
      ? resolveTitleAnchoredNodes(allNodes, titleHint)
      : undefined
  const focusSelection = resolveRenderNodes(allNodes, focusThreshold, focusMainContent)
  const firstSelection = titleSelection?.focused ? titleSelection : focusSelection

  let renderResult = renderFromNodes(firstSelection.nodes, renderOptions)
  let usedFocusedNodes = firstSelection.focused

  if (!renderResult && titleSelection?.focused) {
    renderResult = renderFromNodes(focusSelection.nodes, renderOptions)
    usedFocusedNodes = focusSelection.focused
  }

  if (!renderResult && usedFocusedNodes) {
    renderResult = renderFromNodes(allNodes, renderOptions)
    usedFocusedNodes = false
  }

  if (!renderResult) {
    return undefined
  }

  return {
    html: renderResult.html,
    text: renderResult.text,
    blockCount: renderResult.blockCount,
    truncated: renderResult.truncated || treePayload.truncated,
    blocks: renderResult.blocks,
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
