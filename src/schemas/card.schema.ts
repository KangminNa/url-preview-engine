import { z } from 'zod'

export const ResourceTypeSchema = z.enum([
  'video',
  'social',
  'article',
  'image',
  'audio',
  'website',
  'unknown',
])

export const PageKindSchema = z.enum([
  'atomic',
  'homepage',
  'collection',
  'profile',
  'unknown',
])

export const InteractionModeSchema = z.enum([
  'static',
  'expandable',
  'playable',
  'embeddable',
])

export const ContentSnapshotSchema = z.object({
  language: z.string().optional(),
  faviconUrl: z.string().url().optional(),
  estimatedReadingMinutes: z.number().int().positive().optional(),
  wordCount: z.number().int().nonnegative().optional(),
  keywords: z.array(z.string()).max(10).optional(),
  highlights: z.array(z.string()).max(5).optional(),
})

const ReaderTreeNodeSchema: z.ZodType<{
  kind: 'text' | 'element'
  text?: string
  tagName?: string
  attrs?: Record<string, string | true>
  children?: unknown[]
}> = z.lazy(() =>
  z.union([
    z.object({
      kind: z.literal('text'),
      text: z.string(),
    }),
    z.object({
      kind: z.literal('element'),
      tagName: z.string().min(1),
      attrs: z.record(z.union([z.string(), z.literal(true)])).optional(),
      children: z.array(ReaderTreeNodeSchema),
    }),
  ]),
)

export const ReaderContentSchema = z.object({
  html: z.string(),
  text: z.string(),
  blockCount: z.number().int().nonnegative(),
  truncated: z.boolean(),
  blocks: z
    .array(
      z.union([
        z.object({
          type: z.literal('text'),
          text: z.string(),
        }),
        z.object({
          type: z.literal('image'),
          src: z.string().url(),
          alt: z.string().optional(),
        }),
      ]),
    )
    .optional(),
  tree: z.array(ReaderTreeNodeSchema).optional(),
  treeNodeCount: z.number().int().nonnegative().optional(),
  source: z.enum(['dynamic-dom', 'static-html']).optional(),
  captureMode: z.enum(['full-body', 'focused-body']).optional(),
})

export const BaseCardSchema = z.object({
  originalUrl: z.string().url(),
  resolvedUrl: z.string().url(),
  canonicalUrl: z.string().url().optional(),
  provider: z.string().min(1),
  resourceType: ResourceTypeSchema,
  pageKind: PageKindSchema,
  title: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  siteName: z.string().optional(),
  author: z.string().optional(),
  publishedAt: z.string().optional(),
  snapshot: ContentSnapshotSchema.optional(),
  content: ReaderContentSchema.optional(),
  embeddable: z.boolean(),
  playable: z.boolean(),
  interactionMode: InteractionModeSchema,
  embedUrl: z.string().url().optional(),
  excerpt: z.string().optional(),
  duration: z.number().nonnegative().optional(),
  originalMediaUrl: z.string().url().optional(),
})

export type ParsedCard = z.infer<typeof BaseCardSchema>
