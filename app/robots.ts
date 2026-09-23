import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
 return { rules:{userAgent:'*',allow:'/',disallow:['/api/','/myshop','/admin','/marketing','/akun','/checkout','/keranjang','/pembayaran/']},sitemap:'https://klikfiber.id/sitemap.xml' };
}
