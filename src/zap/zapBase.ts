import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ZapConfig } from '../types';

export class ZapBase {
  protected client: AxiosInstance;
  protected apiKey: string | null;

  constructor(config: ZapConfig) {
    this.apiKey = config.apiKey || null;
    const baseURL = `http://${config.host}:${config.port}`;

    this.client = axios.create({
      baseURL,
      timeout: 300000,
      headers: { 'Content-Type': 'application/json' },
    });

    if (this.apiKey) {
      this.client.interceptors.request.use((config) => {
        config.params = { ...config.params, apikey: this.apiKey };
        return config;
      });
    }
  }

  protected async request<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.get(endpoint, { params });
      console.log(`[ZAP DEBUG] ${endpoint} =>`, JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      const zapMessage =
        error.response?.data?.message ||
        error.response?.data?.Exception ||
        JSON.stringify(error.response?.data);

      throw new Error(`ZAP API Error: ${zapMessage}`);
    }
  }

  protected encodeUrl(url: string): string {
    return encodeURIComponent(url);
  }
}
