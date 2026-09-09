# KLIKFIBER Website

Storefront dan portal operasional KLIKFIBER berdasarkan PRD/SRS/SDD v2 dan mockup desktop/mobile.

## Menjalankan lokal

```bash
npm install
npm run dev
```

Build produksi:

```bash
npm run build
```

## Cakupan

- Beranda, katalog, pencarian, filter, detail produk, wishlist, dan keranjang responsif.
- Checkout tiga tahap dengan validasi server, promo, reservasi stok, idempotensi, pembayaran simulasi, invoice, dan pelacakan pesanan.
- Akun pelanggan, alamat, RFQ/penawaran proyek, retur/garansi, portal staf, campaign, approval, stok, finance, dan audit.
- Penyimpanan Cloudflare D1 dan autentikasi sesi untuk lingkungan uji.

## Status lingkungan

Website masih dalam **mode uji**. Harga, stok, ongkir, pembayaran, refund, pengiriman, campaign, dan pesanan adalah simulasi. Integrasi live Xendit, provider pengiriman, Google OIDC/email OTP, kebijakan pajak, serta katalog final harus dikonfigurasi dan diterima melalui UAT sebelum transaksi nyata.

Data contoh produk bersumber dari halaman resmi [UCL Swift](https://uclswift.com/) dan katalog [Fabeal](https://fabeal.co.id/). Harga, stok, status distributor, dan garansi KLIKFIBER belum diverifikasi dari kedua sumber tersebut. Gambar studio berbantuan AI diperlakukan sebagai ilustrasi dan tidak mengubah brand/model produsen.

Kontak bisnis: [klikfiber@gmail.com](mailto:klikfiber@gmail.com)  
Office: Jalan Mayor Madmuin Hasibuan. 4B RT.003/024, Margahayu, Kec. Bekasi Tim., Kota Bks, Jawa Barat 17113.
