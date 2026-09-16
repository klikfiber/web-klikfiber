# Integrasi Midtrans KLIKFIBER

## Variabel lingkungan

Salin nama variabel dari `.env.example` ke Hostinger:

```env
MIDTRANS_SERVER_KEY=...
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=...
MIDTRANS_MERCHANT_ID=...
MIDTRANS_IS_PRODUCTION=false
```

Gunakan pasangan Server Key dan Client Key dari lingkungan yang sama. Mulai dari Sandbox. Setelah seluruh skenario lolos, ganti dengan kunci Production dan ubah `MIDTRANS_IS_PRODUCTION=true`.

## URL notifikasi

Atur Payment Notification URL di dashboard Midtrans menjadi:

```text
https://klikfiber.id/api/v1/webhooks/midtrans
```

Endpoint tidak membutuhkan sesi pengguna. Endpoint memeriksa signature SHA-512, meminta verifikasi status ke Midtrans, mencocokkan jumlah pembayaran, lalu memperbarui transaksi secara atomik. Callback browser hanya memicu pembacaan ulang status; callback tidak pernah menandai pesanan lunas.

## Alur transaksi

1. Server membuat quote dari katalog, diskon referral, dan ongkir Biteship.
2. Server membuat pesanan dan mencadangkan stok serta kuota referral.
3. Halaman pembayaran meminta token Snap dengan hanya mengirim `orderId`.
4. Server menghitung ulang jumlah dari data pesanan, membuat upaya pembayaran unik, lalu meminta token ke Midtrans.
5. Pelanggan memilih kanal pembayaran di Snap.
6. Webhook Midtrans menjadi sumber kebenaran untuk status `paid`, `pending`, `failed`, `cancelled`, `expired`, atau refund.

Pembuatan upaya pembayaran bersifat idempoten. Satu pesanan hanya mempunyai satu upaya aktif. Setelah upaya gagal, dibatalkan, atau kedaluwarsa, pelanggan dapat membuat upaya baru tanpa membuat pesanan baru.

## Checklist Sandbox

- Pastikan `MIDTRANS_IS_PRODUCTION=false`.
- Buat pesanan dengan kode referral valid dan pastikan total Snap sama dengan total checkout.
- Uji settlement berhasil; status harus menjadi `paid` dan pesanan `confirmed`.
- Uji pending; stok dan diskon tetap dicadangkan.
- Uji deny, cancel, dan expire; tombol pembayaran ulang harus muncul.
- Kirim webhook yang sama dua kali; kuota referral tidak boleh terpakai dua kali.
- Uji nominal atau signature yang salah; endpoint harus menolak notifikasi.
- Pastikan pesanan lama tetap muncul sebagai provider `legacy`.

## Observabilitas

Log server hanya mencatat nomor pesanan provider, ID pembayaran internal, ID transaksi, dan status. Server Key, Client Key, token Snap, serta payload pelanggan tidak ditulis ke log.
