# Rollback payment gateway

## Rollback aplikasi

1. Nonaktifkan checkout sementara dari deployment sebelumnya bila terjadi gangguan provider.
2. Kembalikan deployment aplikasi ke commit sebelum aktivasi Midtrans.
3. Jangan hapus tabel `payments`; tabel ini diperlukan untuk audit dan rekonsiliasi transaksi yang sudah dibuat.
4. Biarkan endpoint webhook aktif sampai semua transaksi Midtrans yang masih pending mencapai status terminal, atau verifikasi statusnya manual di dashboard Midtrans.

## Pemulihan

1. Perbaiki konfigurasi atau kode pada lingkungan Sandbox.
2. Cocokkan `provider_order_id`, `provider_transaction_id`, jumlah, dan status dengan dashboard Midtrans.
3. Deploy perbaikan, aktifkan Notification URL, lalu kirim ulang notifikasi dari dashboard Midtrans jika diperlukan.
4. Uji satu transaksi kecil sebelum membuka checkout secara penuh.

Jangan mengubah status menjadi lunas dari browser atau query manual tanpa bukti settlement dari Midtrans.
