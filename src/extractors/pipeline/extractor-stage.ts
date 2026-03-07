export abstract class ExtractorStage<TContext> {
  public readonly id: string

  protected constructor(id: string) {
    this.id = id
  }

  public abstract execute(context: TContext): Promise<TContext>
}
