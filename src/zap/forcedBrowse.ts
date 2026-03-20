import { ZapBase } from './zapBase';

export class ForcedBrowseAPI extends ZapBase {
  async scan(url: string, contextName?: string): Promise<{ scanId: string }> {
    const params: Record<string, any> = { url };
    if (contextName) params.contextName = contextName;
    return this.request('/JSON/forcedBrowse/action/scan', params);
  }

  async stop(scanId: string): Promise<void> {
    await this.request('/JSON/forcedBrowse/action/stop', { scanId });
  }

  async scans(): Promise<any> {
    return this.request('/JSON/forcedBrowse/view/scans');
  }
}
