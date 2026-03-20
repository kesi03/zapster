import { ZapBase } from './zapBase';

export class CoreAPI extends ZapBase {
  async getVersion(): Promise<string> {
    const response = await this.request<{ version: string }>('/JSON/core/view/version');
    return response.version;
  }

  async shutdown(): Promise<void> {
    await this.request('/JSON/core/action/shutdown');
  }

  async newSession(name?: string, overwrite?: boolean): Promise<void> {
    const params: Record<string, any> = {};
    if (name) params.name = name;
    if (overwrite !== undefined) params.overwrite = overwrite ? 'true' : 'false';
    await this.request('/JSON/core/action/newSession', params);
  }

  async saveSession(name: string, overwrite?: boolean): Promise<void> {
    const params: Record<string, any> = { name };
    if (overwrite !== undefined) params.overwrite = overwrite ? 'true' : 'false';
    await this.request('/JSON/core/action/saveSession', params);
  }

  async getSites(): Promise<{ sites: string[] }> {
    return this.request('/JSON/core/view/sites');
  }

  async getUrls(): Promise<{ urls: string[] }> {
    return this.request('/JSON/core/view/urls');
  }

  async getLogLevel(): Promise<{ level: string }> {
    return this.request('/JSON/core/view/getLogLevel');
  }

  async setLogLevel(level: string): Promise<void> {
    await this.request('/JSON/core/action/setLogLevel', { level });
  }

  async accessUrl(url: string): Promise<void> {
    await this.request('/JSON/core/action/accessUrl', { url: this.encodeUrl(url) });
  }

  async setRuleConfigValue(key: string, value: string): Promise<void> {
    await this.request('/JSON/ruleConfig/action/setRuleConfigValue', { key, value });
  }

  async resetRuleConfigValue(key: string): Promise<void> {
    await this.request('/JSON/ruleConfig/action/resetRuleConfigValue', { key });
  }

  async resetAllRuleConfigValues(): Promise<void> {
    await this.request('/JSON/ruleConfig/action/resetAllRuleConfigValues', {});
  }

  async getAllRuleConfigs(): Promise<any> {
    return this.request('/JSON/ruleConfig/view/allRuleConfigs');
  }
}
