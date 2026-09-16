import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'NovaPay — Free UPI Payment Gateway India | 0% Transaction Fee',
    template: '%s | NovaPay',
  },
  description: 'Accept UPI payments online with 0% transaction fees. Money goes directly to your bank account — no intermediary, no holding period. Payment links, QR codes, API & WooCommerce plugin.',
  keywords: 'UPI payment gateway India, free payment gateway, accept UPI payments online, zero fee payment gateway, UPI QR code, payment link India, merchant payment gateway, WooCommerce UPI, instant UPI settlement',
  metadataBase: new URL('https://nova-pay.in'),
  alternates: { canonical: '/' },
  openGraph: {
    title: 'NovaPay — Accept UPI Payments. Keep Every Rupee.',
    description: "India's zero-fee UPI payment gateway. Direct settlement to your bank account in under 2 seconds — no transaction fees, no intermediary.",
    siteName: 'NovaPay',
    locale: 'en_IN',
    type: 'website',
    images: [{ url: '/novapaylogo.jpeg', width: 400, height: 400, alt: 'NovaPay' }],
  },
  twitter: {
    card: 'summary',
    title: 'NovaPay — Free UPI Payment Gateway India',
    description: 'Accept UPI payments with 0% fees. Direct to your bank in under 2 seconds.',
  },
  icons: {
    icon: '/novapaylogo.jpeg',
    apple: '/novapaylogo.jpeg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}