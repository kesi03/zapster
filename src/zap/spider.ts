import { ZapBase } from './zapBase';
import { ScanProgress } from '../types';

export class SpiderAPI extends ZapBase {
  async spiderScan(url: string, maxDepth?: number, maxChildren?: number, recurse?: boolean) {
    const params: Record<string, any> = { url };
    if (maxDepth !== undefined) params.maxDepth = maxDepth;
    if (maxChildren !== undefined) params.maxChildren = maxChildren;
    if (recurse !== undefined) params.recurse = recurse ? 'true' : 'false';
    return this.request('/JSON/spider/action/scan', params);
  }

  async spiderStatus(scanId: string): Promise<ScanProgress> {
    return this.request('/JSON/spider/view/status', { scanId });
  }

  async spiderFullResults(scanId: string): Promise<any> {
    return this.request('/JSON/spider/view/fullResults', { scanId });
  }
}

export class AjaxSpiderAPI extends ZapBase {
  async ajaxSpiderScan(url: string, maxDuration?: number) {
    const params: Record<string, any> = { url };
    if (maxDuration !== undefined) params.maxDuration = maxDuration;
    return this.request('/JSON/ajaxSpider/action/scan', params);
  }

  async ajaxSpiderStatus(): Promise<{ status: string; nodesVisited: number }> {
    return this.request('/JSON/ajaxSpider/view/status');
  }

  async ajaxSpiderStop(): Promise<void> {
    await this.request('/JSON/ajaxSpider/action/stop');
  }
}
