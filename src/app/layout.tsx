import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';

export const metadata: Metadata = {
  title: 'SearchScope — Professional Website SEO, AEO & GEO Intelligence Auditor',
  description:
    'Calm, production-grade website auditing application for Technical SEO, Structured Data, AEO, GEO, and Information Architecture. 100% private with zero data persistence.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen flex flex-col font-sans selection:bg-slate-200">
        <SiteHeader />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
