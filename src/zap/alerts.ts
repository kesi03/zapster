import { ZapBase } from './zapBase';
import { Alert } from '../types';

export class AlertsAPI extends ZapBase {
  async getAlerts(baseurl?: string, start?: number, count?: number): Promise<{ alerts: Alert[] }> {
    const params: Record<string, any> = {};
    if (baseurl) params.baseurl = baseurl;
    if (start !== undefined) params.start = start;
    if (count !== undefined) params.count = count;
    return this.request('/JSON/alert/view/alerts', params);
  }

  async getAlertsSummary(): Promise<any> {
    return this.request('/JSON/alert/view/alertsSummary');
  }
}
