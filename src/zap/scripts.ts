import { ZapBase } from './zapBase';

export class ScriptsAPI extends ZapBase {
  async listScripts(): Promise<any> {
    return this.request('/JSON/script/view/listScripts');
  }

  async loadScript(name: string, type: string, engine: string, fileName: string, description?: string): Promise<void> {
    const params: Record<string, any> = { scriptName: name, scriptType: type, scriptEngine: engine, fileName };
    if (description) params.scriptDescription = description;
    await this.request('/JSON/script/action/load', params);
  }

  async runStandAloneScript(name: string): Promise<void> {
    await this.request('/JSON/script/action/runStandAloneScript', { scriptName: name });
  }
}
