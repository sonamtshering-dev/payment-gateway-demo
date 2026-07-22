# NovaPay Node.js SDK

Zero-dependency Node.js client for the NovaPay Payment Gateway. Node 18+.

## Install
Copy `novapay.js` into your project.

## Quick start
```js
const NovaPay = require('./novapay');
const novapay = new NovaPay(process.env.NOVAPAY_API_KEY, process.env.NOVAPAY_API_SECRET);

// Create a payment (amount in paise: ₹499.00 => 49900)
const payment = await novapay.createPayment({
  order_id: 'ORD-1001',
  amount: 49900,
  currency: 'INR',
  redirect_url: 'https://yourstore.com/thank-you',
});
res.redirect(novapay.checkoutUrl(payment.payment_id));
```

## Webhook verification (Express)
```js
app.post('/webhooks/novapay', express.raw({ type: '*/*' }), (req, res) => {
  const event = novapay.parseWebhook(
    req.body.toString(),
    req.headers['x-webhook-signature'],
    process.env.NOVAPAY_WEBHOOK_SECRET
  );
  if (!event) return res.status(401).end();
  if (event.status === 'paid') {
    // mark order paid — event.order_id, event.utr
  }
  res.status(200).end();
});
```
