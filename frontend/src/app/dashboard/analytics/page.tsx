'use client';

import React from 'react';

export default function AnalyticsPage() {
  const code: React.CSSProperties = {
    background: '#0F172A', color: '#93C5FD', padding: 18, borderRadius: 12,
    fontSize: 12.5, lineHeight: 1.6, overflowX: 'auto' as const, marginTop: 8, display: 'block',
    fontFamily: 'monospace',
  };

  return (
    <div style={{ maxWidth: 780, color: '#0F172A', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 24 }}>Integration Guide</div>

      {[
        { title: '1. Create a payment session', content: `const crypto = require('crypto');

const API_KEY = 'upay_your_key';
const API_SECRET = 'sk_your_secret';
const BASE_URL = 'https://nova-pay.in';

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
// data.payment_id, data.qr_code_base64, data.upi_intent_link` },
        { title: '2. Display to customer', description: 'Show the QR code image and UPI deep link. Alternatively, redirect to the hosted payment page:', content: `<!-- Option A: Hosted page (simplest) -->
<a href="https://api.upay.dev/pay/{payment_id}">Pay Now</a>

<!-- Option B: Embed QR directly -->
<img src="data:image/png;base64,{qr_code_base64}" />
<a href="{upi_intent_link}">Open UPI App</a>` },
        { title: '3. Poll status or use webhooks', content: `// Poll every 4 seconds
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
};` },
        { title: '4. Verify webhook signature', content: `app.post('/webhooks/upay', (req, res) => {
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
});` },
      ].map(({ title, description, content }) => (
        <div key={title} style={{ background: '#FFFFFF', borderRadius: 14, padding: '24px 28px', border: '1px solid #E2E8F0', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: description ? 10 : 0 }}>{title}</div>
          {description && <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.7, margin: '0 0 12px' }}>{description}</p>}
          <pre style={code}>{content}</pre>
        </div>
      ))}

      <div style={{ background: '#EFF6FF', borderRadius: 14, padding: '20px 24px', border: '1px solid #DBEAFE' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#2563EB', marginBottom: 8 }}>Need help?</div>
        <p style={{ fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.6 }}>
          Full API reference with all endpoints, error codes, and SDKs is available at{' '}
          <code style={{ background: '#DBEAFE', padding: '2px 6px', borderRadius: 4, fontSize: 12, color: '#2563EB' }}>docs.upay.dev</code>.
          For Xenpai-specific integration support, reach out to your account manager.
        </p>
      </div>
    </div>
  );
}
