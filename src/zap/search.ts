import { ZapBase } from './zapBase';

export class SearchAPI extends ZapBase {
  async urlsByRegex(regex: string): Promise<any> {
    return this.request('/JSON/search/action/urlsByRegex', { regex });
  }

  async messagesByRegex(regex: string): Promise<any> {
    return this.request('/JSON/search/action/messagesByRegex', { regex });
  }
}
