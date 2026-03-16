export interface Merchant {
  id: string;
  name: string;
  email: string;
  api_key: string;
  is_active: boolean;
  is_admin: boolean;
  webhook_url?: string;
  daily_limit?: number;
  created_at: string;
}
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  merchant: Merchant;
}
export interface DashboardStats {
  total_transactions: number;
  successful_payments: number;
  failed_payments: number;
  pending_payments: number;
  total_volume: number;
  success_rate: number;
  today_transactions: number;
  today_volume: number;
}
export interface Payment {
  id: string;
  merchant_id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'expired';
  customer_reference: string;
  upi_id: string;
  utr?: string;
  expires_at: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}
export interface MerchantUPI {
  id: string;
  merchant_id: string;
  upi_id: string;
  label: string;
  is_active: boolean;
  priority: number;
  created_at: string;
}
export interface FraudAlert {
  id: string;
  payment_id: string;
  merchant_id: string;
  alert_type: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  created_at: string;
}
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}
export interface APIResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}