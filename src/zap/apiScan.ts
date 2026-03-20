import { ZapBase } from './zapBase';

export class ApiScanAPI extends ZapBase {
  async scan(options: {
    url: string;
    recurse?: boolean;
    inScopeOnly?: boolean;
    contextName?: string;
    scanPolicyName?: string;
    method?: string;
    postData?: string;
  }): Promise<{ scan: string }> {
    const params: Record<string, any> = {
      url: options.url,
    };

    if (options.recurse !== undefined) params.recurse = options.recurse;
    if (options.inScopeOnly !== undefined) params.inScopeOnly = options.inScopeOnly;
    if (options.contextName) params.contextName = options.contextName;
    if (options.scanPolicyName) params.scanPolicyName = options.scanPolicyName;
    if (options.method) params.method = options.method;
    if (options.postData) params.postData = options.postData;

    return this.request('/JSON/api/action/scan', params);
  }

  async status(scanId: string): Promise<{ status: string }> {
    return this.request('/JSON/api/view/status', { scanId });
  }

  async jsonReport(): Promise<any> {
    return this.request('/OTHER/api/other/jsonreport');
  }

  async htmlReport(): Promise<string> {
    const response = await this.client.get('/OTHER/api/other/htmlreport', {
      responseType: 'text',
    });
    return response.data;
  }
}
