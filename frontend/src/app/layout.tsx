import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
// import { Providers } from '@/components/providers/Providers'; // TEMPORARILY DISABLED

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ExpenseFlow Pro - Modern Expense Management',
  description: 'Complete expense management solution for Polish businesses with OCR, approval workflows, and analytics.',
  keywords: 'expense management, OCR, Poland, business, accounting, invoices, receipts',
  authors: [{ name: 'ExpenseFlow Team' }],
  creator: 'ExpenseFlow Pro',
  publisher: 'ExpenseFlow Pro',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000'),
  openGraph: {
    title: 'ExpenseFlow Pro - Modern Expense Management',
    description: 'Complete expense management solution for Polish businesses',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000',
    siteName: 'ExpenseFlow Pro',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ExpenseFlow Pro',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ExpenseFlow Pro - Modern Expense Management',
    description: 'Complete expense management solution for Polish businesses',
    images: ['/og-image.png'],
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
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ExpenseFlow Pro',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ExpenseFlow Pro" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#0ea5e9" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* DNS prefetch for external domains */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
      </head>
      <body className={`${inter.className} antialiased`}>
        {/* TEMPORARILY REMOVED PROVIDERS TO TEST BASIC FUNCTIONALITY */}
        {/* <Providers> */}
          {children}
        {/* </Providers> */}
      </body>
    </html>
  );
} 