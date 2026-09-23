import { products } from './catalog';
export const publicPages: Record<string,string> = {
 '/':'Splicer dan perlengkapan fiber optik', '/produk':'Produk fiber optik',
 '/promo':'Promo pilihan', '/solusi':'Solusi jaringan', '/tentang':'Tentang Klikfiber',
 '/dukungan':'Hubungi kami', '/pengiriman':'Informasi pengiriman', '/garansi':'Garansi dan retur',
 '/syarat':'Syarat dan ketentuan', '/privasi':'Kebijakan privasi', '/penawaran':'Penawaran proyek',
};
export function isStoreRoute(path: string) {
 return path in publicPages || ['/myshop','/admin','/marketing','/sales','/keranjang','/checkout'].includes(path)
  || /^\/akun(?:\/(ringkasan|pesanan|alamat|wishlist|penawaran|profil))?$/.test(path)
  || /^\/akun\/pesanan\/[^/]+$/.test(path)
  || /^\/pembayaran\/[^/]+$/.test(path)
  || products.some(p => path === '/produk/' + p.id);
}
