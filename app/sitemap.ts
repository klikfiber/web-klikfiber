import type { MetadataRoute } from 'next';
import { publicPages } from '@/lib/store-routes';
import { products } from '@/lib/catalog';
export default function sitemap(): MetadataRoute.Sitemap {
 return [...Object.keys(publicPages),...products.map(p=>'/produk/'+p.id)].map(path=>({url:'https://klikfiber.id'+path}));
}
