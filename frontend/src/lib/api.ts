const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

class APIClient {
  private baseURL: string;
  private accessToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Restore token from localStorage on init (client-side only)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('upay_access_token');
      if (token) this.accessToken = token;
    }
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

    // Safely parse response — server may return plain text on errors
    const safeJSON = async (r: Response) => {
      const text = await r.text();
      try {
        return JSON.parse(text);
      } catch {
        // Not JSON — wrap in standard error shape
        return { success: false, error: text || `Server error ${r.status}` };
      }
    };

    if (response.status === 401 && !options?.skipAuth) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        const retryResponse = await fetch(`${this.baseURL}${path}`, {
          ...config,
          headers,
        });
        return safeJSON(retryResponse);
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem('upay_access_token');
        localStorage.removeItem('upay_refresh_token');
        window.location.href = '/auth/login';
      }
      throw new Error('Session expired. Please login again.');
    }

    const data = await safeJSON(response);
    if (!response.ok) {
      throw new Error(data.error || `Request failed: ${response.status}`);
    }
    return data;
  }

  private async refreshToken(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
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

  // ============================================================
  // AUTH
  // ============================================================
  async register(name: string, email: string, password: string) {
    return this.request<any>('POST', '/api/v1/auth/register', { name, email, password }, { skipAuth: true });
  }

  async login(email: string, password: string) {
    return this.request<any>('POST', '/api/v1/auth/login', { email, password }, { skipAuth: true });
  }

  // ============================================================
  // DASHBOARD
  // ============================================================
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

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<any>('POST', '/api/v1/dashboard/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  async rotateAPIKeys() {
    return this.request<any>('POST', '/api/v1/dashboard/rotate-keys');
  }

  // ============================================================
  // UPI
  // ============================================================
  async addUPI(upiId: string, label: string, priority: number) {
    return this.request<any>('POST', '/api/v1/dashboard/upi', { upi_id: upiId, label, priority });
  }

  async listUPIs() {
    return this.request<any>('GET', '/api/v1/dashboard/upi');
  }

  async deleteUPI(upiId: string) {
    return this.request<any>('DELETE', `/api/v1/dashboard/upi/${upiId}`);
  }

  // ============================================================
  // WEBHOOK
  // ============================================================
  async updateWebhook(webhookUrl: string) {
    return this.request<any>('PUT', '/api/v1/dashboard/webhook', { webhook_url: webhookUrl });
  }

  // ============================================================
  // PAYMENTS
  // ============================================================
  async createPayment(merchantId: string, orderId: string, amount: number, customerReference?: string) {
    return this.request<any>('POST', '/api/v1/payments/create', {
      merchant_id: merchantId,
      order_id: orderId,
      amount,
      currency: 'INR',
      customer_reference: customerReference || '',
    });
  }

  async getPaymentStatus(paymentId: string) {
    return this.request<any>('GET', `/api/v1/payments/status/${paymentId}`);
  }

  async verifyPayment(paymentId: string, utr: string, amount: number) {
    return this.request<any>('POST', '/api/v1/payments/verify', {
      payment_id: paymentId,
      utr,
      amount,
    });
  }

  // ============================================================
  // ADMIN
  // ============================================================
  async adminListMerchants(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>('GET', `/api/v1/admin/merchants${query}`);
  }

  async adminToggleMerchant(merchantId: string) {
    return this.request<any>('PUT', `/api/v1/admin/merchants/${merchantId}/toggle`);
  }

  async adminGetFraudAlerts(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>('GET', `/api/v1/admin/fraud-alerts${query}`);
  }

  async adminResolveFraudAlert(alertId: string) {
    return this.request<any>('PUT', `/api/v1/admin/fraud-alerts/${alertId}/resolve`);
  }

  async adminUpdatePaymentStatus(paymentId: string, status: string) {
    return this.request<any>('PUT', `/api/v1/admin/payments/${paymentId}/status`, { status });
  }

  async adminGetStats() {
    return this.request<any>('GET', '/api/v1/admin/stats');
  }
}

export const api = new APIClient(API_BASE);
export default api;