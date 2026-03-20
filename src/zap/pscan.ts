import { ZapBase } from './zapBase';

export class PassiveScanAPI extends ZapBase {
  async passiveScanEnable(): Promise<void> {
    await this.request('/JSON/pscan/action/setEnabled', { enabled: 'true' });
  }

  async passiveScanDisable(): Promise<void> {
    await this.request('/JSON/pscan/action/setEnabled', { enabled: 'false' });
  }

  async passiveScanRecordsToScan(): Promise<{ count: number }> {
    return this.request('/JSON/pscan/view/recordsToScan');
  }
}
