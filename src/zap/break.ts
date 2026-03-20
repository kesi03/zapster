import { ZapBase } from './zapBase';

export class BreakAPI extends ZapBase {
  async addBreak(type: string, scope: string, state: string, match: string): Promise<void> {
    await this.request('/JSON/break/action/addBreak', { type, scope, state, match });
  }

  async continue(): Promise<void> {
    await this.request('/JSON/break/action/continue');
  }

  async breakpoints(): Promise<any> {
    return this.request('/JSON/break/view/breakpoints');
  }
}
