import { authServer } from '@/lib/auth/server';
import { portalRequest, liveProducts, referralCampaign, customerDetails } from '@/lib/portal';
import postgres from 'postgres';
import { products } from '@/lib/catalog';
import { BusinessError, validAddress, priceCart } from '@/lib/commerce';
const schema = [
  `CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, profile TEXT NOT NULL, expires INTEGER NOT NULL)`,
  `ALTER TABLE sessions ALTER COLUMN expires TYPE BIGINT`,
  `CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, owner TEXT NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS records_owner_kind ON records(owner,kind)`,
  `CREATE TABLE IF NOT EXISTS inventory (owner TEXT NOT NULL,id TEXT NOT NULL,stock INTEGER NOT NULL CHECK(stock>=0),reserved INTEGER NOT NULL DEFAULT 0 CHECK(reserved>=0 AND reserved<=stock),PRIMARY KEY(owner,id))`,
  `CREATE TABLE IF NOT EXISTS campaigns (owner TEXT NOT NULL,code TEXT NOT NULL,name TEXT NOT NULL,status TEXT NOT NULL,percent INTEGER NOT NULL,cap INTEGER NOT NULL,budget INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0,reserved INTEGER NOT NULL DEFAULT 0,quota INTEGER NOT NULL,countUsed INTEGER NOT NULL DEFAULT 0,countReserved INTEGER NOT NULL DEFAULT 0,minSubtotal INTEGER NOT NULL DEFAULT 100000,PRIMARY KEY(owner,code),CHECK(used+reserved<=budget AND countUsed+countReserved<=quota))`,
  `CREATE TABLE IF NOT EXISTS idempotency (owner TEXT NOT NULL,key TEXT NOT NULL,fingerprint TEXT NOT NULL,recordId TEXT NOT NULL,PRIMARY KEY(owner,key))`,
  `CREATE TABLE IF NOT EXISTS guards (id TEXT PRIMARY KEY,ok INTEGER NOT NULL CHECK(ok=1))`,
];
type Row = Record<string, any>;
type QueryResult<T extends Row = Row> = { results: T[] };
const connection = process.env.DATABASE_URL;
if (!connection) throw new Error('DATABASE_URL is required');
const sql = postgres(connection, { ssl: 'require', max: 5, prepare: false });
const normalize = <T extends Row>(row: T): T => {
  const value = row as Row;
  if ('countused' in value) value.countUsed = value.countused;
  if ('countreserved' in value) value.countReserved = value.countreserved;
  if ('minsubtotal' in value) value.minSubtotal = value.minsubtotal;
  return row;
};
class Statement {
  values: any[] = [];
  constructor(public query: string) {}
  bind(...values: any[]) {
    this.values = values;
    return this;
  }
  private pgQuery() {
    let i = 0;
    return this.query.replace(/\?/g, () => `$${++i}`);
  }
  async execute(client: any = sql) {
    return client.unsafe(this.pgQuery(), this.values);
  }
  async run() {
    const rows = await this.execute();
    return { success: true, results: rows };
  }
  async first<T extends Row>() {
    const rows = await this.execute();
    return rows[0] ? normalize(rows[0] as T) : null;
  }
  async all<T extends Row>(): Promise<QueryResult<T>> {
    const rows = await this.execute();
    return { results: rows.map((row: T) => normalize(row)) };
  }
}
const database = {
  prepare(query: string) {
    return new Statement(query);
  },
  async batch(statements: Statement[]) {
    return sql.begin(async (transaction) => {
      const results = [];
      for (const statement of statements)
        results.push(await statement.execute(transaction));
      return results;
    });
  },
};
const db = () => database;
let initialized: Promise<unknown> | undefined;
async function init() {
  initialized ||= db()
    .batch(schema.map((sql) => db().prepare(sql)))
    .catch((e) => {
      initialized = undefined;
      throw e;
    });
  await initialized;
}
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const save = (owner: string, kind: string, value: any) =>
  db()
    .prepare('INSERT INTO records(id,owner,kind,payload) VALUES(?,?,?,?)')
    .bind(value.id, owner, kind, JSON.stringify(value));
const update = (owner: string, value: any) =>
  db()
    .prepare('UPDATE records SET payload=? WHERE id=? AND owner=?')
    .bind(JSON.stringify(value), value.id, owner);
