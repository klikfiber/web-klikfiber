import 'server-only';
import postgres from 'postgres';
import sharp from 'sharp';
type PhotoPipeline = {
  rotate(): PhotoPipeline;
  resize(
    width: number,
    height: number,
    options: { fit: string; withoutEnlargement?: boolean },
  ): PhotoPipeline;
  webp(options: { quality: number }): PhotoPipeline;
  toBuffer(): Promise<Buffer>;
};
const photoProcessor = sharp as (
  input: Buffer,
  options: { limitInputPixels: number },
) => PhotoPipeline;
import { cookies } from 'next/headers';
import {
  randomBytes,
  createHash,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { products as defaults, type Product, categories } from './catalog';
import { authServer } from './auth/server';
import { BusinessError } from './commerce';

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: 'require',
  max: 3,
  prepare: false,
});
const ADMIN = 'klikfiber@gmail.com';
const COOKIE = 'klikfiber-admin';
let initialized: Promise<unknown> | undefined;
async function nextSalesCode(tx: any) {
  for (let attempt = 0; attempt < 10000; attempt++) {
    const [row] = await tx`SELECT nextval('portal_sales_code_seq') AS number`;
    const code = 'KLIK' + String(row.number).padStart(2, '0');
    const collision = await tx`SELECT code FROM portal_sales WHERE code=${code} OR legacy_code=${code} UNION SELECT code FROM portal_promos WHERE code=${code}`;
    if (!collision.length) return code;
  }
  throw new BusinessError('Kode sales belum dapat dibuat. Coba lagi.');
}
export async function initPortal() {
  initialized ||= (async () => {
    try {
      const [ready] = await sql`SELECT 1 FROM portal_settings WHERE id='sales-codes-klik-2026-09-21'`;
      if (ready) return;
    } catch {
      // Fresh installations continue into the schema bootstrap below.
    }
    await sql.begin(async (tx: any) => {
      await tx`CREATE TABLE IF NOT EXISTS portal_admin (email TEXT PRIMARY KEY, password_hash TEXT NOT NULL)`;
      await tx`CREATE TABLE IF NOT EXISTS portal_sessions (token_hash TEXT PRIMARY KEY, expires_at TIMESTAMPTZ NOT NULL)`;
      await tx`CREATE TABLE IF NOT EXISTS portal_login_attempts (key TEXT PRIMARY KEY, attempts INT NOT NULL DEFAULT 0, started_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
      await tx`CREATE TABLE IF NOT EXISTS portal_products (id TEXT PRIMARY KEY, data JSONB NOT NULL)`;
      await tx`CREATE TABLE IF NOT EXISTS portal_sales (id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', code TEXT UNIQUE, discount INT NOT NULL DEFAULT 0, max_discount INT NOT NULL DEFAULT 5, cap INT NOT NULL DEFAULT 300000, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), approved_at TIMESTAMPTZ)`;
      await tx`CREATE TABLE IF NOT EXISTS portal_promos (code TEXT PRIMARY KEY, name TEXT NOT NULL, percent INT NOT NULL, cap INT NOT NULL, active BOOLEAN NOT NULL DEFAULT true)`;
      await tx`CREATE TABLE IF NOT EXISTS portal_banners (id TEXT PRIMARY KEY, title TEXT NOT NULL, accent TEXT NOT NULL, subtitle TEXT NOT NULL, cta TEXT NOT NULL, href TEXT NOT NULL, desktop_image TEXT NOT NULL, mobile_image TEXT NOT NULL, sort_order INT NOT NULL DEFAULT 0, active BOOLEAN NOT NULL DEFAULT true)`;
      await tx`CREATE TABLE IF NOT EXISTS portal_settings (id TEXT PRIMARY KEY, data JSONB NOT NULL)`;
      const [legacyColumn] = await tx`SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='portal_sales' AND column_name='legacy_code'`;
      if (!legacyColumn) await tx`ALTER TABLE portal_sales ADD COLUMN legacy_code TEXT`;
      await tx`CREATE SEQUENCE IF NOT EXISTS portal_sales_code_seq`;
      const codeRevision = await tx`INSERT INTO portal_settings(id,data) VALUES('sales-codes-klik-2026-09-21','{"applied":true}') ON CONFLICT(id) DO NOTHING RETURNING id`;
      if (codeRevision.length) {
        const existingSales = await tx`SELECT id,code FROM portal_sales WHERE code IS NOT NULL AND code !~ '^KLIK[0-9]+$' ORDER BY created_at,id`;
        for (const sale of existingSales) {
          const code = await nextSalesCode(tx);
          await tx`UPDATE portal_sales SET legacy_code=code,code=${code} WHERE id=${sale.id}`;
        }
      }
      await tx`CREATE TABLE IF NOT EXISTS portal_customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, avatar TEXT NOT NULL DEFAULT 'blue', profile_complete BOOLEAN NOT NULL DEFAULT true)`;
      const priceRevision = await tx`INSERT INTO portal_settings(id,data) VALUES('splicer-prices-2026-09-20','{"applied":true}') ON CONFLICT(id) DO NOTHING RETURNING id`;
      if (priceRevision.length) {
        for (const id of ['ucl-swift-k33a', 'ucl-swift-kf4a']) {
          await tx`INSERT INTO portal_products(id,data) VALUES(${id},'{"price":20000000,"quote":false}') ON CONFLICT(id) DO UPDATE SET data=portal_products.data || excluded.data`;
        }
        await tx`UPDATE portal_products SET data=data || '{"quote":false}'::jsonb WHERE id IN ('ucl-swift-k33','ucl-swift-kf4')`;
      }
      await tx`INSERT INTO portal_banners(id,title,accent,subtitle,cta,href,desktop_image,mobile_image,sort_order,active) VALUES
        ('hero-1','Klik, sambung,','beres!','Cari kebutuhan fiber? Semua kumpul di sini.','Yuk, cari produk','/produk','/images/play-cable.png','/images/play-cable.png',1,true),
        ('hero-2','Siap ngegas','di lapangan.','Splicer dan alat kerja untuk proyek berikutnya.','Lihat peralatannya','/produk?kategori=Fusion%20Splicer','/images/play-tools.png','/images/play-tools.png',2,true),
        ('hero-3','Punya kode sales?','Belanja lebih hemat.','Gunakan referral sales saat checkout. Potongan mengikuti kode yang aktif.','Cari produk','/produk','/images/play-referral.png','/images/play-referral-mobile.png',3,true),
        ('hero-4','Si kecil,','pelengkap koneksi.','Kabel, konektor, dan perlengkapan FTTH untuk instalasi kamu.','Lengkapi sekarang','/produk?kategori=Konektor%20%26%20Adapter','/images/play-connect.png','/images/play-connect.png',4,true)
        ON CONFLICT(id) DO NOTHING`;
      await tx`UPDATE portal_banners SET mobile_image='/images/play-referral-mobile.png' WHERE id='hero-3' AND mobile_image='/images/play-referral.png'`;
    });
  })().catch((e) => {
      initialized = undefined;
      throw e;
    });
  await initialized;
}
export async function isPortalAdmin() {
  await initPortal();
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  const rows =
    await sql`SELECT 1 FROM portal_sessions WHERE token_hash=${createHash('sha256').update(token).digest('hex')} AND expires_at>now()`;
  return !!rows.length;
}
export async function liveProducts(): Promise<Product[]> {
  await initPortal();
  const rows = await sql`SELECT id,data FROM portal_products`;
  return defaults.map((p) => ({
    ...p,
    ...rows.find((r) => r.id === p.id)?.data,
    id: p.id,
  }));
}
export async function customerDetails(id: string) {
  await initPortal();
  const [row] =
    await sql`SELECT name,avatar,profile_complete FROM portal_customers WHERE id=${id}`;
  const [address] =
    await sql`SELECT id FROM records WHERE owner=${id} AND kind='address' LIMIT 1`;
  return {
    name: row?.name,
    avatar: row?.avatar || 'blue',
    profileComplete: row?.profile_complete === true,
    hasAddress: !!address,
  };
}
const num = (v: unknown, min: number, max: number) => {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n < min || n > max)
    throw new BusinessError(`Angka harus ${min}–${max}.`);
  return n;
};
const text = (v: unknown, min = 2, max = 150) => {
  if (typeof v !== 'string' || v.trim().length < min || v.length > max)
    throw new BusinessError('Lengkapi data dengan benar.');
  return v.trim();
};
export async function referralCampaign(code: string) {
  await initPortal();
  const [s] =
    await sql`SELECT * FROM portal_sales WHERE (code=${code} OR legacy_code=${code}) AND status='approved'`;
  const [p] = s
    ? []
    : await sql`SELECT * FROM portal_promos WHERE code=${code} AND active=true`;
  if (!s && !p) return null;
  return {
    code,
    name: s ? 'Referral ' + s.name : p.name,
    status: 'active',
    percent: s ? s.discount : p.percent,
    cap: s ? s.cap : p.cap,
    minSubtotal: 0,
    budget: Number.MAX_SAFE_INTEGER,
    used: 0,
    reserved: 0,
    quota: Number.MAX_SAFE_INTEGER,
    countUsed: 0,
    countReserved: 0,
    salesId: s?.id,
  };
}
async function activity(code: string) {
  const rows =
    await sql`SELECT kind,payload FROM records WHERE kind IN ('rfq','order') AND (COALESCE(payload::jsonb->>'referralCode',payload::jsonb->>'code')=${code} OR COALESCE(payload::jsonb->>'referralCode',payload::jsonb->>'code') IN (SELECT legacy_code FROM portal_sales WHERE code=${code})) ORDER BY payload::jsonb->>'createdAt' DESC LIMIT 200`;
  return rows.map((r) => {
    const p = JSON.parse(r.payload);
    return {
      id: p.id,
      number: p.number,
      name: p.name || p.address?.name || p.company || 'Pembeli',
      status: p.status,
      createdAt: p.createdAt,
      total: p.total || 0,
      discount: p.discount || 0,
      kind: r.kind,
    };
  });
}

