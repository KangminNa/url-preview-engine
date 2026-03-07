import type { ExtractorStage } from './extractor-stage'

export class ExtractorPipeline<TContext> {
  private readonly stages: Array<ExtractorStage<TContext>>

  public constructor(stages: Array<ExtractorStage<TContext>>) {
    this.stages = stages
  }

  public async run(initialContext: TContext): Promise<TContext> {
    let context = initialContext
    for (const stage of this.stages) {
      context = await stage.execute(context)
    }

    return context
  }
}

