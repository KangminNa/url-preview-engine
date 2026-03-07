import type { ReaderBlock } from '../types/metadata'
import type { ViewEngine, ViewRenderContext, ViewRenderResult } from './types'

const DEFAULT_TITLE = 'Preview Document'

const DEFAULT_RENDER_CSS = `
:root {
  color-scheme: light;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  font-family: "Apple SD Gothic Neo", "Noto Sans KR", "Segoe UI", sans-serif;
  background: #f8fafc;
  color: #0f172a;
}
.preview-root {
  max-width: 840px;
  margin: 0 auto;
  padding: 16px;
  display: grid;
  gap: 12px;
}
.preview-root p {
  margin: 0;
  line-height: 1.65;
}
.preview-root img,
.preview-root video,
.preview-root iframe {
  width: 100%;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #fff;
}
.preview-root video {
  min-height: 220px;
}
.preview-root iframe {
  min-height: 360px;
}
`.trim()

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

const renderBlock = (block: ReaderBlock): string => {
  if (block.type === 'text') {
    return `<p>${escapeHtml(block.text)}</p>`
  }

  if (block.type === 'image') {
    const alt = block.alt ? escapeAttribute(block.alt) : ''
    const altAttr = alt ? ` alt="${alt}"` : ' alt=""'
    return `<img src="${escapeAttribute(block.src)}"${altAttr} loading="lazy" />`
  }

  if (block.type === 'video') {
    const poster = block.poster ? ` poster="${escapeAttribute(block.poster)}"` : ''
    return `<video controls preload="metadata" src="${escapeAttribute(block.src)}"${poster}></video>`
  }

  const title = block.title
    ? ` title="${escapeAttribute(block.title)}"`
    : ' title="Embedded content"'
  return `<iframe src="${escapeAttribute(block.src)}"${title} loading="lazy" allowfullscreen></iframe>`
}

const normalizeTitle = (value: string | undefined): string => {
  const normalized = value?.trim()
  return normalized ? normalized : DEFAULT_TITLE
}

export class DefaultViewEngine implements ViewEngine {
  private readonly css: string

  public constructor(css: string = DEFAULT_RENDER_CSS) {
    this.css = css
  }

  public render(context: ViewRenderContext): ViewRenderResult {
    const html = context.blocks.map((block) => renderBlock(block)).join('')
    const title = normalizeTitle(context.title)
    const indexHtml = `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(title)}</title><link rel="stylesheet" href="./preview.css" /></head><body><main class="preview-root">${html}</main></body></html>`

    return {
      html,
      document: {
        indexHtml,
        css: this.css,
      },
    }
  }
}

export const createDefaultViewEngine = (): DefaultViewEngine => {
  return new DefaultViewEngine()
}
