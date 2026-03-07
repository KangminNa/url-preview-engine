import type { PreviewCard } from '../types/card'
import type { ReaderTreeNode } from '../types/metadata'

const clamp = (value: string | undefined, max: number): string | undefined => {
  if (!value) {
    return undefined
  }

  const normalized = value.trim().replace(/\s+/g, ' ')
  if (normalized.length <= max) {
    return normalized
  }

  return `${normalized.slice(0, max - 1)}…`
}

const clampRaw = (value: string | undefined, max: number): string | undefined => {
  if (!value) {
    return undefined
  }

  if (value.length <= max) {
    return value
  }

  return `${value.slice(0, max - 1)}…`
}

const trimTree = (
  nodes: ReaderTreeNode[] | undefined,
  maxNodes: number,
): {
  tree: ReaderTreeNode[] | undefined
  nodeCount: number
  truncated: boolean
} => {
  if (!nodes || nodes.length === 0) {
    return {
      tree: nodes,
      nodeCount: 0,
      truncated: false,
    }
  }

  const state = {
    count: 0,
    truncated: false,
  }

  const walk = (node: ReaderTreeNode): ReaderTreeNode | undefined => {
    if (state.count >= maxNodes) {
      state.truncated = true
      return undefined
    }

    state.count += 1
    if (node.kind === 'text') {
      return node
    }

    const children: ReaderTreeNode[] = []
    for (const child of node.children) {
      const next = walk(child)
      if (!next) {
        break
      }

      children.push(next)
    }

    if (children.length < node.children.length) {
      state.truncated = true
    }

    if (node.attrs && Object.keys(node.attrs).length > 0) {
      return {
        kind: 'element',
        tagName: node.tagName,
        attrs: node.attrs,
        children,
      }
    }

    return {
      kind: 'element',
      tagName: node.tagName,
      children,
    }
  }

  const tree: ReaderTreeNode[] = []
  for (const node of nodes) {
    const next = walk(node)
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

export const compressCard = (card: PreviewCard): PreviewCard => {
  const compressed: PreviewCard = {
    ...card,
    title: clamp(card.title, 140),
    description: clamp(card.description, 280),
    author: clamp(card.author, 80),
  }

  if ('excerpt' in compressed) {
    compressed.excerpt = clamp(compressed.excerpt, 320)
  }

  if (compressed.snapshot) {
    compressed.snapshot = {
      ...compressed.snapshot,
      keywords: compressed.snapshot.keywords?.slice(0, 10).map((item) => clamp(item, 28) ?? item),
      highlights: compressed.snapshot.highlights
        ?.slice(0, 5)
        .map((item) => clamp(item, 180) ?? item),
    }
  }

  if (compressed.content) {
    const textLimit = 120_000
    const htmlLimit = 180_000
    const blockLimit = 1_500
    const treeNodeLimit = 2_000
    const originalText = compressed.content.text
    const originalHtml = compressed.content.html
    const originalBlocks = compressed.content.blocks
    const treeResult = trimTree(compressed.content.tree, treeNodeLimit)
    const blocks = originalBlocks?.slice(0, blockLimit)

    compressed.content = {
      ...compressed.content,
      text: clamp(originalText, textLimit) ?? '',
      html: clampRaw(originalHtml, htmlLimit) ?? '',
      blocks,
      tree: treeResult.tree,
      treeNodeCount: treeResult.nodeCount,
      truncated:
        compressed.content.truncated ||
        (originalText?.trim().length ?? 0) > textLimit ||
        (originalHtml?.length ?? 0) > htmlLimit ||
        (originalBlocks?.length ?? 0) > blockLimit ||
        treeResult.truncated,
    }
  }

  return compressed
}
