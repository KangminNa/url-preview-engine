import type { ExtractedMetadata } from '../types/metadata'

interface MetascraperResult {
  title?: string
  description?: string
  image?: string
  author?: string
  date?: string
  url?: string
}

type MetascraperFactory = (rules: Array<() => unknown>) => (input: {
  html: string
  url: string
}) => Promise<MetascraperResult>

export const extractWithMetascraper = async (
  html: string,
  url: string,
): Promise<ExtractedMetadata> => {
  try {
    const metascraperModule = await import('metascraper')
    const titleRuleModule = await import('metascraper-title')
    const descriptionRuleModule = await import('metascraper-description')
    const imageRuleModule = await import('metascraper-image')
    const authorRuleModule = await import('metascraper-author')
    const dateRuleModule = await import('metascraper-date')
    const urlRuleModule = await import('metascraper-url')

    const metascraper = (metascraperModule.default ??
      metascraperModule) as unknown as MetascraperFactory

    const scrape = metascraper([
      (titleRuleModule.default ?? titleRuleModule) as () => unknown,
      (descriptionRuleModule.default ?? descriptionRuleModule) as () => unknown,
      (imageRuleModule.default ?? imageRuleModule) as () => unknown,
      (authorRuleModule.default ?? authorRuleModule) as () => unknown,
      (dateRuleModule.default ?? dateRuleModule) as () => unknown,
      (urlRuleModule.default ?? urlRuleModule) as () => unknown,
    ])

    const result = await scrape({ html, url })

    return {
      title: result.title,
      description: result.description,
      imageUrl: result.image,
      author: result.author,
      publishedAt: result.date,
      canonicalUrl: result.url,
    }
  } catch {
    return {}
  }
}