function publicBannerImageUrl(
  id: string,
  variant: 'desktop' | 'mobile',
  source: string,
) {
  if (!source.startsWith('data:')) return source;
  const revision = createHash('sha1').update(source).digest('hex').slice(0, 12);
  return `/api/v1/portal/banner-image/${encodeURIComponent(id)}/${variant}?v=${revision}`;
}

export async function portalBannerImage(id: string, variant: string) {
  await initPortal();
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id) || !['desktop', 'mobile'].includes(variant))
    throw new BusinessError('Gambar banner tidak ditemukan.', 404);
  const column = variant === 'desktop' ? 'desktop_image' : 'mobile_image';
  const [row] = await sql.unsafe(
    `SELECT ${column} AS image FROM portal_banners WHERE id=$1 AND active=true`,
    [id],
  );
  const source = String(row?.image || '');
  const match = source.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new BusinessError('Gambar banner tidak ditemukan.', 404);
  return new Response(Buffer.from(match[2], 'base64'), {
    headers: {
      'Content-Type': `image/${match[1]}`,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

export async function portalRequest(req: Request, path: string[], body: any) {
  await initPortal();
  const action = path.slice(1).join('/'),
    post = req.method === 'POST';
  if (action === 'settings' && !post) { const [row] = await sql`SELECT data FROM portal_settings WHERE id='social'`; return row?.data || {instagram:'',tiktok:''}; }
  if (action === 'banners' && !post) {
    const rows = await sql`SELECT id,title,accent,subtitle,cta,href,desktop_image AS "desktopImage",mobile_image AS "mobileImage",sort_order AS "sortOrder" FROM portal_banners WHERE active=true ORDER BY sort_order,id`;
    return rows.map((banner) => ({
      ...banner,
      desktopImage: publicBannerImageUrl(banner.id, 'desktop', banner.desktopImage),
      mobileImage: publicBannerImageUrl(banner.id, 'mobile', banner.mobileImage),
    }));
  }
  if (action === 'admin/login' && post) {
    const email = String(body.email || '')
        .trim()
        .toLowerCase(),
      password = String(body.password || '');
    if (password.length > 200)
      throw new BusinessError('Email atau kata sandi salah.', 401);
    // A persistent account-wide rate limit also covers multiple server instances.
    const [attempt] =
      await sql`INSERT INTO portal_login_attempts(key,attempts) VALUES('admin',1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN portal_login_attempts.started_at<now()-interval '15 minutes' THEN 1 ELSE portal_login_attempts.attempts+1 END, started_at=CASE WHEN portal_login_attempts.started_at<now()-interval '15 minutes' THEN now() ELSE portal_login_attempts.started_at END RETURNING attempts`;
    if (attempt.attempts > 10)
      throw new BusinessError(
        'Terlalu banyak percobaan. Coba lagi dalam 15 menit.',
        429,
      );
    const [account] =
      await sql`SELECT password_hash FROM portal_admin WHERE email=${ADMIN}`;
    const [salt, hash] = (
      account?.password_hash || 'missing:' + '0'.repeat(128)
    ).split(':');
    const candidate = scryptSync(password, salt, 64),
      expected = Buffer.from(hash, 'hex');
    if (
      email !== ADMIN ||
      !account ||
      expected.length !== candidate.length ||
      !timingSafeEqual(candidate, expected)
    )
      throw new BusinessError('Email atau kata sandi salah.', 401);
    const token = randomBytes(32).toString('hex');
    await sql`DELETE FROM portal_login_attempts WHERE key='admin'`;
    await sql`INSERT INTO portal_sessions(token_hash,expires_at) VALUES(${createHash('sha256').update(token).digest('hex')},now()+interval '8 hours')`;
    (await cookies()).set(COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain:
        process.env.NODE_ENV === 'production' ? '.klikfiber.id' : undefined,
      path: '/',
      maxAge: 28800,
    });
    return { email: ADMIN };
  }
  if (action.startsWith('admin/')) {
    if (!(await isPortalAdmin()))
      throw new BusinessError('Masuk dengan akun admin terlebih dahulu.', 401);
    if (action === 'admin/logout' && post) {
      const jar = await cookies();
      const token = jar.get(COOKIE)?.value || '';
      await sql`DELETE FROM portal_sessions WHERE token_hash=${createHash('sha256').update(token).digest('hex')}`;
      jar.delete(COOKIE);
      return { ok: true };
    }
    if (action === 'admin/overview' && !post) {
      const [sales, catalog, orderRows, settingsRows, promos] = await Promise.all([
        sql`SELECT * FROM portal_sales ORDER BY created_at DESC`,
        liveProducts(),
        sql`SELECT payload FROM records WHERE kind='order' ORDER BY payload::jsonb->>'createdAt' DESC LIMIT 200`,
        sql`SELECT data FROM portal_settings WHERE id='social'`,
        sql`SELECT * FROM portal_promos ORDER BY code`,
      ]);
      const orders = orderRows
        .map((row) => {
          try {
            return typeof row.payload === 'string'
              ? JSON.parse(row.payload)
              : row.payload;
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      const paidStatuses = new Set([
        'confirmed',
        'processing',
        'shipped',
        'completed',
      ]);
      const isPaid = (order: any) =>
        order.paymentStatus === 'paid' || paidStatuses.has(order.status);
      const today = new Date().toISOString().slice(0, 10);
      const buildDaily = (days: number) =>
        Array.from({ length: days }, (_, index) => {
          const day = new Date();
          day.setUTCDate(day.getUTCDate() - (days - 1 - index));
          const date = day.toISOString().slice(0, 10);
          const matches = orders.filter((order) =>
            String(order.createdAt || '').startsWith(date),
          );
          return {
            date,
            label: day.toLocaleDateString('id-ID', {
              ...(days === 7
                ? { weekday: 'short' as const }
                : { day: '2-digit' as const, month: 'short' as const }),
              timeZone: 'UTC',
            }),
            revenue: matches
              .filter(isPaid)
              .reduce((sum, order) => sum + Number(order.total || 0), 0),
            orders: matches.length,
          };
        });
      const daily7 = buildDaily(7);
      const daily30 = buildDaily(30);
      const pendingSales = sales.filter((sale) => sale.status === 'pending');
      const awaitingOrders = orders.filter(
        (order) =>
          order.status === 'awaiting_payment' ||
          order.paymentStatus === 'pending',
      );
      const lowStockProducts = catalog.filter((product) => product.stock <= 5);
      return {
        email: ADMIN,
        settings: settingsRows[0]?.data || {instagram:'',tiktok:''},
        products: catalog,
        sales,
        promos,
        // Banner image payloads are intentionally loaded only when the admin
        // opens the banner editor. Keeping them out of login makes /myshop
        // responsive even when four high-resolution images are stored.
        banners: [],
        analytics: {
          totalRevenue: orders
            .filter(isPaid)
            .reduce((sum, order) => sum + Number(order.total || 0), 0),
          totalOrders: orders.length,
          todayOrders: orders.filter((order) =>
            String(order.createdAt || '').startsWith(today),
          ).length,
          awaitingPayment: awaitingOrders.length,
          activeSales: sales.filter((sale) => sale.status === 'approved')
            .length,
          lowStock: lowStockProducts.length,
          daily7,
          daily30,
          notifications: [
            ...(awaitingOrders.length
              ? [
                  {
                    id: 'payments',
                    type: 'orders',
                    title: `${awaitingOrders.length} pembayaran tertunda`,
                    detail: 'Periksa pesanan yang belum dibayar.',
                  },
                ]
              : []),
            ...(pendingSales.length
              ? [
                  {
                    id: 'sales',
                    type: 'sales',
                    title: `${pendingSales.length} pendaftaran sales`,
                    detail: 'Menunggu persetujuan admin.',
                  },
                ]
              : []),
            ...(lowStockProducts.length
              ? [
                  {
                    id: 'stock',
                    type: 'products',
                    title: `${lowStockProducts.length} stok perlu perhatian`,
                    detail: lowStockProducts
                      .slice(0, 2)
                      .map((product) => product.name)
                      .join(', '),
                  },
                ]
              : []),
          ],
          recentOrders: orders.slice(0, 50).map((order) => ({
            id: order.id,
            number: order.number || order.id,
            name: order.address?.name || order.name || 'Pelanggan',
            total: Number(order.total || 0),
            status: order.status || 'awaiting_payment',
            paymentStatus: order.paymentStatus || 'pending',
            paymentProvider: order.paymentProvider || 'legacy',
            paymentType: order.paymentType || null,
            providerTransactionId: order.providerTransactionId || null,
            paidAt: order.paidAt || null,
            createdAt: order.createdAt,
            itemCount: Array.isArray(order.items)
              ? order.items.reduce(
                  (sum: number, item: any) => sum + Number(item.qty || 0),
                  0,
                )
              : 0,
          })),
        },
      };
    }
    if (action === 'admin/banners' && !post) {
      const rows = await sql`SELECT id,title,accent,subtitle,cta,href,desktop_image AS "desktopImage",mobile_image AS "mobileImage",sort_order AS "sortOrder",active FROM portal_banners ORDER BY sort_order,id`;
      return rows.map((banner) => ({
        ...banner,
        desktopImage: publicBannerImageUrl(banner.id, 'desktop', banner.desktopImage),
        mobileImage: publicBannerImageUrl(banner.id, 'mobile', banner.mobileImage),
      }));
    }
    if (action === 'admin/settings' && post) {
      const clean = (value:unknown,host:string) => { if(!value)return ''; let url:URL; try{url=new URL(String(value));}catch{throw new BusinessError('Masukkan URL lengkap.');} if(url.protocol!=='https:' || ![host,'www.'+host].includes(url.hostname) || url.username || url.password)throw new BusinessError('Gunakan tautan HTTPS '+host); return url.toString(); };
      const data={instagram:clean(body.instagram,'instagram.com'),tiktok:clean(body.tiktok,'tiktok.com')};
      await sql`INSERT INTO portal_settings(id,data) VALUES('social',${sql.json(data)}) ON CONFLICT(id) DO UPDATE SET data=excluded.data`;
      return {ok:true};
    }
    if (action === 'admin/product' && post) {
      const original = defaults.find((p) => p.id === body.id);
      if (!original) throw new BusinessError('Produk tidak ditemukan.', 404);
      let imageSrc=String(body.imageSrc || original.imageSrc || '');
      if(imageSrc.startsWith('data:')) {
        if(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(imageSrc)||imageSrc.length>5700000)throw new BusinessError('Gambar maksimal 4 MB (JPG, PNG, WebP).');
        try{imageSrc='data:image/webp;base64,'+(await photoProcessor(Buffer.from(imageSrc.split(',')[1],'base64'),{limitInputPixels:30000000}).rotate().resize(1000,1000,{fit:'contain'}).webp({quality:85}).toBuffer()).toString('base64');}catch{throw new BusinessError('Gambar tidak dapat diproses.');}
      }else if(imageSrc && !imageSrc.startsWith('/') && !/^https:\/\//.test(imageSrc))throw new BusinessError('URL gambar tidak valid.');
      if (body.gallery !== undefined && (!Array.isArray(body.gallery) || body.gallery.length > 7)) throw new BusinessError('Maksimal 7 foto tambahan.');
      const gallery: string[] = [];
      for (const entry of body.gallery || []) {
        let src = String(entry);
        if (src.startsWith('data:')) {
          if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(src) || src.length > 5700000) throw new BusinessError('Setiap foto maksimal 4 MB (JPG, PNG, WebP).');
          try { src = 'data:image/webp;base64,' + (await photoProcessor(Buffer.from(src.split(',')[1], 'base64'), { limitInputPixels: 30000000 }).rotate().resize(1200,1200,{fit:'contain'}).webp({quality:85}).toBuffer()).toString('base64'); }
          catch { throw new BusinessError('Foto galeri tidak dapat diproses.'); }
        } else if (!/^\/(?!\/)/.test(src) && !/^https:\/\//.test(src)) throw new BusinessError('URL foto galeri tidak valid.');
        if (src !== imageSrc && !gallery.includes(src)) gallery.push(src);
      }
      const specs:Record<string,string>={};
      for(const line of String(body.specsText||'').split('\n').filter(Boolean)){const at=line.indexOf(':');if(at<1)throw new BusinessError('Format spesifikasi: Nama: Nilai.');specs[text(line.slice(0,at),1,100)]=text(line.slice(at+1),1,300);}
      if(!categories.includes(body.category))throw new BusinessError('Kategori tidak valid.');
      const data = {
        category:body.category,imageSrc,gallery,specs,quote:original.category === 'Fusion Splicer' ? false : body.quote===true,weight:num(body.weight||1000,1,1000000),
        name: text(body.name),
        model: text(body.model),
        price: num(body.price, original.category === 'Fusion Splicer' ? 1 : 0, 1000000000),
        stock: num(body.stock, 0, 1000000),
        description: text(body.description, 5, 5000),
      };
      await sql`INSERT INTO portal_products(id,data) VALUES(${original.id},${sql.json(data)}) ON CONFLICT(id) DO UPDATE SET data=excluded.data`;
      return { ok: true };
    }
    if (action === 'admin/sales' && post) {
      if (!['approved', 'rejected', 'suspended'].includes(body.status))
        throw new BusinessError('Status tidak valid.');
      const max = num(body.maxDiscount, 0, 50),
        cap = num(body.cap, 0, 10000000);
      const [currentSale] = await sql`SELECT code FROM portal_sales WHERE id=${text(body.id)}`;
      if (!currentSale) throw new BusinessError('Sales tidak ditemukan.', 404);
      const newCode = body.status === 'approved' && !currentSale.code ? await nextSalesCode(sql) : currentSale.code;
      const rows =
        await sql`UPDATE portal_sales SET status=${body.status},max_discount=${max},cap=${cap},discount=LEAST(discount,${max}),code=CASE WHEN ${body.status}='approved' THEN COALESCE(code,${newCode}) ELSE code END,approved_at=CASE WHEN ${body.status}='approved' THEN now() ELSE approved_at END WHERE id=${text(body.id)} RETURNING id`;
      if (!rows.length) throw new BusinessError('Sales tidak ditemukan.', 404);
      return { ok: true };
    }
    if (action === 'admin/promo' && post) {
      const code = text(body.code, 3, 20).toUpperCase();
      if (!/^[A-Z0-9]+$/.test(code) || code.startsWith('KFS') || /^KLIK\d+$/.test(code))
        throw new BusinessError('Awalan KLIK diikuti angka dikhususkan untuk kode sales. Gunakan kode promo lain.');
      const name = text(body.name),
        percent = num(body.percent, 1, 50),
        cap = num(body.cap, 1, 10000000);
      await sql`INSERT INTO portal_promos(code,name,percent,cap,active) VALUES(${code},${name},${percent},${cap},${body.active === true}) ON CONFLICT(code) DO UPDATE SET name=excluded.name,percent=excluded.percent,cap=excluded.cap,active=excluded.active`;
      return { ok: true };
    }
    if (action === 'admin/banner' && post) {
      const bannerId = text(body.id, 3, 40);
      const existing = await sql`SELECT desktop_image,mobile_image FROM portal_banners WHERE id=${bannerId}`;
      if (!existing.length) throw new BusinessError('Banner tidak ditemukan.', 404);
      const processImage = async (value: unknown, width: number, height: number, fallback: string) => {
        const submitted = String(value || '');
        const image = submitted.startsWith(`/api/v1/portal/banner-image/${encodeURIComponent(bannerId)}/`)
          ? fallback
          : String(value || fallback);
        if (image.startsWith('/') || /^https:\/\//.test(image)) return image;
        if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image) || image.length > 6500000)
          throw new BusinessError('Gunakan gambar PNG, JPG, atau WebP maksimal 4 MB.');
        try {
          const buffer = Buffer.from(image.split(',')[1], 'base64');
          const result = await photoProcessor(buffer, { limitInputPixels: 30000000 })
            .rotate()
            .resize(width, height, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 82 })
            .toBuffer();
          return 'data:image/webp;base64,' + result.toString('base64');
        } catch {
          throw new BusinessError('Gambar banner tidak dapat diproses.');
        }
      };
      const desktopImage = await processImage(body.desktopImage, 1600, 640, existing[0].desktop_image);
      const mobileImage = await processImage(body.mobileImage, 800, 400, existing[0].mobile_image);
      const href = text(body.href, 1, 200);
      if (!/^\/(?!\/)/.test(href) && !/^https:\/\//.test(href)) throw new BusinessError('Gunakan tautan halaman website atau URL HTTPS.');
      await sql`UPDATE portal_banners SET href=${href},desktop_image=${desktopImage},mobile_image=${mobileImage},active=${body.active === true} WHERE id=${bannerId}`;
      return { ok: true };
    }
    if (action === 'admin/activity' && !post) {
      const code = new URL(req.url).searchParams.get('code');
      return code ? activity(code) : [];
    }
    throw new BusinessError('Endpoint tidak ditemukan.', 404);
  }
  const auth = await authServer();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user || !user.email_confirmed_at)
    throw new BusinessError('Masuk dan verifikasi email terlebih dahulu.', 401);
  if (action === 'customer/favorites') {
    if (post) {
      if (
        !Array.isArray(body.ids) ||
        body.ids.length > 200 ||
        body.ids.some((id: unknown) => !defaults.some((p) => p.id === id))
      )
        throw new BusinessError('Daftar favorit tidak valid.');
      await sql`INSERT INTO records(id,owner,kind,payload) VALUES(${user.id + '-favorites'},${user.id},'wishlist',${JSON.stringify([...new Set(body.ids)])}) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload WHERE records.owner=excluded.owner`;
      return body.ids;
    }
    const [row] =
      await sql`SELECT payload FROM records WHERE owner=${user.id} AND kind='wishlist' LIMIT 1`;
    return row ? JSON.parse(row.payload) : [];
  }
  if (action === 'customer/profile' && post) {
    const name = text(body.name, 2, 100);
    let avatar = String(body.avatar || 'blue');
    if (!['blue', 'orange', 'mint', 'purple'].includes(avatar)) {
      if (
        !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar) ||
        avatar.length > 400000
      )
        throw new BusinessError(
          'Gunakan foto PNG, JPG, atau WebP maksimal 300 KB.',
        );
      const buffer = Buffer.from(avatar.split(',')[1], 'base64');
      try {
        const result = await photoProcessor(buffer, {
          limitInputPixels: 20000000,
        })
          .rotate()
          .resize(256, 256, { fit: 'cover' })
          .webp({ quality: 80 })
          .toBuffer();
        avatar = 'data:image/webp;base64,' + result.toString('base64');
      } catch {
        throw new BusinessError('Foto tidak dapat dibaca. Pilih gambar lain.');
      }
    }
    await sql`INSERT INTO portal_customers(id,name,avatar) VALUES(${user.id},${name},${avatar}) ON CONFLICT(id) DO UPDATE SET name=excluded.name,avatar=excluded.avatar,profile_complete=true`;
    return { ok: true };
  }
  if (action === 'sales/profile') {
    const [current] = await sql`SELECT * FROM portal_sales WHERE id=${user.id}`;
    if (!post) return current || null;
    if (current) return current;
    const name = text(body.name),
      phone = text(body.phone, 9, 16);
    if (!/^(\+62|62|0)[0-9]{8,13}$/.test(phone))
      throw new BusinessError('Nomor WhatsApp Indonesia tidak valid.');
    const [created] =
      await sql`INSERT INTO portal_sales(id,email,name,phone) VALUES(${user.id},${user.email!},${name},${phone}) ON CONFLICT(id) DO UPDATE SET id=excluded.id RETURNING *`;
    return created;
  }
  const [sales] =
    await sql`SELECT * FROM portal_sales WHERE id=${user.id} AND status='approved'`;
  if (!sales)
    throw new BusinessError('Akses sales menunggu persetujuan admin.', 403);
  if (action === 'sales/discount' && post) {
    const discount = num(body.discount, 0, sales.max_discount);
    const updated =
      await sql`UPDATE portal_sales SET discount=${discount} WHERE id=${user.id} AND status='approved' AND max_discount>=${discount} RETURNING id`;
    if (!updated.length)
      throw new BusinessError('Izin sales berubah. Muat ulang halaman.', 409);
    return { ok: true };
  }
  if (action === 'sales/activity' && !post) return activity(sales.code);
  throw new BusinessError('Endpoint tidak ditemukan.', 404);
}
