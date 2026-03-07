import type {
  DynamicExtractorOptions,
  ExtractedMetadata,
  ReaderTreeNode,
} from '../types/metadata'
import { extractStaticMetadata } from './static.extractor'
import {
  recomposeReaderContent,
  recomposeReaderContentFromTree,
} from './content-recomposer'

const DEFAULT_TIMEOUT_MS = 12_000
const DEFAULT_MAX_SCROLL_STEPS = 12
const DEFAULT_SCROLL_DELAY_MS = 140
const DEFAULT_FOCUSED_SELECTORS = ['main', '[role="main"]', '#root', '#app', 'body']
const DEFAULT_MAX_DOM_NODES = 6_000
const DEFAULT_MAX_DOM_DEPTH = 26
const MAX_DYNAMIC_HTML_LENGTH = 260_000
const MAX_DYNAMIC_TEXT_LENGTH = 180_000
const MAX_DYNAMIC_BLOCKS = 1_200

type PlaywrightModule = {
  chromium: {
    launch: (options: Record<string, unknown>) => Promise<PlaywrightBrowser>
  }
}

type PlaywrightBrowser = {
  newContext: (
    options: Record<string, unknown>,
  ) => Promise<PlaywrightBrowserContext>
  close: () => Promise<void>
}

type PlaywrightBrowserContext = {
  newPage: () => Promise<PlaywrightPage>
  close: () => Promise<void>
}

type PlaywrightPage = {
  goto: (url: string, options: Record<string, unknown>) => Promise<void>
  waitForLoadState: (
    state: string,
    options: Record<string, unknown>,
  ) => Promise<void>
  evaluate: <TArg, TResult>(
    evaluator: (arg: TArg) => TResult | Promise<TResult>,
    arg: TArg,
  ) => Promise<TResult>
  content: () => Promise<string>
  url: () => string
}

const mergeMetadata = (
  primary: ExtractedMetadata,
  secondary: ExtractedMetadata,
): ExtractedMetadata => ({
  title: primary.title ?? secondary.title,
  description: primary.description ?? secondary.description,
  imageUrl: primary.imageUrl ?? secondary.imageUrl,
  siteName: primary.siteName ?? secondary.siteName,
  author: primary.author ?? secondary.author,
  publishedAt: primary.publishedAt ?? secondary.publishedAt,
  canonicalUrl: primary.canonicalUrl ?? secondary.canonicalUrl,
  excerpt: primary.excerpt ?? secondary.excerpt,
  duration: primary.duration ?? secondary.duration,
  mimeType: primary.mimeType ?? secondary.mimeType,
  ogType: primary.ogType ?? secondary.ogType,
  oEmbedUrl: primary.oEmbedUrl ?? secondary.oEmbedUrl,
  playerUrl: primary.playerUrl ?? secondary.playerUrl,
  snapshot: primary.snapshot ?? secondary.snapshot,
  content: primary.content ?? secondary.content,
})

