import type { PreviewCard } from '../types/card'
import type { PreviewOptions } from '../types/metadata'
import { createDefaultPreviewPipeline } from './preview-pipeline'
import { requireCard } from './helpers/state-guards'

export const preview = async (
  inputUrl: string,
  options: PreviewOptions = {},
): Promise<PreviewCard> => {
  const pipeline = createDefaultPreviewPipeline()
  const state = await pipeline.run({
    inputUrl,
    options,
    metadata: {},
  })

  return requireCard(state)
}
