import { ZapBase } from './zapBase';

export class AutomationAPI extends ZapBase {
  async runPlan(planPath: string): Promise<void> {
    await this.request('/JSON/automation/action/runPlan', { plan: planPath });
  }

  async planProgress(): Promise<{ jobManager: string; jobThreads: any[] }> {
    return this.request('/JSON/automation/view/planProgress');
  }

  async endDelayJob(): Promise<void> {
    await this.request('/JSON/automation/action/endDelayJob', {});
  }
}
