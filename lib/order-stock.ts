import { products } from './catalog';
import { BusinessError } from './commerce';
type Item = {id:string;qty:number;price:number};
// Caller holds the order/quote lock and commits inventory with the order.
export async function reserveOrderStock(tx:any,items:Item[]) {
 for (const item of [...items].sort((a,b)=>a.id.localeCompare(b.id))) {
  const fallback=products.find(p=>p.id===item.id);
  if(!fallback || !Number.isSafeInteger(item.qty) || item.qty<1) throw new BusinessError('Produk tidak valid.',409);
  await tx`INSERT INTO portal_products(id,data) VALUES(${item.id},${JSON.stringify({stock:fallback.stock,price:fallback.price,quote:fallback.quote||false})}::jsonb) ON CONFLICT(id) DO NOTHING`;
  const [row]=await tx`SELECT data FROM portal_products WHERE id=${item.id} FOR UPDATE`;
  const current={...fallback,...row.data};
  if(current.quote || current.price!==item.price || !Number.isSafeInteger(current.stock) || current.stock<item.qty)
   throw new BusinessError('Harga atau stok berubah. Periksa kembali pesanan sebelum membayar.',409);
  await tx`UPDATE portal_products SET data=jsonb_set(data,'{stock}',to_jsonb(${current.stock-item.qty}::int)) WHERE id=${item.id}`;
 }
}
export async function restoreOrderStock(tx:any,items:Item[]) {
 for(const item of [...items].sort((a,b)=>a.id.localeCompare(b.id)))
  await tx`UPDATE portal_products SET data=jsonb_set(data,'{stock}',to_jsonb((data->>'stock')::int + ${item.qty}::int)) WHERE id=${item.id}`;
}
