# NovaPay PHP SDK

Zero-dependency PHP client for the NovaPay Payment Gateway.

## Requirements
- PHP 8.0+ with cURL

## Install
Copy `NovaPay.php` into your project and `require` it.

## Quick start
```php
require 'NovaPay.php';
$novapay = new NovaPay('YOUR_API_KEY', 'YOUR_API_SECRET');

// Create a payment (amount in paise: ₹499.00 => 49900)
$payment = $novapay->createPayment([
    'order_id' => 'ORD-1001',
    'amount'   => 49900,
    'currency' => 'INR',
    'redirect_url' => 'https://yourstore.com/thank-you',
]);
header('Location: ' . $novapay->checkoutUrl($payment['payment_id']));
```

## Webhook verification
```php
$event = $novapay->parseWebhook(
    file_get_contents('php://input'),
    $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '',
    'YOUR_WEBHOOK_SECRET'
);
if ($event !== null && $event['status'] === 'paid') {
    // mark order paid — $event['order_id'], $event['utr']
}
```

Get your API key, secret, and webhook secret from the NovaPay dashboard → API & Webhooks.
