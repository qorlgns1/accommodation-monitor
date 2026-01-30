import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { GoogleAnalytics } from '@/components/analytics';
import { Providers } from '@/components/providers';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '숙소 모니터링 - Accommodation Monitor',
  description: 'Airbnb, Agoda 숙소 예약 가능 여부를 모니터링하고 알림을 받으세요',
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: {
      'naver-site-verification': [process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION || ''],
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='ko'>
      <body className={inter.className}>
        <GoogleAnalytics />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
