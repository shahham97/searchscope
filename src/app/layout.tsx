import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';

export const metadata: Metadata = {
  metadataBase: new URL('https://searchscope.app'),
  title: {
    default: 'SearchScope — Website SEO, AEO & GEO Auditor',
    template: '%s | SearchScope',
  },
  description:
    'Production-grade SEO, AEO, and GEO website auditor. Zero accounts, zero paid API keys, and 100% private transient execution.',
  alternates: {
    canonical: './',
  },
  openGraph: {
    title: 'SearchScope — Website SEO, AEO & GEO Auditor',
    description:
      'Production-grade SEO, AEO, and GEO website auditor. Zero accounts, zero paid API keys, and 100% private transient execution.',
    url: 'https://searchscope.app',
    siteName: 'SearchScope',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://searchscope.app/og.png',
        width: 1200,
        height: 630,
        alt: 'SearchScope Search Intelligence Auditor',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SearchScope — Website SEO, AEO & GEO Auditor',
    description:
      'Production-grade SEO, AEO, and GEO website auditor. Zero accounts, zero paid API keys, and 100% private transient execution.',
    images: ['https://searchscope.app/og.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/icon.svg' }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'SearchScope',
    url: 'https://searchscope.app',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'All',
    description:
      'Production-grade website auditing application for Technical SEO, Structured Data, Answer Engine Optimization (AEO), and Generative Engine Optimization (GEO).',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
    },
  };

  return (
    <html lang="en" className="h-full">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased bg-jet-950 text-white min-h-screen flex flex-col font-sans selection:bg-neon selection:text-white">
        <SiteHeader />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
