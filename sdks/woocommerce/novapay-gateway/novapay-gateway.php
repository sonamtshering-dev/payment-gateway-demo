<?php
/**
 * Plugin Name: NovaPay Payment Gateway
 * Plugin URI:  https://nova-pay.in
 * Description: Accept UPI and USDT payments on WooCommerce via NovaPay. Customers pay on NovaPay's hosted checkout; orders auto-complete through signed webhooks.
 * Version:     1.0.0
 * Author:      NovaPay
 * Author URI:  https://nova-pay.in
 * License:     GPL-2.0+
 * Text Domain: novapay-gateway
 *
 * WC requires at least: 6.0
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('plugins_loaded', 'novapay_gateway_init', 11);

function novapay_gateway_init()
{
    if (!class_exists('WC_Payment_Gateway')) {
        return; // WooCommerce not active
    }

    class WC_Gateway_NovaPay extends WC_Payment_Gateway
    {
        private string $api_key;
        private string $api_secret;
        private string $webhook_secret;
        private string $base_url;

        public function __construct()
        {
            $this->id                 = 'novapay';
            $this->method_title       = 'NovaPay';
            $this->method_description = 'UPI + USDT payments via the NovaPay hosted checkout. '
                . 'Set your webhook URL in the NovaPay dashboard to: '
                . '<code>' . esc_html(home_url('/wc-api/novapay')) . '</code>';
            $this->has_fields         = false;

            $this->init_form_fields();
            $this->init_settings();

            $this->title          = $this->get_option('title');
            $this->description    = $this->get_option('description');
            $this->api_key        = $this->get_option('api_key');
            $this->api_secret     = $this->get_option('api_secret');
            $this->webhook_secret = $this->get_option('webhook_secret');
            $this->base_url       = rtrim($this->get_option('base_url', 'https://nova-pay.in'), '/');

            add_action('woocommerce_update_options_payment_gateways_' . $this->id, [$this, 'process_admin_options']);
            add_action('woocommerce_api_novapay', [$this, 'handle_webhook']);
        }

        public function init_form_fields()
        {
            $this->form_fields = [
                'enabled' => [
                    'title'   => 'Enable/Disable',
                    'type'    => 'checkbox',
                    'label'   => 'Enable NovaPay',
                    'default' => 'yes',
                ],
                'title' => [
                    'title'   => 'Title',
                    'type'    => 'text',
                    'default' => 'UPI / USDT (NovaPay)',
                ],
                'description' => [
                    'title'   => 'Description',
                    'type'    => 'textarea',
                    'default' => 'Pay securely via UPI or USDT. You will be redirected to complete the payment.',
                ],
                'api_key' => [
                    'title' => 'API Key',
                    'type'  => 'text',
                    'desc_tip' => 'From your NovaPay dashboard → API & Webhooks.',
                ],
                'api_secret' => [
                    'title' => 'API Secret',
                    'type'  => 'password',
                ],
                'webhook_secret' => [
                    'title' => 'Webhook Secret',
                    'type'  => 'password',
                    'desc_tip' => 'Used to verify incoming payment webhooks.',
                ],
                'base_url' => [
                    'title'   => 'Gateway URL',
                    'type'    => 'text',
                    'default' => 'https://nova-pay.in',
                ],
            ];
        }

        /** Create the NovaPay payment and redirect the customer to checkout. */
        public function process_payment($order_id)
        {
            $order = wc_get_order($order_id);
            $amount_paise = (int) round($order->get_total() * 100);
            $np_order_id  = 'WC-' . $order_id . '-' . substr((string) time(), -6);

            $payload = [
                'order_id'           => $np_order_id,
                'amount'             => $amount_paise,
                'currency'           => 'INR',
                'customer_reference' => 'Order #' . $order->get_order_number() . ' — ' . get_bloginfo('name'),
                'redirect_url'       => $this->get_return_url($order),
            ];

            $result = $this->novapay_request('POST', '/api/v1/payments/create', $payload);
            if (is_wp_error($result)) {
                wc_add_notice('Payment error: ' . $result->get_error_message(), 'error');
                return ['result' => 'failure'];
            }

            $order->update_meta_data('_novapay_payment_id', $result['payment_id']);
            $order->update_meta_data('_novapay_order_id', $np_order_id);
            $order->update_status('pending', 'Awaiting NovaPay payment.');
            $order->save();

            return [
                'result'   => 'success',
                'redirect' => $this->base_url . '/pay/' . $result['payment_id'],
            ];
        }

        /** Signed webhook receiver: /wc-api/novapay */
        public function handle_webhook()
        {
            $raw       = file_get_contents('php://input');
            $signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '';
            $expected  = hash_hmac('sha256', $raw, $this->webhook_secret);

            if (!hash_equals($expected, $signature)) {
                status_header(401);
                exit('invalid signature');
            }

            $event = json_decode($raw, true);
            if (!is_array($event) || ($event['status'] ?? '') !== 'paid') {
                status_header(200);
                exit('ignored');
            }

            // Locate the order by our stored NovaPay order id.
            $orders = wc_get_orders([
                'limit'      => 1,
                'meta_key'   => '_novapay_order_id',
                'meta_value' => $event['order_id'] ?? '',
            ]);
            if (empty($orders)) {
                status_header(200);
                exit('order not found');
            }

            $order = $orders[0];
            if (!$order->is_paid()) {
                $order->payment_complete($event['utr'] ?? '');
                $order->add_order_note(sprintf(
                    'NovaPay payment confirmed. UTR/Ref: %s',
                    $event['utr'] ?? 'n/a'
                ));
            }
            status_header(200);
            exit('ok');
        }

        /** Minimal signed client (HMAC-SHA256 over "timestamp.body"). */
        private function novapay_request(string $method, string $path, array $body)
        {
            $timestamp = (string) time();
            $payload   = wp_json_encode($body);
            $signature = hash_hmac('sha256', $timestamp . '.' . $payload, $this->api_secret);

            $response = wp_remote_request($this->base_url . $path, [
                'method'  => $method,
                'timeout' => 30,
                'headers' => [
                    'Content-Type' => 'application/json',
                    'X-API-KEY'    => $this->api_key,
                    'X-TIMESTAMP'  => $timestamp,
                    'X-SIGNATURE'  => $signature,
                ],
                'body'    => $payload,
            ]);

            if (is_wp_error($response)) {
                return $response;
            }
            $data = json_decode(wp_remote_retrieve_body($response), true);
            if (!is_array($data) || ($data['success'] ?? false) !== true) {
                return new WP_Error('novapay', $data['error'] ?? 'Gateway error');
            }
            return $data['data'];
        }
    }

    add_filter('woocommerce_payment_gateways', function ($gateways) {
        $gateways[] = 'WC_Gateway_NovaPay';
        return $gateways;
    });
}
