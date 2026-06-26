export interface ISpyToolAdapter {
  search(query: string, options?: any): Promise<any>;
  evaluate?(url: string, selector?: string): Promise<any>;
}

export class SpyToolService {
  private adapters: ISpyToolAdapter[];

  constructor(adapters: ISpyToolAdapter[]) {
    this.adapters = adapters;
  }

  async executeSpyAction(action: 'search' | 'evaluate', ...args: any[]): Promise<any> {
    let lastError: Error | null = null;
    
    // Escalation Pattern: Try adapters in order (e.g. Camofox -> CloakBrowser)
    for (const adapter of this.adapters) {
      try {
        if (action === 'search') {
          return await adapter.search(args[0], args[1]);
        } else if (action === 'evaluate' && adapter.evaluate) {
          return await adapter.evaluate(args[0], args[1]);
        }
      } catch (error: any) {
        lastError = error;
        console.warn(`[SpyToolService] Adapter ${adapter.constructor.name} failed for ${action}, falling back...`, error.message);
        continue;
      }
    }
    
    throw new Error(`[SpyToolService] All adapters failed for action ${action}. Last error: ${lastError?.message}`);
  }
}
