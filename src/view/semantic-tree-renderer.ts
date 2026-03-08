import type { ReaderTreeNode } from '../types/metadata'

interface SemanticHeadingToken {
  type: 'heading'
  level: number
  text: string
}

interface SemanticParagraphToken {
  type: 'paragraph'
  text: string
}

interface SemanticImageToken {
  type: 'image'
  src: string
  alt?: string
}

interface SemanticVideoToken {
  type: 'video'
  src: string
  poster?: string
}

interface SemanticIframeToken {
  type: 'iframe'
  src: string
  title?: string
}

interface SemanticListToken {
  type: 'list'
  ordered: boolean
  items: string[]
}

type SemanticToken =
  | SemanticHeadingToken
  | SemanticParagraphToken
  | SemanticImageToken
  | SemanticVideoToken
  | SemanticIframeToken
  | SemanticListToken

interface SemanticSection {
  heading?: SemanticHeadingToken
  body: SemanticToken[]
}

interface SemanticRenderState {
  tokens: SemanticToken[]
  paragraphBuffer: string[]
  maxTokens: number
}

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
  'meta',
  'link',
  'header',
  'nav',
  'footer',
  'aside',
])

const BLOCK_TAGS = new Set([
  'article',
  'section',
  'main',
  'div',
  'p',
  'li',
  'blockquote',
  'pre',
  'table',
  'tr',
  'td',
  'th',
])

const HEADING_LEVEL: Record<string, number> = {
  h1: 1,
  h2: 2,
  h3: 3,
  h4: 4,
  h5: 5,
  h6: 6,
}

const normalizeText = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined
  }

  const normalized = value.replace(/\s+/g, ' ').trim()
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

const readAttr = (
  attrs: Record<string, string | true> | undefined,
  key: string,
): string | undefined => {
  if (!attrs) {
    return undefined
  }

  const value = attrs[key]
  return typeof value === 'string' ? value : undefined
}

const pushParagraphText = (state: SemanticRenderState, text: string): void => {
  const normalized = normalizeText(text)
  if (!normalized || state.tokens.length >= state.maxTokens) {
    return
  }

  state.paragraphBuffer.push(normalized)
}

const flushParagraph = (state: SemanticRenderState): void => {
  if (state.paragraphBuffer.length === 0 || state.tokens.length >= state.maxTokens) {
    state.paragraphBuffer = []
    return
  }

  const text = normalizeText(state.paragraphBuffer.join(' '))
  state.paragraphBuffer = []
  if (!text) {
    return
  }

  state.tokens.push({
    type: 'paragraph',
    text,
  })
}

const pushToken = (state: SemanticRenderState, token: SemanticToken): void => {
  if (state.tokens.length >= state.maxTokens) {
    return
  }
  state.tokens.push(token)
}

