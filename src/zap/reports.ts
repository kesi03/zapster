import { ZapBase } from './zapBase';
import { ReportOptions } from '../types';

export class ReportsAPI extends ZapBase {
  async generateReport(options: ReportOptions): Promise<string> {
    const params: Record<string, any> = {
      title: options.title || 'ZAP Security Report',
      format: options.format,
    };
    if (options.template) params.template = options.template;
    if (options.description) params.description = options.description;
    if (options.contexts) params.contexts = options.contexts.join(',');
    if (options.sites) params.sites = options.sites.join(',');
    return this.request('/JSON/reports/action/generate', params);
  }

  async getJsonReport(): Promise<any> {
    return this.request('/OTHER/core/other/jsonreport');
  }

  async getXmlReport(): Promise<string> {
    const response = await this.client.get('/OTHER/core/other/xmlreport', { responseType: 'text' });
    return response.data;
  }

  async getHtmlReport(): Promise<string> {
    const response = await this.client.get('/OTHER/core/other/htmlreport', { responseType: 'text' });
    return response.data;
  }

  async getMdReport(): Promise<string> {
    const response = await this.client.get('/OTHER/core/other/mdreport', { responseType: 'text' });
    return response.data;
  }
}
