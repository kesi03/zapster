import { ZapBase } from './zapBase';

export class ContextAPI extends ZapBase {
  async contextList(): Promise<{ contextList: string[] }> {
    return this.request('/JSON/context/view/contextList');
  }

  async newContext(name: string): Promise<{ contextId: string }> {
    return this.request('/JSON/context/action/newContext', { contextName: name });
  }

  async includeInContext(contextName: string, regex: string): Promise<void> {
    await this.request('/JSON/context/action/includeInContext', { contextName, regex });
  }

  async excludeFromContext(contextName: string, regex: string): Promise<void> {
    await this.request('/JSON/context/action/excludeInContext', { contextName, regex });
  }

  async exportContext(contextName: string, filePath: string): Promise<void> {
    await this.request('/JSON/context/action/exportContext', { contextName, contextFile: filePath });
  }

  async importContext(filePath: string): Promise<void> {
    await this.request('/JSON/context/action/importContext', { contextFile: filePath });
  }
}