async function records(owner: string, kind: string) {
  const r = await db()
    .prepare(
      "SELECT payload FROM records WHERE owner=? AND kind=? ORDER BY payload::jsonb->>'createdAt' DESC NULLS LAST LIMIT 200",
    )
    .bind(owner, kind)
    .all<{ payload: string }>();
  return r.results.map((r) => JSON.parse(r.payload));
}
async function record(owner: string, key: string, kind?: string) {
  const r = await db()
    .prepare('SELECT payload,kind FROM records WHERE owner=? AND id=?')
    .bind(owner, key)
    .first<{ payload: string; kind: string }>();
  if (!r || (kind && r.kind !== kind))
    throw new BusinessError('Data tidak ditemukan.', 404);
  return JSON.parse(r.payload);
}
function audit(owner: string, role: string, action: string, reason: string) {
  return save(owner, 'audit', {
    id: id(),
    role,
    action,
    reason: reason.slice(0, 1000),
    createdAt: now(),
  });
}
function guard(sql: string, bindings: any[] = []) {
  const gid = id();
  return [
    db()
      .prepare(
        `INSERT INTO guards(id,ok) SELECT ?, CASE WHEN (${sql}) THEN 1 ELSE 0 END`,
      )
      .bind(gid, ...bindings),
    db().prepare('DELETE FROM guards WHERE id=?').bind(gid),
  ];
}
function role(profile: any, allowed: string[]) {
  if (!allowed.includes(profile.staffRole))
    throw new BusinessError(
      'Anda tidak memiliki izin untuk tindakan ini.',
      403,
    );
}
function str(v: any, min = 1, max = 100) {
  if (typeof v !== 'string' || v.trim().length < min || v.length > max)
    throw new BusinessError('Data teks tidak lengkap atau terlalu panjang.');
  return v.trim();
}
function integer(v: any, min = 1, max = 1000000000) {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n < min || n > max)
    throw new BusinessError('Nilai angka di luar batas.');
  return n;
}
async function seed(owner: string) {
  await db().batch([
    ...products.map((p) =>
      db()
        .prepare(
          'INSERT INTO inventory(owner,id,stock) VALUES(?,?,?) ON CONFLICT DO NOTHING',
        )
        .bind(owner, p.id, p.stock),
    ),
    db()
      .prepare(
        "INSERT INTO campaigns(owner,code,name,status,percent,cap,budget,quota) VALUES(?,'KLIK5','Kebutuhan Fiber Lebih Hemat','active',5,300000,5000000,100) ON CONFLICT DO NOTHING",
      )
      .bind(owner),
  ]);
}
async function release(owner: string, o: any, status: string) {
  if (o.status !== 'awaiting_payment')
    throw new BusinessError('Pesanan ini tidak dapat dibatalkan.', 409);
  const next = { ...o, status };
  const statements = [
    ...guard(
      "SELECT payload::jsonb->>'status'='awaiting_payment' FROM records WHERE id=? AND owner=?",
      [o.id, owner],
    ),
    ...o.items.map((p: any) =>
      db()
        .prepare(
          'UPDATE inventory SET reserved=reserved-? WHERE owner=? AND id=?',
        )
        .bind(p.qty, owner, p.id),
    ),
    update(owner, next),
  ];
  if (o.code)
    statements.push(
      db()
        .prepare(
          'UPDATE campaigns SET reserved=reserved-?,countReserved=countReserved-1 WHERE owner=? AND code=?',
        )
        .bind(o.discount, owner, o.code),
    );
  await db().batch(statements);
  return next;
}
async function handle(req: Request) {
  await init();
  const url = new URL(req.url);
  const path = url.pathname.replace('/api/v1/', '').split('/');
  const isPost = req.method === 'POST';
  if (isPost) {
    const origin = req.headers.get('origin');
    if (origin) {
      const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0].trim();
      const requestHost = (forwardedHost || req.headers.get('host') || url.host).toLowerCase();
      let originHost = '';
      try { originHost = new URL(origin).host.toLowerCase(); } catch {}
      if (!originHost || (originHost !== requestHost && originHost !== url.host.toLowerCase()))
        throw new BusinessError('Origin tidak diizinkan.', 403);
    }
    if (!req.headers.get('content-type')?.includes('application/json'))
      throw new BusinessError('Content-Type harus application/json.', 415);
  }
  let body: any = {};
  if (isPost) {
    const text = await req.text();
    if (text.length > (path.join('/')==='portal/customer/profile'?420000:20000))
      throw new BusinessError('Request terlalu besar.', 413);
    try {
      body = JSON.parse(text);
    } catch {
      throw new BusinessError('JSON tidak valid.', 400);
    }
  }
  const rpath = path.join('/');
  if(path[0]==='portal')return respond(await portalRequest(req,path,body));
  if(['admin','marketing','sales'].includes(path[0]))throw new BusinessError('Gunakan portal terbaru di /myshop atau /sales.',410);
  const products=await liveProducts();
  if (rpath === 'auth/demo' || rpath === 'auth/demo-role' || path.includes('simulate-payment')) throw new BusinessError('Layanan tidak tersedia.', 410);
  const auth = await authServer();
  const { data: { user } } = await auth.auth.getUser();
  const staffRole = undefined;
  const session = user ? { id: user.id, profile: JSON.stringify({id:user.id,name:user.user_metadata?.full_name || user.email?.split('@')[0] || 'Pelanggan',email:user.email,staffRole}) } : null;
  if (path[0] === 'products')
    return respond(
      path[1] ? products.find((p) => p.id === path[1]) || null : products,
    );
  if (!session)
    throw new BusinessError('Silakan masuk atau daftar terlebih dahulu.', 401);
  const owner = session.id as string;
  const profile = JSON.parse(session.profile);
  const r = path.join('/');
  if (r === 'auth/logout' && isPost) { await auth.auth.signOut(); return respond({ok:true}); }
  if (r === 'shipping/rates' && isPost) {
    const apiKey = process.env.BITESHIP_API_KEY;
    if (!apiKey) throw new BusinessError('Koneksi tarif pengiriman belum diaktifkan.', 503);
    const destination = integer(body.destinationPostalCode, 10000, 99999);
    if (!Array.isArray(body.items) || !body.items.length) throw new BusinessError('Keranjang masih kosong.');
    const items = body.items.map((item: any) => {
      const product = products.find((p) => p.id === item.id);
      if (!product) throw new BusinessError('Produk tidak ditemukan.');
      const dimensions = product.dimensions || { length: 30, width: 25, height: 20 };
      return { name: product.name, description: product.description, sku: product.model, category: 'electronic', value: product.price, quantity: integer(item.qty, 1, 100), weight: product.weight || 1000, ...dimensions };
    });
    const response = await fetch('https://api.biteship.com/v1/rates/couriers', { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(apiKey + ':').toString('base64')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ origin_postal_code: 17113, destination_postal_code: destination, couriers: process.env.BITESHIP_COURIERS || 'jne,sicepat,anteraja,jnt', items }), signal: AbortSignal.timeout(12000) });
    const result: any = await response.json();
    if (!response.ok || !result.success) throw new BusinessError(result.message || 'Tarif pengiriman belum tersedia.', 502);
    return respond(result.pricing || []);
  }
  if (r === 'sales/profile') {
    const current = (await records(owner, 'sales_profile'))[0] || null;
    if (!isPost) return respond(current);
    if (current) return respond(current);
    const sales = { id: owner + '-sales', code: 'KFS' + owner.replace(/-/g, '').slice(0, 7).toUpperCase(), name: str(body.name, 2, 100), phone: str(body.phone, 9, 16), city: str(body.city, 2, 100), status: 'active', createdAt: now() };
    await save(owner, 'sales_profile', sales).run();
    return respond(sales, 201);
  }
  if (r === 'sales/referrals') {
    const sales = (await records(owner, 'sales_profile'))[0];
    if (!sales) throw new BusinessError('Daftar sebagai sales terlebih dahulu.', 404);
    const rows = await db().prepare("SELECT payload FROM records WHERE kind='rfq' AND payload::jsonb->>'referralCode'=? ORDER BY payload::jsonb->>'createdAt' DESC LIMIT 100").bind(sales.code).all<{payload:string}>();
    return respond(rows.results.map((row) => { const q = JSON.parse(row.payload); return { number:q.number, company:q.company, status:q.status, createdAt:q.createdAt }; }));
  }
  if (r === 'orders' && isPost) throw new BusinessError('Pembayaran online belum diaktifkan. Hubungi tim KLIKFIBER untuk menyelesaikan pesanan.', 503);
  if (r === 'me') {
    if (isPost) {
      profile.name = str(body.name, 2, 100);
      const {error} = await auth.auth.updateUser({data:{full_name:profile.name}}); if(error)throw new BusinessError('Profil belum dapat diperbarui.',400);
    }
    const details=await customerDetails(owner);
    return respond({...profile,...details,name:details.name||profile.name});
  }
  if (r === 'addresses') {
    if (isPost) {
      const a = { ...validAddress(body), id: owner + '-address' };
      await db()
        .prepare(
          'INSERT INTO records VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload WHERE records.owner=excluded.owner',
        )
        .bind(a.id, owner, 'address', JSON.stringify(a))
        .run();
      return respond(a);
    }
    return respond(await records(owner, 'address'));
  }
  // Release expired reservations before reads and checkout. Each release is atomic.
  for (const o of await records(owner, 'order'))
    if (
      o.status === 'awaiting_payment' &&
      Date.parse(o.expiresAt) < Date.now()
    ) {
      try {
        await release(owner, o, 'expired');
      } catch {}
    }
  if (r === 'referrals/validate' && isPost) {
    const code = String(body.code || '').trim().toUpperCase();
    if (!code)
      throw new BusinessError('Masukkan kode referral sales.');
    const campaign = await referralCampaign(code);
    if (!campaign)
      throw new BusinessError('Kode referral sales tidak valid atau belum aktif.');
    return respond({ code, name: campaign.name, percent: campaign.percent, cap: campaign.cap });
  }
  if (r === 'checkout/quote' && isPost) {
    const address = validAddress(body.address);
    if (address.city.toLowerCase() === 'tidak terlayani')
      throw new BusinessError(
        'Layanan kurir tidak tersedia. Ajukan penawaran pengiriman.',
        422,
      );
    const code = String(body.code || '')
      .trim()
      .toUpperCase();
    if (!code)
      throw new BusinessError('Masukkan kode referral sales untuk melanjutkan checkout.');
    const campaign = code
      ? await referralCampaign(code)
      : null;
    if (!campaign)
      throw new BusinessError('Kode referral sales tidak valid atau belum aktif.');
    const totals = priceCart(body.items, body.shipping, campaign, products);
    const apiKey = process.env.BITESHIP_API_KEY;
    if (!apiKey) throw new BusinessError('Koneksi tarif Biteship belum diaktifkan.', 503);
    const rateResponse = await fetch('https://api.biteship.com/v1/rates/couriers', {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(apiKey + ':').toString('base64')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin_postal_code: 17113, destination_postal_code: Number(address.postal), couriers: process.env.BITESHIP_COURIERS || 'jne,sicepat,anteraja,jnt', items: totals.items.map((item: any) => { const product = products.find((p) => p.id === item.id)!; return { name: product.name, sku: product.model, value: product.price, quantity: item.qty, weight: product.weight || 1000, ...(product.dimensions || { length: 30, width: 25, height: 20 }) }; }) }),
      signal: AbortSignal.timeout(12000),
    });
    const rateResult: any = await rateResponse.json();
    if (!rateResponse.ok || !rateResult.success || !rateResult.pricing?.length) throw new BusinessError(rateResult.message || 'Tarif pengiriman tidak tersedia untuk tujuan ini.', 422);
    const shippingOptions = rateResult.pricing.sort((a:any,b:any)=>a.price-b.price).map((x:any)=>({ id:`${x.courier_code}:${x.courier_service_code}`, name:`${x.courier_name} ${x.courier_service_name}`, cost:x.price, eta:x.duration }));
    const selectedShipping = shippingOptions.find((x:any)=>x.id===body.shipping) || shippingOptions[0];
    totals.shippingCost = selectedShipping.cost;
    totals.total = totals.subtotal - totals.discount + selectedShipping.cost;
    for (const p of totals.items) {
      const stock = await db()
        .prepare(
          'SELECT stock-reserved AS available FROM inventory WHERE owner=? AND id=?',
        )
        .bind(owner, p.id)
        .first<any>();
      if ((products.find(x=>x.id===p.id)?.stock || 0) < p.qty)
        throw new BusinessError('Stok ' + p.name + ' tidak mencukupi.', 409);
    }
    const q = {
      id: id(),
      ...totals,
      address,
      code,
      shippingOptions,
      selectedShipping,
      createdAt: now(),
      expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
    };
    await save(owner, 'checkout', q).run();
    return respond(q);
  }
  if (r === 'orders' && !isPost) return respond(await records(owner, 'order'));
  if (r === 'orders' && isPost) {
    str(body.requestId, 10, 100);
    const old = await db()
      .prepare('SELECT * FROM idempotency WHERE owner=? AND key=?')
      .bind(owner, body.requestId)
      .first<any>();
    if (old) {
      if (old.fingerprint !== body.quoteId)
        throw new BusinessError(
          'Key idempotensi digunakan untuk request berbeda.',
          409,
        );
      return respond(await record(owner, old.recordId, 'order'));
    }
    if (body.terms !== true)
      throw new BusinessError('Persetujuan transaksi diperlukan.');
    const q = await record(owner, body.quoteId, 'checkout');
    if (Date.parse(q.expiresAt) < Date.now())
      throw new BusinessError(
        'Ongkir kedaluwarsa. Periksa total kembali.',
        409,
      );
    const orderId = id();
    const o = {
      ...q,
      id: orderId,
      number:
        'KLF-' +
        new Date().toISOString().slice(2, 10).replaceAll('-', '') +
        '-' +
        orderId.slice(0, 6).toUpperCase(),
      status: 'awaiting_payment',
      paymentStatus: 'pending',
      shipmentStatus: 'not_booked',
      createdAt: now(),
      expiresAt: new Date(Date.now() + 60 * 60000).toISOString(),
      refunded: 0,
    };
    const stmts = [
      ...guard(
        'NOT EXISTS(SELECT 1 FROM idempotency WHERE owner=? AND fingerprint=?)',
        [owner, q.id],
      ),
    ];
    for (const p of o.items)
      stmts.push(
        ...guard(
          'SELECT stock-reserved>=? FROM inventory WHERE owner=? AND id=?',
          [p.qty, owner, p.id],
        ),
        db()
          .prepare(
            'UPDATE inventory SET reserved=reserved+? WHERE owner=? AND id=?',
          )
          .bind(p.qty, owner, p.id),
      );
    if (o.code)
      stmts.push(
        ...guard(
          "SELECT status='active' AND used+reserved+?<=budget AND countUsed+countReserved<quota FROM campaigns WHERE owner=? AND code=?",
          [o.discount, owner, o.code],
        ),
        db()
          .prepare(
            'UPDATE campaigns SET reserved=reserved+?,countReserved=countReserved+1 WHERE owner=? AND code=?',
          )
          .bind(o.discount, owner, o.code),
      );
    stmts.push(
      save(owner, 'order', o),
      db()
        .prepare('INSERT INTO idempotency VALUES(?,?,?,?)')
        .bind(owner, body.requestId, q.id, o.id),
      audit(owner, 'customer', 'order.created', o.number),
    );
    try {
      await db().batch(stmts);
    } catch {
      const concurrent = await db()
        .prepare('SELECT * FROM idempotency WHERE owner=? AND key=?')
        .bind(owner, body.requestId)
        .first<any>();
      if (concurrent && concurrent.fingerprint === q.id)
        return respond(await record(owner, concurrent.recordId, 'order'));
      throw new BusinessError(
        'Stok, promo, atau penawaran berubah. Periksa kembali sebelum membayar.',
        409,
      );
    }
    return respond(o, 201);
  }
  if (path[0] === 'orders' && path[1]) {
    const o = await record(owner, path[1], 'order');
    if (path[2] === 'cancel' && isPost)
      return respond(await release(owner, o, 'canceled'));
    if (path[2] === 'simulate-payment' && isPost) {
      if (!profile.demo)
        throw new BusinessError('Simulasi tidak tersedia.', 403);
      if (
        ['confirmed', 'processing', 'shipped', 'completed'].includes(o.status)
      )
        return respond(o);
      if (o.status !== 'awaiting_payment')
        throw new BusinessError('Pesanan sudah tidak dapat dibayar.', 409);
      const paid = {
        ...o,
        status: 'confirmed',
        paymentStatus: 'succeeded',
        paidAt: now(),
      };
      const stmts = [
        ...guard(
          "SELECT payload::jsonb->>'status'='awaiting_payment' FROM records WHERE owner=? AND id=?",
          [owner, o.id],
        ),
        update(owner, paid),
        audit(owner, 'demo-provider', 'payment.succeeded', o.number),
      ];
      if (o.code)
        stmts.push(
          db()
            .prepare(
              'UPDATE campaigns SET reserved=reserved-?,used=used+?,countReserved=countReserved-1,countUsed=countUsed+1 WHERE owner=? AND code=?',
            )
            .bind(o.discount, o.discount, owner, o.code),
        );
      await db().batch(stmts);
      return respond(paid);
    }
    if (path[2] === 'invoice') {
      if (
        !['confirmed', 'processing', 'shipped', 'completed'].includes(o.status)
      )
        throw new BusinessError('Invoice tersedia setelah pembayaran.', 409);
      const esc = (s: any) =>
        String(s).replace(
          /[&<>"']/g,
          (c) =>
            ({
              '&': '&amp;',
              '<': '&lt;',
              '>': '&gt;',
              '"': '&quot;',
              "'": '&#39;',
            })[c]!,
        );
      return new Response(
        `<!doctype html><html lang="id"><meta charset="utf-8"><title>Invoice ${esc(o.number)}</title><style>body{font:16px Arial;color:#0b1f3a;max-width:850px;margin:50px auto;padding:25px}h1{color:#0098b8}table{width:100%;border-collapse:collapse}td,th{padding:15px;text-align:left;border-bottom:1px solid #ddd}</style><h1>KLIKFIBER</h1><h2>Invoice Penjualan</h2><p>${esc(o.number)} · ${esc(o.paidAt)}</p><p>${esc(o.address.name)}<br>${esc(o.address.street)}, ${esc(o.address.city)}</p><table><tr><th>Produk</th><th>Jumlah</th><th>Harga</th></tr>${o.items.map((p: any) => `<tr><td>${esc(p.name)}</td><td>${p.qty}</td><td>Rp ${(p.qty * p.price).toLocaleString('id-ID')}</td></tr>`).join('')}</table><p>Subtotal: Rp ${o.subtotal.toLocaleString('id-ID')}<br>Diskon: Rp ${o.discount.toLocaleString('id-ID')}<br>Ongkir: Rp ${o.shippingCost.toLocaleString('id-ID')}</p><h2>Total Rp ${o.total.toLocaleString('id-ID')}</h2><p>klikfiber@gmail.com</p></html>`,
        {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
            'Content-Security-Policy':
              "default-src 'none'; style-src 'unsafe-inline'",
          },
        },
      );
    }
    return respond(o);
  }
  if (r === 'quotes') {
    if (!isPost) return respond(await records(owner, 'rfq'));
    const referralCode=String(body.referralCode||'').trim().toUpperCase();
    const referral=referralCode?await referralCampaign(referralCode):null;
    if(referralCode&&!referral)throw new BusinessError('Kode referral tidak aktif atau belum disetujui.');
    const q = {
      id: id(),
      number: 'RFQ-' + id().slice(0, 8).toUpperCase(),
      company: str(body.company, 2, 150),
      name: str(body.name, 2, 100),
      email: str(body.email, 3, 200),
      phone: str(body.phone, 9, 16),
      city: str(body.city, 2, 100),
      requirements: str(body.requirements, 10, 3000),
      referralCode,
      salesId:referral?.salesId||null,
      referralPercent:referral?.percent||0,
      referralCap:referral?.cap||0,
      status: 'submitted',
      version: 0,
      createdAt: now(),
    };
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q.email) ||
      !/^\+?\d{9,15}$/.test(q.phone)
    )
      throw new BusinessError('Email atau telepon tidak valid.');
    await save(owner, 'rfq', q).run();
    return respond(q, 201);
  }
  if (path[0] === 'quotes' && path[2] === 'accept' && isPost) {
    const q = await record(owner, path[1], 'rfq');
    if (
      q.status !== 'offered' ||
      q.version !== body.version ||
      Date.parse(q.expiresAt) < Date.now()
    )
      throw new BusinessError('Penawaran berubah atau kedaluwarsa.', 409);
    const next = { ...q, status: 'accepted' };
    await db().batch([
      ...guard(
        "SELECT payload::jsonb->>'status'='offered' AND (payload::jsonb->>'version')::int=? FROM records WHERE id=? AND owner=?",
        [body.version, q.id, owner],
      ),
      update(owner, next),
      audit(owner, 'customer', 'quote.accepted', q.number),
    ]);
    return respond(next);
  }
  if (r === 'support' && isPost) {
    const o = await record(owner, body.orderId, 'order');
    if (!['confirmed', 'processing', 'shipped', 'completed'].includes(o.status))
      throw new BusinessError('Tiket hanya untuk pesanan yang dibayar.');
    const t = {
      id: id(),
      orderId: o.id,
      reason: str(body.reason, 10, 1500),
      status: 'requested',
      createdAt: now(),
    };
    await save(owner, 'ticket', t).run();
    return respond(t);
  }
  if (r === 'admin/overview') {
    role(profile, ['owner', 'operations', 'finance', 'marketing']);
    const orders = await records(owner, 'order');
    const paid = orders.filter((o) =>
      ['confirmed', 'processing', 'shipped', 'completed'].includes(o.status),
    );
    const campaigns = (
      await db()
        .prepare('SELECT * FROM campaigns WHERE owner=?')
        .bind(owner)
        .all()
    ).results;
    const inv = (
      await db()
        .prepare('SELECT * FROM inventory WHERE owner=?')
        .bind(owner)
        .all<any>()
    ).results;
    const marketing = profile.staffRole === 'marketing';
    return respond({
      paidCount: paid.length,
      netSales: paid.reduce(
        (n, o) => n + Math.max(0, o.subtotal - o.discount - (o.refunded || 0)),
        0,
      ),
      discountUsed: paid.reduce((n, o) => n + o.discount, 0),
      orders: marketing ? [] : orders,
      campaigns,
      inventory: marketing
        ? []
        : inv.map((x) => ({ ...products.find((p) => p.id === x.id), ...x })),
      quotes: marketing ? [] : await records(owner, 'rfq'),
      audit: marketing ? [] : await records(owner, 'audit'),
      tickets: marketing ? [] : await records(owner, 'ticket'),
    });
  }
  if (r === 'admin/stock-adjustments' && isPost) {
    role(profile, ['owner', 'operations']);
    const delta = integer(body.delta, -100000, 100000);
    const reason = str(body.reason, 5, 1000);
    const p = products.find((p) => p.id === body.id);
    if (!p) throw new BusinessError('SKU tidak ditemukan.', 404);
    await db().batch([
      ...guard(
        'SELECT stock+?>=reserved FROM inventory WHERE owner=? AND id=?',
        [delta, owner, p.id],
      ),
      db()
        .prepare('UPDATE inventory SET stock=stock+? WHERE owner=? AND id=?')
        .bind(delta, owner, p.id),
      audit(
        owner,
        profile.staffRole,
        'inventory.adjust',
        p.model + ': ' + delta + '; ' + reason,
      ),
    ]);
    return respond({ ok: true });
  }
  if (
    path[0] === 'admin' &&
    path[1] === 'orders' &&
    path[3] === 'advance' &&
    isPost
  ) {
    role(profile, ['owner', 'operations']);
    const o = await record(owner, path[2], 'order');
    const transitions: Record<string, string> = {
      confirmed: 'processing',
      processing: 'shipped',
      shipped: 'completed',
    };
    const status = transitions[o.status];
    if (!status)
      throw new BusinessError('Transisi status tidak diizinkan.', 409);
    const next = {
      ...o,
      status,
      shipmentStatus:
        status === 'shipped'
          ? 'in_transit'
          : status === 'completed'
            ? 'delivered'
            : 'not_booked',
      tracking:
        status === 'shipped'
          ? 'DEMO-' + id().slice(0, 10).toUpperCase()
          : o.tracking,
    };
    const stmts = [
      ...guard(
        "SELECT payload::jsonb->>'status'=? FROM records WHERE id=? AND owner=?",
        [o.status, o.id, owner],
      ),
      update(owner, next),
      audit(owner, profile.staffRole, 'order.' + status, o.number),
    ];
    if (status === 'shipped')
      for (const p of o.items)
        stmts.push(
          db()
            .prepare(
              'UPDATE inventory SET stock=stock-?,reserved=reserved-? WHERE owner=? AND id=?',
            )
            .bind(p.qty, p.qty, owner, p.id),
        );
    await db().batch(stmts);
    return respond(next);
  }
  if (path[0] === 'admin' && path[1] === 'quotes' && isPost) {
    role(profile, ['owner', 'operations']);
    const q = await record(owner, path[2], 'rfq');
    if (path[3] === 'offer') {
      if (!['submitted', 'offered'].includes(q.status))
        throw new BusinessError('Penawaran tidak dapat direvisi.', 409);
      const p = products.find((p) => p.id === body.productId);
      if (!p) throw new BusinessError('SKU tidak ditemukan.');
      const unitPrice = integer(body.amount);
      const qty = integer(body.qty, 1, 99);
      const cost = integer(body.shippingCost);
      const next = {
        ...q,
        status: 'offered',
        version: q.version + 1,
        productId: p.id,
        qty,
        unitPrice,
        shippingCost: cost,
        amount: unitPrice * qty + cost,
        reason: str(body.reason, 5, 1000),
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      };
      await db().batch([
        ...guard(
          "SELECT (payload::jsonb->>'version')::int=? FROM records WHERE owner=? AND id=?",
          [q.version, owner, q.id],
        ),
        update(owner, next),
        audit(owner, profile.staffRole, 'quote.offered', q.number),
      ]);
      return respond(next);
    }
    if (path[3] === 'convert') {
      if (q.status !== 'accepted' || Date.parse(q.expiresAt) < Date.now())
        throw new BusinessError(
          'Penawaran belum diterima atau kedaluwarsa.',
          409,
        );
      const p = products.find((p) => p.id === q.productId)!;
      const o = {
        id: id(),
        number: 'KLF-RFQ-' + id().slice(0, 6).toUpperCase(),
        status: 'awaiting_payment',
        paymentStatus: 'pending',
        shipmentStatus: 'not_booked',
        items: [
          {
            id: p.id,
            name: p.name,
            model: p.model,
            price: q.unitPrice,
            qty: q.qty,
          },
        ],
        address: {
          name: q.name,
          street: 'Alamat proyek perlu dikonfirmasi',
          city: q.city,
          phone: q.phone,
          postal: '',
          company: q.company,
        },
        subtotal: q.unitPrice * q.qty,
        discount: 0,
        shippingCost: q.shippingCost,
        total: q.amount,
        code: '',
        createdAt: now(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        refunded: 0,
      };
      await db().batch([
        ...guard(
          "SELECT payload::jsonb->>'status'='accepted' FROM records WHERE id=? AND owner=?",
          [q.id, owner],
        ),
        ...guard(
          'SELECT stock-reserved>=? FROM inventory WHERE owner=? AND id=?',
          [q.qty, owner, p.id],
        ),
        db()
          .prepare(
            'UPDATE inventory SET reserved=reserved+? WHERE owner=? AND id=?',
          )
          .bind(q.qty, owner, p.id),
        save(owner, 'order', o),
        update(owner, { ...q, status: 'converted', orderId: o.id }),
        audit(owner, profile.staffRole, 'quote.converted', q.number),
      ]);
      return respond(o);
    }
  }
  if (r === 'admin/refunds' && isPost) {
    role(profile, ['owner', 'finance']);
    const o = await record(owner, body.orderId, 'order');
    if (!['confirmed', 'processing', 'shipped', 'completed'].includes(o.status))
      throw new BusinessError('Pesanan belum dibayar.');
    const amount = integer(body.amount, 1, o.total - (o.refunded || 0));
    const reason = str(body.reason, 5, 1000);
    const fingerprint = JSON.stringify([o.id, amount, reason]);
    const previous = await db()
      .prepare('SELECT * FROM idempotency WHERE owner=? AND key=?')
      .bind(owner, str(body.requestId, 10, 100))
      .first<any>();
    if (previous) {
      if (previous.fingerprint !== fingerprint)
        throw new BusinessError('Request refund berbeda.', 409);
      return respond(await record(owner, previous.recordId, 'refund'));
    }
    const refund = {
      id: id(),
      orderId: o.id,
      amount,
      reason,
      status: 'succeeded',
      demo: true,
      createdAt: now(),
    };
    await db().batch([
      ...guard(
        "SELECT COALESCE((payload::jsonb->>'refunded')::int,0)=? FROM records WHERE id=? AND owner=?",
        [o.refunded || 0, o.id, owner],
      ),
      update(owner, { ...o, refunded: (o.refunded || 0) + amount }),
      save(owner, 'refund', refund),
      db()
        .prepare('INSERT INTO idempotency VALUES(?,?,?,?)')
        .bind(owner, body.requestId, fingerprint, refund.id),
      audit(owner, profile.staffRole, 'refund.simulated', reason),
    ]);
    return respond(refund);
  }
  if (path[0] === 'marketing' && path[1] === 'campaigns' && isPost) {
    role(profile, ['owner', 'finance', 'marketing']);
    if (!path[2]) {
      const code = str(body.code, 4, 24).toUpperCase();
      if (!/^[A-Z0-9-]+$/.test(code))
        throw new BusinessError('Format kode promo tidak valid.');
      const name = str(body.name, 3, 100),
        percent = integer(body.percent, 1, 50),
        cap = integer(body.cap),
        budget = integer(body.budget),
        quota = integer(body.quota, 1, 100000);
      const status =
        percent > 5 || cap > 500000 || budget > 5000000
          ? 'pending_approval'
          : 'active';
      await db().batch([
        db()
          .prepare(
            'INSERT INTO campaigns(owner,code,name,status,percent,cap,budget,quota) VALUES(?,?,?,?,?,?,?,?)',
          )
          .bind(owner, code, name, status, percent, cap, budget, quota),
        audit(owner, profile.staffRole, 'campaign.created', code),
      ]);
      return respond({ code, status });
    }
    const code = path[2];
    const c = await db()
      .prepare('SELECT * FROM campaigns WHERE owner=? AND code=?')
      .bind(owner, code)
      .first<any>();
    if (!c) throw new BusinessError('Campaign tidak ditemukan.', 404);
    let status;
    if (path[3] === 'approve') {
      role(profile, ['owner', 'finance']);
      if (c.status !== 'pending_approval')
        throw new BusinessError('Campaign tidak menunggu approval.', 409);
      status = 'active';
    } else {
      if (!['active', 'paused'].includes(c.status))
        throw new BusinessError('Campaign memerlukan approval.', 409);
      status = c.status === 'active' ? 'paused' : 'active';
    }
    await db().batch([
      db()
        .prepare('UPDATE campaigns SET status=? WHERE owner=? AND code=?')
        .bind(status, owner, code),
      audit(owner, profile.staffRole, 'campaign.' + status, code),
    ]);
    return respond({ code, status });
  }
  throw new BusinessError('Endpoint tidak ditemukan.', 404);
}
function respond(data: any, status = 200, extra: Record<string, string> = {}) {
  return Response.json(
    { data, request_id: id() },
    { status, headers: { 'Cache-Control': 'no-store', ...extra } },
  );
}
async function route(req: Request) {
  try {
    return await handle(req);
  } catch (e) {
    console.error('KLIKFIBER API error', e);
    const known = e instanceof BusinessError;
    return Response.json(
      {
        code: known ? 'VALIDATION_ERROR' : 'CONFLICT',
        message: known
          ? e.message
          : 'Perubahan bertabrakan atau layanan belum siap. Muat ulang dan coba lagi.',
        request_id: id(),
      },
      {
        status: known ? e.status : 409,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
export const GET = route;
export const POST = route;
