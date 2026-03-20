import { ZapBase } from './zapBase';

export class AuthAPI extends ZapBase {
  async getSupportedAuthenticationMethods(): Promise<any> {
    return this.request('/JSON/authentication/view/getSupportedAuthenticationMethods');
  }

  async getAuthenticationMethodConfigParams(methodName: string): Promise<any> {
    return this.request('/JSON/authentication/view/getAuthenticationMethodConfigParams', { authMethodName: methodName });
  }

  async setAuthenticationMethod(
    contextId: string,
    methodName: string,
    configParams: string
  ): Promise<void> {
    await this.request('/JSON/authentication/action/setAuthenticationMethod', {
      contextId,
      authMethodName: methodName,
      authMethodConfigParams: configParams,
    });
  }
}
