import './globals.css';

export const metadata = {
  title: 'UPay Gateway — Merchant Dashboard',
  description: 'Accept UPI payments directly to your own UPI IDs',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
