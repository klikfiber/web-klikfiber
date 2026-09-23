import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isStoreRoute, publicPages } from '@/lib/store-routes';
import { products } from '@/lib/catalog';
type Props = { params: Promise<{path:string[]}> };
export async function generateMetadata({params}:Props): Promise<Metadata> {
 const route = '/' + (await params).path.join('/');
 const product = products.find(p => route === '/produk/' + p.id);
 const title = product?.name || publicPages[route] || 'Akun dan pesanan';
 return { title: `${title} | Klikfiber.id`, description:product?.description,
  alternates:{canonical:route}, robots:{index:!!product || route in publicPages,follow:true} };
}
export default async function Page({params}:Props) {
  const route = '/' + (await params).path.join('/');
  if (!isStoreRoute(route)) notFound();
  return null;
}
