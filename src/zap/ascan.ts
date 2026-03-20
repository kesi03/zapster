import { ZapBase } from './zapBase';
import { ScanProgress } from '../types';

export class ActiveScanAPI extends ZapBase {
  async activeScan(
    url: string,
    contextName?: string,
    userId?: number,
    policyName?: string
  ): Promise<{ scan: string }> {
    const params: Record<string, any> = { url: this.encodeUrl(url) };
    if (contextName) params.contextName = contextName;
    if (userId !== undefined) params.userId = userId;
    if (policyName) params.policyName = policyName;
    return this.request('/JSON/ascan/action/scan', params);
  }

  async activeScanStatus(scanId?: string): Promise<ScanProgress | ScanProgress[]> {
    if (scanId) {
      return this.request('/JSON/ascan/view/scanProgress', { scanId });
    }
    return this.request('/JSON/ascan/view/scans');
  }

  async activeScanStop(scanId: string): Promise<void> {
    await this.request('/JSON/ascan/action/stop', { scanId });
  }

  async activeScanPause(scanId: string): Promise<void> {
    await this.request('/JSON/ascan/action/pause', { scanId });
  }

  async activeScanResume(scanId: string): Promise<void> {
    await this.request('/JSON/ascan/action/resume', { scanId });
  }

  async enableAllScanners(policyName?: string): Promise<void> {
    const params: Record<string, any> = {};
    if (policyName) params.policyName = policyName;
    await this.request('/JSON/ascan/action/enableAllScanners', params);
  }

  async disableAllScanners(policyName?: string): Promise<void> {
    const params: Record<string, any> = {};
    if (policyName) params.policyName = policyName;
    await this.request('/JSON/ascan/action/disableAllScanners', params);
  }

  async enableScanners(ids: number[], policyName?: string): Promise<void> {
    const params: Record<string, any> = { ids: ids.join(',') };
    if (policyName) params.policyName = policyName;
    await this.request('/JSON/ascan/action/enableScanners', params);
  }

  async disableScanners(ids: number[], policyName?: string): Promise<void> {
    const params: Record<string, any> = { ids: ids.join(',') };
    if (policyName) params.policyName = policyName;
    await this.request('/JSON/ascan/action/disableScanners', params);
  }

  async setScannerAlertThreshold(scannerId: number, threshold: string, policyName?: string) {
    const params: Record<string, any> = { scannerId, alertThreshold: threshold };
    if (policyName) params.policyName = policyName;
    await this.request('/JSON/ascan/action/setScannerAlertThreshold', params);
  }

  async setScannerAttackStrength(scannerId: number, strength: string, policyName?: string) {
    const params: Record<string, any> = { scannerId, attackStrength: strength };
    if (policyName) params.policyName = policyName;
    await this.request('/JSON/ascan/action/setScannerAttackStrength', params);
  }
}
