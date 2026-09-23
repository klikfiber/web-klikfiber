import Link from 'next/link';
export default function NotFound() {
 return <main className="container page"><p className="kicker">404</p><h1>Halaman tidak ditemukan</h1><p>Alamat halaman mungkin sudah berubah. Temukan kebutuhan fiber Anda di katalog.</p><Link className="btn" href="/produk">Lihat produk</Link> <Link href="/">Kembali ke beranda</Link></main>;
}
