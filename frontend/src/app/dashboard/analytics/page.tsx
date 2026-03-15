'use client';

import React from 'react';

export default function AnalyticsPage() {
  const codeBlockStyle = {
    background: '#1e1e2e', color: '#cdd6f4', padding: 18, borderRadius: 12,
    fontSize: 12.5, lineHeight: 1.6, overflow: 'auto' as const, marginTop: 8,
  };

  return (
    <div style={{ maxWidth: 780 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 24px' }}>Integration guide</h1>

      <div style={{ background: '#fff', borderRadius: 14, padding: '24px 28px', border: '1px solid #e5e7eb', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 14px' }}>1. Create a payment session</h2>
        <pre style={codeBlockStyle}>{`const crypto = require('crypto');

const API_KEY = 'upay_your_key';
const API_SECRET = 'sk_your_secret';
const BASE_URL = 'https://api.upay.dev';

const body = JSON.stringify({
  merchant_id: 'your-merchant-uuid',
  order_id: 'ORD-' + Date.now(),
  amount: 249900,  // ₹2,499.00 in paise
  currency: 'INR',
  customer_reference: 'Customer Name'
});

const timestamp = Math.floor(Date.now() / 1000).toString();
const signature = crypto
  .createHmac('sha256', API_SECRET)
  .update(API_SECRET + timestamp + body)
  .digest('hex');

const response = await fetch(BASE_URL + '/api/v1/payments/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': API_KEY,
    'X-TIMESTAMP': timestamp,
    'X-SIGNATURE': signature,
  },
  body,
});

const { data } = await response.json();
// data.payment_id, data.qr_code_base64, data.upi_intent_link`}</pre>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, padding: '24px 28px', border: '1px solid #e5e7eb', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 14px' }}>2. Display to customer</h2>
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7, margin: '0 0 12px' }}>
          Show the QR code image and UPI deep link. Alternatively, redirect to the hosted payment page:
        </p>
        <pre style={codeBlockStyle}>{`<!-- Option A: Hosted page (simplest) -->
<a href="https://api.upay.dev/pay/{payment_id}">Pay Now</a>

<!-- Option B: Embed QR directly -->
<img src="data:image/png;base64,{qr_code_base64}" />
<a href="{upi_intent_link}">Open UPI App</a>`}</pre>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, padding: '24px 28px', border: '1px solid #e5e7eb', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 14px' }}>3. Poll status or use webhooks</h2>
        <pre style={codeBlockStyle}>{`// Poll every 4 seconds
const checkStatus = async (paymentId) => {
  const res = await fetch(
    BASE_URL + '/api/v1/payments/status/' + paymentId,
    { headers: { 'X-API-KEY': API_KEY, ... } }
  );
  const { data } = await res.json();
  
  if (data.status === 'paid') {
    // Fulfil the order
  } else if (data.status === 'expired') {
    // Show expiry message
  }
};`}</pre>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, padding: '24px 28px', border: '1px solid #e5e7eb', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 14px' }}>4. Verify webhook signature</h2>
        <pre style={codeBlockStyle}>{`app.post('/webhooks/upay', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  if (!crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  )) {
    return res.status(401).send('Invalid signature');
  }

  const { payment_id, status, order_id, amount } = req.body;
  // Update your order in DB
  
  res.status(200).send('OK');
});`}</pre>
      </div>

      <div style={{ background: '#f0f0ff', borderRadius: 14, padding: '20px 24px', border: '1px solid #c7d2fe' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4f46e5', margin: '0 0 8px' }}>Need help?</h3>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
          Full API reference with all endpoints, error codes, and SDKs is available at{' '}
          <code style={{ background: '#e0e7ff', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>docs.upay.dev</code>.
          For Xenpai-specific integration support, reach out to your account manager.
        </p>
      </div>
    </div>
  );
}
