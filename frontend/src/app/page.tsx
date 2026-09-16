import type { Metadata } from 'next';
import Script from 'next/script';
import LandingPageClient from './landing-page-client';

export const metadata: Metadata = {
  title: 'NovaPay — Free UPI Payment Gateway India | 0% Transaction Fee',
  description: 'Accept UPI payments online with 0% transaction fees. Money goes directly to your bank account — no intermediary, no holding period. Payment links, QR codes, API & WooCommerce plugin. Free to start.',
  keywords: 'UPI payment gateway India, free payment gateway India, accept UPI payments online, zero fee payment gateway, UPI QR code generator, payment link India, merchant payment gateway, WooCommerce UPI plugin, instant UPI settlement, payment gateway for freelancers India, payment gateway for small business, UPI payment API, direct UPI collection',
  authors: [{ name: 'NovaPay Technologies' }],
  creator: 'NovaPay',
  publisher: 'NovaPay Technologies Pvt. Ltd.',
  alternates: {
    canonical: 'https://nova-pay.in',
  },
  openGraph: {
    title: 'NovaPay — Accept UPI Payments. Keep Every Rupee.',
    description: 'Zero-fee UPI payment gateway for Indian merchants. Money goes directly to your bank account — no intermediary, no transaction charges, instant settlement in under 2 seconds.',
    url: 'https://nova-pay.in',
    siteName: 'NovaPay',
    images: [
      {
        url: 'https://nova-pay.in/novapaylogo.jpeg',
        width: 400,
        height: 400,
        alt: 'NovaPay — Free UPI Payment Gateway India',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NovaPay — Free UPI Payment Gateway | 0% Fees',
    description: 'Accept UPI payments online. Money lands directly in your bank account in under 2 seconds — zero transaction fees, instant settlement.',
    images: ['https://nova-pay.in/novapaylogo.jpeg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://nova-pay.in/#organization',
      name: 'NovaPay',
      alternateName: 'NovaPay Technologies',
      url: 'https://nova-pay.in',
      logo: {
        '@type': 'ImageObject',
        url: 'https://nova-pay.in/novapaylogo.jpeg',
        caption: 'NovaPay — UPI Payment Gateway India',
      },
      description: "India's zero-fee UPI payment gateway. Accept UPI payments online with direct settlement to your bank account — no transaction fees, no intermediary.",
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'support@novapay.in',
        contactType: 'customer support',
        availableLanguage: ['English', 'Hindi'],
        areaServed: 'IN',
      },
      areaServed: {
        '@type': 'Country',
        name: 'India',
      },
      foundingDate: '2024',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://nova-pay.in/#website',
      name: 'NovaPay',
      url: 'https://nova-pay.in',
      publisher: { '@id': 'https://nova-pay.in/#organization' },
      inLanguage: 'en-IN',
    },
    {
      '@type': 'WebPage',
      '@id': 'https://nova-pay.in/#webpage',
      url: 'https://nova-pay.in',
      name: 'NovaPay — Free UPI Payment Gateway India | 0% Transaction Fee',
      isPartOf: { '@id': 'https://nova-pay.in/#website' },
      about: { '@id': 'https://nova-pay.in/#organization' },
      description: 'Accept UPI payments online with zero transaction fees. Direct settlement to your bank account in under 2 seconds.',
      inLanguage: 'en-IN',
    },
    {
      '@type': 'SoftwareApplication',
      name: 'NovaPay Payment Gateway',
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Payment Gateway',
      operatingSystem: 'Web, Android, iOS',
      description: 'UPI payment gateway for Indian merchants — generate payment links and QR codes connected directly to your UPI ID. Zero transaction fees, instant settlement.',
      url: 'https://nova-pay.in',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'INR',
        description: 'Free plan — no transaction fees on any plan',
        availability: 'https://schema.org/InStock',
      },
      featureList: [
        'UPI payment links',
        'QR code generator',
        'REST API',
        'WooCommerce plugin',
        'PHP SDK',
        'Node.js SDK',
        'Telegram payment alerts',
        'AI assistant',
        'Team management',
        'Real-time analytics',
        'White-label branding',
        'USDT crypto payments',
      ],
      screenshot: 'https://nova-pay.in/novapaylogo.jpeg',
      softwareVersion: '2.0',
      datePublished: '2024-01-01',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Does NovaPay hold my payments?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No — never. When a customer pays via UPI, funds go directly from their bank to your UPI-linked bank account. NovaPay generates the payment link or QR code connected to your UPI ID; the money never passes through us or any intermediary.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is NovaPay?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'NovaPay is a free UPI payment gateway for Indian merchants, freelancers, and businesses. It lets you accept UPI payments online via shareable payment links, QR codes, and a developer API — with zero transaction fees and instant direct settlement to your bank account.',
          },
        },
        {
          '@type': 'Question',
          name: 'Are there any transaction fees?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. NovaPay charges 0% per transaction — on every plan, forever. There are no per-transaction cuts, no setup fees, no annual charges, and no hidden costs. Optional subscription plans unlock higher usage limits and premium features.',
          },
        },
        {
          '@type': 'Question',
          name: 'How fast does money reach my bank account?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Instantly — usually under 2 seconds. Since payments route directly from your customer\'s bank to your UPI ID, settlement is real-time. There is no waiting period, no next-day transfer, no holding period.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I integrate NovaPay into my website?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. NovaPay provides a REST API, a Node.js/JavaScript SDK, a PHP SDK, and an official WooCommerce plugin. Integration typically takes under 30 minutes. Full developer documentation is available inside the dashboard after signup.',
          },
        },
        {
          '@type': 'Question',
          name: 'Who can use NovaPay?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Any individual, freelancer, small business, or enterprise in India with a valid UPI ID. Complete a quick KYC, add your UPI ID, and start accepting UPI payments online the same day — no paperwork, no waiting.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is there a free plan?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. The Starter plan is completely free — includes 100 QR codes per billing period, 5 payment links, and 500 API calls per day. No credit card required. Upgrade to Pro for unlimited usage, AI insights, team management, and white-label branding.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is NovaPay secure?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. NovaPay uses AES-256 encryption for all data, requires KYC verification for every merchant account, supports IP whitelisting, webhook signature validation, and AI-powered fraud detection. Customer payment data is processed entirely by UPI infrastructure.',
          },
        },
      ],
    },
  ],
};

export default function Page() {
  return (
    <>
      <Script
        id="jsonld-novapay"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        strategy="beforeInteractive"
      />
      <LandingPageClient />
    </>
  );
}
