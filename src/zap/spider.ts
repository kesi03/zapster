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
  async ajaxSpiderScan(url: string, maxDuration?: number) {
    const params: Record<string, any> = { url };
    if (maxDuration !== undefined) params.maxDuration = maxDuration;
    const response = await this.request<{ scan: string }>('/JSON/ajaxSpider/action/scan', params);
    return response.scan;
  }

  async ajaxSpiderStatus(): Promise<{ status: string; nodesVisited: number }> {
    const response = await this.request<any>('/JSON/ajaxSpider/view/status');
    
    let status = '';
    let nodesVisited = 0;
    
    if (typeof response === 'string') {
      status = response;
    } else if (response.status) {
      status = typeof response.status === 'string' ? response.status : response.status.status || '';
    }
    
    const resultsResponse = await this.request<any>('/JSON/ajaxSpider/view/results');
    
    if (resultsResponse.results) {
      nodesVisited = resultsResponse.results.length;
    } else if (typeof resultsResponse === 'object') {
      const keys = Object.keys(resultsResponse);
      if (keys.length > 0) {
        const firstKey = keys[0];
        if (Array.isArray(resultsResponse[firstKey])) {
          nodesVisited = resultsResponse[firstKey].length;
        }
      }
    }
    
    return { status, nodesVisited };
  }

  async ajaxSpiderStop(): Promise<void> {
    await this.request('/JSON/ajaxSpider/action/stop');
  }
}
