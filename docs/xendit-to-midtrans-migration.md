# Catatan migrasi Xendit ke Midtrans

## Strategi data

Migrasi ini tidak mengubah atau menghapus pesanan historis. Karena implementasi Xendit aktif tidak ditemukan di repositori, tidak ada tabel Xendit yang perlu dipindahkan. Kolom tampilan menggunakan nilai `legacy` untuk pesanan lama yang belum memiliki provider.

Transaksi baru ditulis ke tabel `payments`. Desain tabel tidak mengikat aplikasi ke satu gateway sehingga provider lain tetap dapat disimpan di masa depan.

## Urutan rilis

1. Cadangkan database PostgreSQL.
2. Deploy kode aplikasi. Tabel dan indeks `payments` dibuat secara idempoten saat API pertama kali berjalan.
3. Tambahkan kunci Midtrans Sandbox di Hostinger.
4. Atur Notification URL Midtrans.
5. Jalankan checklist Sandbox pada `docs/midtrans-integration.md`.
6. Setelah lolos, masukkan kunci Production dan aktifkan mode production.
7. Pantau webhook, pesanan pending, nominal, stok, dan pemakaian referral.

Checkout menolak membuat pesanan baru bila konfigurasi Midtrans belum tersedia. Ini mencegah reservasi stok tanpa jalur pembayaran.
