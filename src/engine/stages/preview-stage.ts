import type { PreviewPipelineState } from '../state'

export abstract class PreviewStage {
  public readonly id: string

  protected constructor(id: string) {
    this.id = id
  }

  public abstract execute(
    state: PreviewPipelineState,
  ): Promise<PreviewPipelineState>
}
