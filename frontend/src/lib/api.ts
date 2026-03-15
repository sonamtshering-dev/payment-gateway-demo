const API_BASE = '';

class APIClient {
  private baseURL: string;
  private accessToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  setToken(token: string) {
    this.accessToken = token;
  }

  clearToken() {
    this.accessToken = null;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any,
    options?: { skipAuth?: boolean }
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken && !options?.skipAuth) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const config: RequestInit = {
      method,
      headers,
      credentials: 'include',
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseURL}${path}`, config);

    if (response.status === 401) {
      // Try refresh
      const refreshed = await this.refreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        const retryResponse = await fetch(`${this.baseURL}${path}`, {
          ...config,
          headers,
        });
        return retryResponse.json();
      }
      throw new Error('Session expired. Please login again.');
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('upay_refresh_token');
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseURL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      if (data.success && data.data) {
        this.accessToken = data.data.access_token;
        localStorage.setItem('upay_access_token', data.data.access_token);
        localStorage.setItem('upay_refresh_token', data.data.refresh_token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // Auth
  async register(name: string, email: string, password: string) {
    return this.request<any>('POST', '/api/v1/auth/register', { name, email, password }, { skipAuth: true });
  }

  async login(email: string, password: string) {
    return this.request<any>('POST', '/api/v1/auth/login', { email, password }, { skipAuth: true });
  }

  // Dashboard
  async getStats() {
    return this.request<any>('GET', '/api/v1/dashboard/stats');
  }

  async getTransactions(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>('GET', `/api/v1/dashboard/transactions${query}`);
  }

  async getProfile() {
    return this.request<any>('GET', '/api/v1/dashboard/profile');
  }

  // UPI
  async addUPI(upiId: string, label: string, priority: number) {
    return this.request<any>('POST', '/api/v1/dashboard/upi', { upi_id: upiId, label, priority });
  }

  async listUPIs() {
    return this.request<any>('GET', '/api/v1/dashboard/upi');
  }

  // Webhook
  async updateWebhook(webhookUrl: string) {
    return this.request<any>('PUT', '/api/v1/dashboard/webhook', { webhook_url: webhookUrl });
  }

  // Admin
  async adminListMerchants(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>('GET', `/api/v1/admin/merchants${query}`);
  }

  async adminGetFraudAlerts(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>('GET', `/api/v1/admin/fraud-alerts${query}`);
  }
}

export const api = new APIClient(API_BASE);
export default api;
