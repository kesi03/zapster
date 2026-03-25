import { ZapBase } from './zapBase';
import { ScanProgress } from '../types';

export class SpiderAPI extends ZapBase {
  async spiderScan(url: string, maxDepth?: number, maxChildren?: number, recurse?: boolean) {
    const params: Record<string, any> = { url };
    if (maxDepth !== undefined) params.maxDepth = maxDepth;
    if (maxChildren !== undefined) params.maxChildren = maxChildren;
    if (recurse !== undefined) params.recurse = recurse;
    const response = await this.request<{ scan: string }>('/JSON/spider/action/scan', params);
    return response.scan;
  }

  async spiderStatus(scanId: string): Promise<{ progress: number; state: string }> {
    const response = await this.request<{ status: string }>('/JSON/spider/view/status', { scanId });
    const progress = parseInt(response.status, 10);
    return {
      progress,
      state: progress === 100 ? 'FINISHED' : 'RUNNING'
    };
  }

  async spiderFullResults(scanId: string): Promise<any> {
    const response = await this.request<{ results: any[] }>('/JSON/spider/view/fullResults', { scanId });
    return response;
  }
}

export class AjaxSpiderAPI extends ZapBase {
  async ajaxSpiderScan(url: string, maxDuration?: number, maxDepth?: number, maxStates?: number) {
    if (maxDuration !== undefined) {
      await this.request('/JSON/ajaxSpider/action/setOptionMaxDuration', { Integer: maxDuration });
    }
    if (maxDepth !== undefined) {
      await this.request('/JSON/ajaxSpider/action/setOptionMaxCrawlDepth', { Integer: maxDepth });
    }
    if (maxStates !== undefined) {
      await this.request('/JSON/ajaxSpider/action/setOptionMaxCrawlStates', { Integer: maxStates });
    }
    const params: Record<string, any> = { url };
    const response = await this.request<{ scan: string }>('/JSON/ajaxSpider/action/scan', params);
    return response.scan;
  }

  async ajaxSpiderStatus(): Promise<{ status: string; nodesVisited: number }> {
    let status = '';
    let nodesVisited = 0;

    try {
      const response = await this.request<any>('/JSON/ajaxSpider/view/status');
    
      if (typeof response === 'string') {
        status = response;
      } else if (response && response.status) {
        status = typeof response.status === 'string' ? response.status : response.status.status || '';
      }
    } catch (e) {
      status = 'ERROR';
    }
    
    try {
      const resultsResponse = await this.request<any>('/JSON/ajaxSpider/view/results');
    
      if (resultsResponse && resultsResponse.results) {
        nodesVisited = resultsResponse.results.length;
      } else if (resultsResponse && typeof resultsResponse === 'object') {
        const keys = Object.keys(resultsResponse);
        if (keys.length > 0) {
          const firstKey = keys[0];
          if (Array.isArray(resultsResponse[firstKey])) {
            nodesVisited = resultsResponse[firstKey].length;
          }
        }
      }
    } catch (e) {
      nodesVisited = 0;
    }
    
    return { status, nodesVisited };
  }

  async ajaxSpiderStop(): Promise<void> {
    await this.request('/JSON/ajaxSpider/action/stop');
  }
}

export class ClientSpiderAPI extends ZapBase {
  async clientSpiderScan(url: string, options?: {
    browser?: string;
    contextName?: string;
    userName?: string;
    subtreeOnly?: boolean;
    maxCrawlDepth?: number;
    pageLoadTime?: number;
  }) {
    const params: Record<string, any> = { url };
    if (options?.browser) params.browser = options.browser;
    if (options?.contextName) params.contextName = options.contextName;
    if (options?.userName) params.userName = options.userName;
    if (options?.subtreeOnly !== undefined) params.subtreeOnly = options.subtreeOnly.toString();
    if (options?.maxCrawlDepth !== undefined) params.maxCrawlDepth = options.maxCrawlDepth.toString();
    if (options?.pageLoadTime !== undefined) params.pageLoadTime = options.pageLoadTime.toString();
    const response = await this.request<{ scan: string }>('/JSON/clientSpider/action/scan', params);
    return response.scan;
  }

  async clientSpiderStatus(scanId: string): Promise<{ progress: number; state: string }> {
    const response = await this.request<{ status: string }>('/JSON/clientSpider/view/status', { scanId });
    const progress = parseInt(response.status, 10);
    return {
      progress,
      state: progress === 100 ? 'FINISHED' : 'RUNNING'
    };
  }

  async clientSpiderStop(scanId: string): Promise<void> {
    await this.request('/JSON/clientSpider/action/stop', { scanId });
  }
}