const extractTextFromTree = (node: ReaderTreeNode, maxLength = 320): string => {
  let output = ''

  const walk = (next: ReaderTreeNode): void => {
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
  return output.slice(0, maxLength)
}

const readSourceFromMediaChildren = (node: Extract<ReaderTreeNode, { kind: 'element' }>): string | undefined => {
  for (const child of node.children) {
    if (child.kind !== 'element' || child.tagName.toLowerCase() !== 'source') {
      continue
    }

    const src = readAttr(child.attrs, 'src')
    if (src) {
      return src
    }
  }

  return undefined
}

const extractListItems = (
  node: Extract<ReaderTreeNode, { kind: 'element' }>,
): string[] => {
  const items: string[] = []

  for (const child of node.children) {
    if (child.kind !== 'element' || child.tagName.toLowerCase() !== 'li') {
      continue
    }

    const text = normalizeText(extractTextFromTree(child, 280))
    if (text) {
      items.push(text)
    }
  }

  return items.slice(0, 16)
}

const walkSemanticTree = (
  node: ReaderTreeNode,
  state: SemanticRenderState,
): void => {
  if (state.tokens.length >= state.maxTokens) {
    return
  }

  if (node.kind === 'text') {
    pushParagraphText(state, node.text)
    return
  }

  const tagName = node.tagName.toLowerCase()
  if (DROP_TAGS.has(tagName)) {
    return
  }

  if (tagName === 'br') {
    flushParagraph(state)
    return
  }

  const headingLevel = HEADING_LEVEL[tagName]
  if (headingLevel) {
    flushParagraph(state)
    const text = normalizeText(extractTextFromTree(node, 220))
    if (text) {
      pushToken(state, {
        type: 'heading',
        level: headingLevel,
        text,
      })
    }
    return
  }

  if (tagName === 'img') {
    flushParagraph(state)
    const src = readAttr(node.attrs, 'src') ?? readAttr(node.attrs, 'data-src')
    if (src) {
      pushToken(state, {
        type: 'image',
        src,
        alt: readAttr(node.attrs, 'alt'),
      })
    }
    return
  }

  if (tagName === 'video') {
    flushParagraph(state)
    const src = readAttr(node.attrs, 'src') ?? readSourceFromMediaChildren(node)
    if (src) {
      pushToken(state, {
        type: 'video',
        src,
        poster: readAttr(node.attrs, 'poster'),
      })
    }
    return
  }

  if (tagName === 'iframe') {
    flushParagraph(state)
    const src = readAttr(node.attrs, 'src')
    if (src) {
      pushToken(state, {
        type: 'iframe',
        src,
        title: readAttr(node.attrs, 'title'),
      })
    }
    return
  }

  if (tagName === 'ul' || tagName === 'ol') {
    flushParagraph(state)
    const items = extractListItems(node)
    if (items.length > 0) {
      pushToken(state, {
        type: 'list',
        ordered: tagName === 'ol',
        items,
      })
    }
    return
  }

  const isBlock = BLOCK_TAGS.has(tagName)
  if (isBlock) {
    flushParagraph(state)
  }

  for (const child of node.children) {
    walkSemanticTree(child, state)
    if (state.tokens.length >= state.maxTokens) {
      break
    }
  }

  if (isBlock) {
    flushParagraph(state)
  }
}

const partitionSections = (tokens: SemanticToken[]): SemanticSection[] => {
  const sections: SemanticSection[] = []
  let current: SemanticSection = { body: [] }

  for (const token of tokens) {
    if (token.type === 'heading') {
      if (current.heading || current.body.length > 0) {
        sections.push(current)
      }

      current = {
        heading: token,
        body: [],
      }
      continue
    }

    current.body.push(token)
  }

  if (current.heading || current.body.length > 0) {
    sections.push(current)
  }

  return sections
}

const renderList = (token: SemanticListToken): string => {
  const itemHtml = token.items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('')
  const tag = token.ordered ? 'ol' : 'ul'
  return `<${tag} class="pv-list">${itemHtml}</${tag}>`
}

const renderBodyToken = (token: SemanticToken): string => {
  if (token.type === 'paragraph') {
    return `<p>${escapeHtml(token.text)}</p>`
  }

  if (token.type === 'image') {
    const alt = token.alt ? ` alt="${escapeAttribute(token.alt)}"` : ' alt=""'
    return `<figure class="pv-media pv-image"><img src="${escapeAttribute(token.src)}"${alt} loading="lazy" /></figure>`
  }

  if (token.type === 'video') {
    const poster = token.poster
      ? ` poster="${escapeAttribute(token.poster)}"`
      : ''
    return `<figure class="pv-media pv-video"><video controls preload="metadata" src="${escapeAttribute(token.src)}"${poster}></video></figure>`
  }

  if (token.type === 'iframe') {
    const title = token.title
      ? ` title="${escapeAttribute(token.title)}"`
      : ' title="Embedded content"'
    return `<figure class="pv-media pv-iframe"><iframe src="${escapeAttribute(token.src)}"${title} loading="lazy" allowfullscreen></iframe></figure>`
  }

  if (token.type === 'list') {
    return renderList(token)
  }

  return `<p>${escapeHtml(token.text)}</p>`
}

const renderSection = (section: SemanticSection): string => {
  const headingHtml = section.heading ? renderBodyToken(section.heading) : ''
  const bodyHtml = section.body.map((token) => renderBodyToken(token)).join('')
  return `<section class="pv-section">${headingHtml}${bodyHtml}</section>`
}

export const renderSemanticHtmlFromTree = (
  tree: ReaderTreeNode[],
  maxTokens: number,
): string | undefined => {
  if (tree.length === 0 || maxTokens <= 0) {
    return undefined
  }

  const state: SemanticRenderState = {
    tokens: [],
    paragraphBuffer: [],
    maxTokens,
  }

  for (const node of tree) {
    walkSemanticTree(node, state)
    if (state.tokens.length >= state.maxTokens) {
      break
    }
  }
  flushParagraph(state)

  if (state.tokens.length === 0) {
    return undefined
  }

  const sections = partitionSections(state.tokens)
  if (sections.length === 0) {
    return undefined
  }

  const content = sections.map((section) => renderSection(section)).join('')
  return `<article class="pv-article">${content}</article>`
}
