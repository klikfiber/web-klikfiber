import type { Metadata } from 'next';
import { Suspense } from 'react';
import Store from '@/components/store';
import StoreBoundary from '@/components/store-boundary';
import './globals.css';
import './playful.css';
import './portals.css';
import './shopping.css';
import './storefront-refresh.css';
export const metadata: Metadata = {
  title: 'Klikfiber.id — Klik, sambung, beres!',
  description:
    'Perangkat, aksesori, dan solusi fiber optik untuk teknisi, ISP, dan proyek Anda.',
  metadataBase: new URL('https://klikfiber.id'),
  icons:{icon:'/favicon.svg'},
  openGraph:{siteName:'Klikfiber.id',locale:'id_ID',type:'website',title:'Klikfiber.id — Perangkat fiber optik',description:'Temukan splicer dan perlengkapan fiber optik dengan harga jelas dan pengiriman ke seluruh Indonesia.'},
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <Suspense>
          <StoreBoundary><Store /></StoreBoundary>
        </Suspense>
        {children}
      </body>
    </html>
  );
}