export const extractWithPlaywright = async (
  url: string,
  options: DynamicExtractorOptions = {},
): Promise<ExtractedMetadata> => {
  const playwright = await loadPlaywright()
  if (!playwright?.chromium) {
    return {}
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxScrollSteps = options.maxScrollSteps ?? DEFAULT_MAX_SCROLL_STEPS
  const scrollDelayMs = options.scrollDelayMs ?? DEFAULT_SCROLL_DELAY_MS

  let browser: PlaywrightBrowser | undefined

  try {
    browser = await playwright.chromium.launch({ headless: true })
    const context = await browser.newContext({
      userAgent: options.userAgent,
      viewport: { width: 1366, height: 900 },
    })
    const page = await context.newPage()

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: timeoutMs,
    })

    await waitForNetworkSettled(page, Math.min(4_000, timeoutMs))
    await autoScroll(page, maxScrollSteps, scrollDelayMs)
    await waitForNetworkSettled(page, Math.min(2_000, timeoutMs))
    await waitForMeaningfulRoot(
      page,
      Math.min(5_000, timeoutMs),
      options.mainSelectors,
    )

    const resolvedUrl = page.url() || url
    const renderedHtml = await page.content()
    const renderedMetadata = await extractStaticMetadata(renderedHtml, resolvedUrl)
    const titleHint = options.titleHint ?? renderedMetadata.title
    const domTree = await extractDomTree(page, {
      titleHint,
      focusTitleNearestBody: options.focusTitleNearestBody ?? false,
      mainSelectors: options.mainSelectors,
      removeSelectors: options.removeSelectors,
    })

    const recomposedFromDom = domTree
      ? recomposeReaderContentFromTree(domTree, resolvedUrl, {
          source: 'dynamic-dom',
          captureMode: 'focused-body',
          focusMainContent: true,
          focusTitleRoot: true,
          titleHint,
          maxHtmlLength: MAX_DYNAMIC_HTML_LENGTH,
          maxTextLength: MAX_DYNAMIC_TEXT_LENGTH,
          maxBlocks: MAX_DYNAMIC_BLOCKS,
          minTextLength: 80,
          noiseKeywords: options.noiseKeywords,
          mainKeywords: options.mainKeywords,
          dropTags: options.dropTags,
        })
      : undefined

    const recomposedContent =
      recomposedFromDom ??
      recomposeReaderContent(renderedHtml, resolvedUrl, {
        source: 'dynamic-dom',
        captureMode: 'focused-body',
        focusMainContent: true,
        focusTitleRoot: true,
        titleHint,
        maxHtmlLength: MAX_DYNAMIC_HTML_LENGTH,
        maxTextLength: MAX_DYNAMIC_TEXT_LENGTH,
        maxBlocks: MAX_DYNAMIC_BLOCKS,
        minTextLength: 80,
        noiseKeywords: options.noiseKeywords,
        mainKeywords: options.mainKeywords,
        dropTags: options.dropTags,
      })

    if (!recomposedContent) {
      await context.close()
      return renderedMetadata
    }

    await context.close()
    return mergeMetadata(
      {
        content: recomposedContent,
        excerpt: resolveExcerptFromText(recomposedContent.text),
      },
      renderedMetadata,
    )
  } catch {
    return {}
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined)
    }
  }
}

const loadPlaywright = async (): Promise<PlaywrightModule | undefined> => {
  try {
    const importer = new Function(
      'specifier',
      'return import(specifier)',
    ) as (specifier: string) => Promise<unknown>
    const module = (await importer('playwright')) as PlaywrightModule
    return module
  } catch {
    return undefined
  }
}

const waitForNetworkSettled = async (
  page: PlaywrightPage,
  timeoutMs: number,
): Promise<void> => {
  try {
    await page.waitForLoadState('networkidle', { timeout: timeoutMs })
  } catch {
    // Keep going when the page has long polling/socket connections.
  }
}

const autoScroll = async (
  page: PlaywrightPage,
  maxSteps: number,
  delayMs: number,
): Promise<void> => {
  await page.evaluate(
    async ({ steps, delay }) => {
      const wait = (ms: number): Promise<void> =>
        new Promise((resolve) => {
          setTimeout(resolve, ms)
        })

      let previousHeight = 0
      for (let index = 0; index < steps; index += 1) {
        const currentHeight = document.body.scrollHeight
        if (currentHeight <= previousHeight) {
          break
        }

        window.scrollTo(0, currentHeight)
        previousHeight = currentHeight
        await wait(delay)
      }

      window.scrollTo(0, 0)
    },
    { steps: maxSteps, delay: delayMs },
  )
}

const waitForMeaningfulRoot = async (
  page: PlaywrightPage,
  timeoutMs: number,
  focusSelectors: string[] | undefined,
): Promise<void> => {
  try {
    await page.evaluate(
      async ({ timeout, selectors }) => {
        const wait = (ms: number): Promise<void> =>
          new Promise((resolve) => {
            setTimeout(resolve, ms)
          })

        const normalize = (value: string | null | undefined): string => {
          if (!value) {
            return ''
          }

          return value.replace(/\s+/g, ' ').trim()
        }

        const startedAt = Date.now()
        while (Date.now() - startedAt < timeout) {
          for (const selector of selectors) {
            const node = document.querySelector(selector)
            if (!node) {
              continue
            }

            const textLength = normalize(node.textContent).length
            const childCount = node.querySelectorAll('*').length
            if (textLength >= 120 || childCount >= 40) {
              return
            }
          }

          await wait(200)
        }
      },
      {
        timeout: timeoutMs,
        selectors: focusSelectors ?? DEFAULT_FOCUSED_SELECTORS,
      },
    )
  } catch {
    // Best effort wait only.
  }
}

