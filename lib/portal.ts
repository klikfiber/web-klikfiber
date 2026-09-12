import 'server-only';
import postgres from 'postgres';
import sharp from 'sharp';
type PhotoPipeline = {
  rotate(): PhotoPipeline;
  resize(
    width: number,
    height: number,
    options: { fit: string },
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
import { products as defaults, type Product } from './catalog';
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
export async function initPortal() {
  initialized ||= sql
    .begin(async (tx: any) => {
      await tx`CREATE TABLE IF NOT EXISTS portal_admin (email TEXT PRIMARY KEY, password_hash TEXT NOT NULL)`;
      await tx`CREATE TABLE IF NOT EXISTS portal_sessions (token_hash TEXT PRIMARY KEY, expires_at TIMESTAMPTZ NOT NULL)`;
      await tx`CREATE TABLE IF NOT EXISTS portal_login_attempts (key TEXT PRIMARY KEY, attempts INT NOT NULL DEFAULT 0, started_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
      await tx`CREATE TABLE IF NOT EXISTS portal_products (id TEXT PRIMARY KEY, data JSONB NOT NULL)`;
      await tx`CREATE TABLE IF NOT EXISTS portal_sales (id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', code TEXT UNIQUE, discount INT NOT NULL DEFAULT 0, max_discount INT NOT NULL DEFAULT 5, cap INT NOT NULL DEFAULT 300000, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), approved_at TIMESTAMPTZ)`;
      await tx`CREATE TABLE IF NOT EXISTS portal_promos (code TEXT PRIMARY KEY, name TEXT NOT NULL, percent INT NOT NULL, cap INT NOT NULL, active BOOLEAN NOT NULL DEFAULT true)`;
      await tx`CREATE TABLE IF NOT EXISTS portal_customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, avatar TEXT NOT NULL DEFAULT 'blue', profile_complete BOOLEAN NOT NULL DEFAULT true)`;
      for (const table of [
        'portal_admin',
        'portal_sessions',
        'portal_login_attempts',
        'portal_products',
        'portal_sales',
        'portal_promos',
        'portal_customers',
        'records',
      ]) {
        await tx.unsafe(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
        await tx.unsafe(
          `REVOKE ALL ON TABLE ${table} FROM anon, authenticated`,
        );
      }
    })
    .catch((e) => {
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
    await sql`SELECT * FROM portal_sales WHERE code=${code} AND status='approved'`;
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
    await sql`SELECT kind,payload FROM records WHERE kind IN ('rfq','order') AND COALESCE(payload::jsonb->>'referralCode',payload::jsonb->>'code')=${code} ORDER BY payload::jsonb->>'createdAt' DESC LIMIT 200`;
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
export async function portalRequest(req: Request, path: string[], body: any) {
  await initPortal();
  const action = path.slice(1).join('/'),
    post = req.method === 'POST';
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
      sameSite: 'strict',
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
      const sales =
        await sql`SELECT * FROM portal_sales ORDER BY created_at DESC`;
      return {
        email: ADMIN,
        products: await liveProducts(),
        sales,
        promos: await sql`SELECT * FROM portal_promos ORDER BY code`,
      };
    }
    if (action === 'admin/product' && post) {
      const original = defaults.find((p) => p.id === body.id);
      if (!original) throw new BusinessError('Produk tidak ditemukan.', 404);
      const data = {
        name: text(body.name),
        model: text(body.model),
        price: num(body.price, 0, 1000000000),
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
      const rows =
        await sql`UPDATE portal_sales SET status=${body.status},max_discount=${max},cap=${cap},discount=LEAST(discount,${max}),code=CASE WHEN ${body.status}='approved' THEN COALESCE(code,${'KFS' + randomBytes(6).toString('hex').toUpperCase()}) ELSE code END,approved_at=CASE WHEN ${body.status}='approved' THEN now() ELSE approved_at END WHERE id=${text(body.id)} RETURNING id`;
      if (!rows.length) throw new BusinessError('Sales tidak ditemukan.', 404);
      return { ok: true };
    }
    if (action === 'admin/promo' && post) {
      const code = text(body.code, 3, 20).toUpperCase();
      if (!/^[A-Z0-9]+$/.test(code) || code.startsWith('KFS'))
        throw new BusinessError('Gunakan kode alfanumerik tanpa awalan KFS.');
      const name = text(body.name),
        percent = num(body.percent, 1, 50),
        cap = num(body.cap, 1, 10000000);
      await sql`INSERT INTO portal_promos(code,name,percent,cap,active) VALUES(${code},${name},${percent},${cap},${body.active === true}) ON CONFLICT(code) DO UPDATE SET name=excluded.name,percent=excluded.percent,cap=excluded.cap,active=excluded.active`;
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
    const updated=await sql`UPDATE portal_sales SET discount=${discount} WHERE id=${user.id} AND status='approved' AND max_discount>=${discount} RETURNING id`;
    if(!updated.length)throw new BusinessError('Izin sales berubah. Muat ulang halaman.',409);
    return { ok: true };
  }
  if (action === 'sales/activity' && !post) return activity(sales.code);
  throw new BusinessError('Endpoint tidak ditemukan.', 404);
}
