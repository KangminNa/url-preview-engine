import type { PreviewPipelineState } from './state'
import { BootstrapStage } from './stages/bootstrap.stage'
import { BuildCardStage } from './stages/build-card.stage'
import { ClassifyCapabilityStage } from './stages/classify-capability.stage'
import { DynamicExtractStage } from './stages/dynamic-extract.stage'
import { FetchStaticStage } from './stages/fetch-static.stage'
import type { PreviewStage } from './stages/preview-stage'

export class PreviewPipeline {
  private readonly stages: PreviewStage[]

  public constructor(stages: PreviewStage[]) {
    this.stages = stages
  }

  public async run(
    initialState: PreviewPipelineState,
  ): Promise<PreviewPipelineState> {
    let state = initialState
    for (const stage of this.stages) {
      state = await stage.execute(state)
    }

    return state
  }
}

export const createDefaultPreviewPipeline = (): PreviewPipeline => {
  return new PreviewPipeline([
    new BootstrapStage(),
    new FetchStaticStage(),
    new DynamicExtractStage(),
    new ClassifyCapabilityStage(),
    new BuildCardStage(),
  ])
}
