import type { Metadata } from 'next';
import './globals.css';
import './playful.css';
import './portals.css';
export const metadata: Metadata = {
  title: 'Klikfiber.id — Klik, sambung, beres!',
  description:
    'Perangkat, aksesori, dan solusi fiber optik untuk teknisi, ISP, dan proyek Anda.',
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
