import { ZapBase } from './zapBase';

export class ProxyAPI extends ZapBase {
  async proxyChainExcludedDomains(): Promise<any> {
    return this.request('/JSON/core/view/proxyChainExcludedDomains');
  }

  async addProxyChainExcludedDomain(value: string, isRegex = false, isEnabled = true): Promise<void> {
    await this.request('/JSON/core/action/addProxyChainExcludedDomain', {
      value,
      isRegex: isRegex ? 'true' : 'false',
      isEnabled: isEnabled ? 'true' : 'false',
    });
  }
}
