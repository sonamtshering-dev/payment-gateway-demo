# NovaPay WooCommerce Plugin

Accept UPI + USDT on any WooCommerce store via NovaPay's hosted checkout.

## Install
1. Zip the `novapay-gateway` folder (or use the downloaded zip as-is).
2. WordPress admin → Plugins → Add New → Upload Plugin → upload the zip → Activate.
3. WooCommerce → Settings → Payments → NovaPay → enter your **API Key**,
   **API Secret**, and **Webhook Secret** from the NovaPay dashboard.
4. In the NovaPay dashboard → API & Webhooks, set your webhook URL to:
   `https://YOUR-SITE.com/wc-api/novapay`

## How it works
- At checkout the plugin creates a NovaPay payment and redirects the customer
  to the hosted payment page (UPI QR / apps, and USDT if you enabled it).
- When the payment completes, NovaPay calls your webhook with an HMAC-signed
  payload; the plugin verifies the signature and marks the order paid.
