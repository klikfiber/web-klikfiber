import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'KLIKFIBER — Klik kebutuhan fiber, beres.',
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
