import { ISpyToolAdapter } from './spy-service.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class SearxngSearchAdapter implements ISpyToolAdapter {
  async spy(url: string): Promise<any> {
    return this.search(url);
  }

  async search(query: string, options?: any): Promise<any> {
    const searchParams = new URLSearchParams({
      q: query,
      format: 'json',
      ...options
    });

    const response = await fetch(`http://localhost:8080/search?${searchParams}`);
    if (!response.ok) {
      throw new Error(`Searxng search failed: ${response.statusText}`);
    }
    return response.json();
  }
}

export class CamofoxAdapter implements ISpyToolAdapter {
  async spy(url: string): Promise<any> {
    return this.evaluate(url);
  }

  async evaluate(url: string, selector?: string): Promise<any> {
    const payload: any = { url };
    if (selector) payload.selector = selector;

    const response = await fetch('http://localhost:9377/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Camofox evaluate failed: ${response.statusText}`);
    }
    return response.json();
  }

  async getTabs(): Promise<any> {
    const response = await fetch('http://localhost:9377/tabs');
    if (!response.ok) {
      throw new Error(`Camofox getTabs failed: ${response.statusText}`);
    }
    return response.json();
  }
}

export class CloakBrowserAdapter implements ISpyToolAdapter {
  async spy(url: string): Promise<any> {
    const cmd = `node scripts/cloak/cloak-fetch.mjs "${url}"`;
    try {
      const { stdout } = await execAsync(cmd);
      return stdout;
    } catch (error: any) {
      throw new Error(`CloakBrowser evaluate failed: ${error.message}`);
    }
  }
}