const extractDomTree = async (
  page: PlaywrightPage,
  options: {
    titleHint?: string
    focusTitleNearestBody: boolean
    mainSelectors?: string[]
    removeSelectors?: string[]
  },
): Promise<ReaderTreeNode[] | undefined> => {
  try {
    const tree = await page.evaluate(
      ({
        maxNodes,
        maxDepth,
        titleHint,
        focusTitleNearestBody,
        mainSelectors,
        removeSelectors,
      }) => {
        type DomTreeNode = {
          kind: 'text' | 'element'
          text?: string
          tagName?: string
          attrs?: Record<string, string>
          children?: DomTreeNode[]
        }

        const dropTags = new Set([
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

        const keepAttrs = new Set([
          'id',
          'class',
          'role',
          'title',
          'aria-label',
          'href',
          'src',
          'data-src',
          'poster',
          'alt',
          'width',
          'height',
          'loading',
          'decoding',
          'controls',
          'autoplay',
          'muted',
          'loop',
          'playsinline',
          'allow',
          'allowfullscreen',
          'referrerpolicy',
        ])

        const normalize = (value: string | null | undefined): string => {
          if (!value) {
            return ''
          }

          return value.replace(/\s+/g, ' ').trim()
        }

        const normalizeForMatch = (value: string | null | undefined): string => {
          return normalize(value)
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        }

        const buildTitleCandidates = (value: string | undefined): string[] => {
          const normalized = normalizeForMatch(value)
          if (!normalized) {
            return []
          }

          const parts = (value ?? '')
            .split(/\s*(?:\||-|:|·|•|›|»)\s*/g)
            .map((part) => normalizeForMatch(part))
            .filter((part) => part.length >= 2)

          return Array.from(new Set([normalized, ...parts])).slice(0, 6)
        }

        const scoreTitleMatch = (text: string, candidates: string[]): number => {
          const normalizedText = normalizeForMatch(text)
          if (!normalizedText || candidates.length === 0) {
            return 0
          }

          let best = 0
          for (const candidate of candidates) {
            if (!candidate) {
              continue
            }

            if (normalizedText === candidate) {
              best = Math.max(best, 1)
              continue
            }

            if (normalizedText.includes(candidate)) {
              best = Math.max(best, 0.85)
              continue
            }

            const tokens = candidate.split(' ').filter((token) => token.length >= 2)
            if (tokens.length === 0) {
              continue
            }

            const matched = tokens.filter((token) =>
              normalizedText.includes(token),
            ).length
            best = Math.max(best, matched / tokens.length)
          }

          return best
        }

        const toAbsolute = (raw: string): string | undefined => {
          try {
            return new URL(raw, document.baseURI).toString()
          } catch {
            return undefined
          }
        }

        const sanitizeLink = (raw: string): string | undefined => {
          const absolute = toAbsolute(raw)
          if (!absolute) {
            return undefined
          }

          try {
            const parsed = new URL(absolute)
            if (
              parsed.protocol === 'http:' ||
              parsed.protocol === 'https:' ||
              parsed.protocol === 'mailto:' ||
              parsed.protocol === 'tel:'
            ) {
              return parsed.toString()
            }
            return undefined
          } catch {
            return undefined
          }
        }

        const sanitizeMedia = (raw: string): string | undefined => {
          const absolute = toAbsolute(raw)
          if (!absolute) {
            return undefined
          }

          try {
            const parsed = new URL(absolute)
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
              return parsed.toString()
            }
            return undefined
          } catch {
            return undefined
          }
        }

        let nodeCount = 0

        const shouldRemoveElement = (element: Element): boolean => {
          if (!removeSelectors || removeSelectors.length === 0) {
            return false
          }

          for (const selector of removeSelectors) {
            if (!selector) {
              continue
            }

            try {
              if (element.matches(selector)) {
                return true
              }
            } catch {
              // Ignore invalid selectors from user policy.
            }
          }

          return false
        }

        const resolveSelectorRoots = (): Element[] => {
          if (!mainSelectors || mainSelectors.length === 0) {
            return []
          }

          let bestRoot: Element | undefined
          let bestScore = 0
          const seen = new Set<Element>()

          for (const selector of mainSelectors) {
            if (!selector) {
              continue
            }

            let matches: Element[] = []
            try {
              matches = Array.from(document.querySelectorAll(selector))
            } catch {
              continue
            }

            for (const element of matches) {
              if (seen.has(element) || shouldRemoveElement(element)) {
                continue
              }

              seen.add(element)
              const textLength = normalize(element.textContent).length
              const childCount = element.querySelectorAll('*').length
              const score = textLength + childCount * 2
              if (score > bestScore) {
                bestScore = score
                bestRoot = element
              }
            }
          }

          return bestRoot ? [bestRoot] : []
        }

        const resolveTitleAnchorRoot = (): Element | undefined => {
          if (!focusTitleNearestBody || !titleHint) {
            return undefined
          }

          const titleCandidates = buildTitleCandidates(titleHint)
          if (titleCandidates.length === 0) {
            return undefined
          }

          let bestElement: Element | undefined
          let bestScore = 0
          let bestTextLength = Number.POSITIVE_INFINITY

          const elements = Array.from(document.body?.querySelectorAll('*') ?? [])
          for (const element of elements) {
            const tagName = element.tagName.toLowerCase()
            if (
              tagName === 'script' ||
              tagName === 'style' ||
              tagName === 'noscript' ||
              tagName === 'template'
            ) {
              continue
            }

            const text = normalize(element.textContent)
            if (!text || text.length > 180) {
              continue
            }

            const score = scoreTitleMatch(text, titleCandidates)
            if (score < 0.72) {
              continue
            }

            if (score > bestScore) {
              bestScore = score
              bestTextLength = text.length
              bestElement = element
              continue
            }

            if (score === bestScore && text.length < bestTextLength) {
              bestTextLength = text.length
              bestElement = element
            }
          }

          if (!bestElement) {
            return undefined
          }

          let anchor: Element = bestElement
          while (anchor.parentElement && anchor.parentElement !== document.body) {
            anchor = anchor.parentElement
          }

          if (anchor.parentElement === document.body) {
            return anchor
          }

          return undefined
        }

        const walk = (node: Node, depth: number): DomTreeNode | undefined => {
          if (nodeCount >= maxNodes || depth > maxDepth) {
            return undefined
          }

          if (node.nodeType === Node.TEXT_NODE) {
            const text = normalize(node.textContent)
            if (!text) {
              return undefined
            }

            nodeCount += 1
            return {
              kind: 'text',
              text,
            }
          }

          if (node.nodeType !== Node.ELEMENT_NODE) {
            return undefined
          }

          const element = node as HTMLElement
          const tagName = element.tagName.toLowerCase()
          if (dropTags.has(tagName) || shouldRemoveElement(element)) {
            return undefined
          }

          const attrs: Record<string, string> = {}
          for (const attr of Array.from(element.attributes)) {
            const name = attr.name.toLowerCase()
            if (!keepAttrs.has(name) || name.startsWith('on') || name === 'style') {
              continue
            }

            const value = normalize(attr.value)
            if (!value) {
              continue
            }

            if (name === 'href') {
              const href = sanitizeLink(value)
              if (href) {
                attrs.href = href
              }
              continue
            }

            if (name === 'src' || name === 'data-src' || name === 'poster') {
              const src = sanitizeMedia(value)
              if (src) {
                if (name === 'poster') {
                  attrs.poster = src
                } else {
                  attrs.src = src
                }
              }
              continue
            }

            attrs[name] = value
          }

          const children: DomTreeNode[] = []
          for (const child of Array.from(element.childNodes)) {
            const next = walk(child, depth + 1)
            if (next) {
              children.push(next)
            }
          }

          if (tagName === 'img' && typeof attrs.src !== 'string') {
            return undefined
          }

          nodeCount += 1
          return {
            kind: 'element',
            tagName,
            attrs: Object.keys(attrs).length > 0 ? attrs : undefined,
            children,
          }
        }

        const body = document.body
        if (!body) {
          return [] as DomTreeNode[]
        }

        const selectorRoots = resolveSelectorRoots()
        const rootAnchor = resolveTitleAnchorRoot()
        const rootNodes =
          selectorRoots.length > 0
            ? selectorRoots
            : rootAnchor
              ? [rootAnchor]
              : Array.from(body.childNodes)

        const output: DomTreeNode[] = []
        for (const child of rootNodes) {
          const next = walk(child, 1)
          if (next) {
            output.push(next)
          }
        }

        return output
      },
      {
        maxNodes: DEFAULT_MAX_DOM_NODES,
        maxDepth: DEFAULT_MAX_DOM_DEPTH,
        titleHint: options.titleHint,
        focusTitleNearestBody: options.focusTitleNearestBody,
        mainSelectors: options.mainSelectors ?? [],
        removeSelectors: options.removeSelectors ?? [],
      },
    )

    return Array.isArray(tree) ? (tree as ReaderTreeNode[]) : undefined
  } catch {
    return undefined
  }
}

const normalizeText = (value: string): string => {
  return value.replace(/\s+/g, ' ').trim()
}

const resolveExcerptFromText = (text: string): string | undefined => {
  const normalized = normalizeText(text)
  if (normalized.length < 60) {
    return undefined
  }

  return normalized.slice(0, 320)
}
