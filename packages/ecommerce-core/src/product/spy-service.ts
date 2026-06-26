export interface ISpyToolAdapter {
  spy(url: string): Promise<string | any>;
  search?(query: string, options?: any): Promise<any>;
  evaluate?(url: string, selector?: string): Promise<any>;
}

export class SpyToolService {
  constructor(
    private readonly camofoxAdapter: ISpyToolAdapter,
    private readonly cloakAdapter: ISpyToolAdapter
  ) {}

  async spy(url: string): Promise<any> {
    try {
      return await this.camofoxAdapter.spy(url);
    } catch (error: any) {
      console.warn(`[SpyToolService] CamofoxAdapter failed for ${url}, falling back to CloakBrowserAdapter. Error: ${error?.message}`);
      return await this.cloakAdapter.spy(url);
    }
  }
}
