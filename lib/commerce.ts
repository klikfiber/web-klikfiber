import { products, shipping, type CartItem } from './catalog';
import { selectedRegion } from './regions';
export class BusinessError extends Error {
  constructor(
    message: string,
    public status = 422,
  ) {
    super(message);
  }
}
export function validAddress(a: any) {
  if (
    !a ||
    typeof a.name !== 'string' ||
    a.name.trim().length < 2 ||
    a.name.length > 100
  )
    throw new BusinessError('Nama penerima harus 2–100 karakter.');
  if (!/^(\+62|62|0)[0-9]{8,13}$/.test(a.phone || ''))
    throw new BusinessError('Nomor telepon Indonesia tidak valid.');
  if (
    typeof a.street !== 'string' ||
    a.street.trim().length < 10 ||
    a.street.length > 250
  )
    throw new BusinessError('Alamat lengkap harus 10–250 karakter.');
  const region = selectedRegion(String(a.villageId || ''));
  if (!region) throw new BusinessError('Pilih provinsi, kota/kabupaten, kecamatan, dan kelurahan/desa tujuan.');
  for (const field of ['provinceId', 'cityId', 'districtId', 'postal'] as const) {
    if (a[field] !== region[field]) throw new BusinessError('Wilayah dan kode pos tidak sesuai. Pilih ulang alamat tujuan.');
  }
  return {
    name: a.name.trim(),
    phone: a.phone.replace(/^0/, '+62').replace(/^62/, '+62'),
    street: a.street.trim(),
    ...region,
    landmark: String(a.landmark || '').trim().slice(0, 150),
  };
}
export function priceCart(
  items: CartItem[],
  shippingId: string,
  campaign?: any,
  catalog = products,
) {
  if (!Array.isArray(items) || !items.length || items.length > 100)
    throw new BusinessError('Keranjang kosong atau tidak valid.');
  const seen = new Set();
  const snapshot = items.map((item) => {
    const p = catalog.find((p) => p.id === item.id);
    if (!p || p.quote || !p.stock || p.price <= 0)
      throw new BusinessError(
        'Produk tidak dapat dibeli langsung. Gunakan penawaran proyek.',
      );
    if (
      !Number.isInteger(item.qty) ||
      item.qty < 1 ||
      item.qty > 99 ||
      item.qty > p.stock ||
      seen.has(item.id)
    )
      throw new BusinessError(
        'Jumlah produk harus 1–99 dan SKU tidak boleh duplikat.',
      );
    seen.add(item.id);
    return {
      id: p.id,
      name: p.name,
      model: p.model,
      qty: item.qty,
      price: p.price,
    };
  });
  const method = shipping.find((x) => x.id === shippingId);
  if (!method) throw new BusinessError('Pilih layanan pengiriman yang valid.');
  const subtotal = snapshot.reduce((n, p) => n + p.price * p.qty, 0);
  let discount = 0;
  if (campaign) {
    if (campaign.status !== 'active')
      throw new BusinessError('Kode promo tidak aktif.');
    if (subtotal < campaign.minSubtotal)
      throw new BusinessError('Minimum belanja promo adalah Rp100.000.');
    discount = Math.min(
      Math.floor((subtotal * campaign.percent) / 100),
      campaign.cap,
      subtotal,
    );
    if (
      campaign.used + campaign.reserved + discount > campaign.budget ||
      campaign.countUsed + campaign.countReserved >= campaign.quota
    )
      throw new BusinessError('Budget atau kuota promo habis.', 409);
  }
  return {
    items: snapshot,
    subtotal,
    discount,
    shipping: method.id,
    shippingCost: method.cost,
    tax: 0,
    total: subtotal - discount + method.cost,
  };
}
