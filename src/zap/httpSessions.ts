import { ZapBase } from './zapBase';

export class HttpSessionsAPI extends ZapBase {
  async sessions(site: string): Promise<any> {
    return this.request('/JSON/httpSessions/view/sessions', { site });
  }

  async createEmptySession(site: string, sessionName: string): Promise<void> {
    await this.request('/JSON/httpSessions/action/createEmptySession', { site, session: sessionName });
  }

  async setActiveSession(site: string, sessionName: string): Promise<void> {
    await this.request('/JSON/httpSessions/action/setActiveSession', { site, session: sessionName });
  }
}
