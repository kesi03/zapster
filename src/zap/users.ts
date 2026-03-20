import { ZapBase } from './zapBase';

export class UsersAPI extends ZapBase {
  async usersList(contextId: string): Promise<any> {
    return this.request('/JSON/users/view/usersList', { contextId });
  }

  async newUser(contextId: string, name: string): Promise<{ userId: string }> {
    return this.request('/JSON/users/action/newUser', { contextId, name });
  }

  async removeUser(contextId: string, userId: string): Promise<void> {
    await this.request('/JSON/users/action/removeUser', { contextId, userId });
  }

  async setUserEnabled(contextId: string, userId: string, enabled: boolean): Promise<void> {
    await this.request('/JSON/users/action/setUserEnabled', {
      contextId,
      userId,
      enabled,
    });
  }

  async setAuthenticationCredentials(contextId: string, userId: string, credentials: string): Promise<void> {
    await this.request('/JSON/users/action/setAuthenticationCredentials', {
      contextId,
      userId,
      authCredentialsConfigParams: credentials,
    });
  }
}
