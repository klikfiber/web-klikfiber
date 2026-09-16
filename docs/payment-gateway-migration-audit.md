# Audit migrasi payment gateway

Tanggal audit: 16 September 2026.

## Temuan

- Aplikasi memakai Next.js App Router, PostgreSQL, dan library `postgres` secara langsung. Tidak ada Prisma atau MySQL pada kode aktif.
- Checkout menghitung ulang harga produk, diskon referral, dan ongkir di server.
- Sebelum migrasi ini tidak ditemukan SDK, endpoint, webhook, atau variabel lingkungan Xendit yang aktif. Halaman pembayaran masih berupa placeholder.
- Pesanan disimpan pada tabel `records` sebagai JSON. Persediaan dan kuota referral dicadangkan saat pesanan dibuat.
- Tidak ada data pembayaran historis yang dihapus. Pesanan lama tanpa `paymentProvider` tetap ditampilkan sebagai `legacy` di dashboard admin.

## Perubahan

- Menambahkan tabel umum `payments` dengan kolom provider, ID pesanan provider, ID transaksi, tipe pembayaran, status, jumlah, token Snap, waktu bayar, dan respons provider.
- Menambahkan Midtrans Snap untuk transaksi baru.
- Menambahkan webhook tervalidasi dengan verifikasi signature dan verifikasi status server-to-server melalui SDK resmi Midtrans.
- Menambahkan pemetaan status terpusat dan pembaruan pesanan yang idempoten.
- Menambahkan riwayat provider, tipe pembayaran, dan waktu pembayaran pada area pelanggan dan admin.

## Batas audit

Uji transaksi Sandbox/Production membutuhkan Server Key dan Client Key milik akun Midtrans KLIKFIBER. Kunci tidak disimpan di repositori.
