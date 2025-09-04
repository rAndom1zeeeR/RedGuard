import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RedGuard Server Management',
  description: 'Управление VPN и Proxy серверами с горизонтальным масштабированием',
  keywords: ['VPN', 'Proxy', 'Load Balancer', 'Server Management'],
  authors: [{ name: 'VPN Proxy Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'noindex, nofollow',
  openGraph: {
    title: 'RedGuard Server Management',
    description: 'Управление VPN и Proxy серверами с горизонтальным масштабированием',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <div id="root">
          {children}
        </div>
      </body>
    </html>
  );
}
