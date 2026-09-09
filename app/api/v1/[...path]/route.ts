import { env } from 'cloudflare:workers';
import { products } from '@/lib/catalog';
import { BusinessError, validAddress, priceCart } from '@/lib/commerce';
const schema = [
  `CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, profile TEXT NOT NULL, expires INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, owner TEXT NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS records_owner_kind ON records(owner,kind)`,
  `CREATE TABLE IF NOT EXISTS inventory (owner TEXT NOT NULL,id TEXT NOT NULL,stock INTEGER NOT NULL CHECK(stock>=0),reserved INTEGER NOT NULL DEFAULT 0 CHECK(reserved>=0 AND reserved<=stock),PRIMARY KEY(owner,id))`,
  `CREATE TABLE IF NOT EXISTS campaigns (owner TEXT NOT NULL,code TEXT NOT NULL,name TEXT NOT NULL,status TEXT NOT NULL,percent INTEGER NOT NULL,cap INTEGER NOT NULL,budget INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0,reserved INTEGER NOT NULL DEFAULT 0,quota INTEGER NOT NULL,countUsed INTEGER NOT NULL DEFAULT 0,countReserved INTEGER NOT NULL DEFAULT 0,minSubtotal INTEGER NOT NULL DEFAULT 100000,PRIMARY KEY(owner,code),CHECK(used+reserved<=budget AND countUsed+countReserved<=quota))`,
  `CREATE TABLE IF NOT EXISTS idempotency (owner TEXT NOT NULL,key TEXT NOT NULL,fingerprint TEXT NOT NULL,recordId TEXT NOT NULL,PRIMARY KEY(owner,key))`,
  `CREATE TABLE IF NOT EXISTS guards (id TEXT PRIMARY KEY,ok INTEGER NOT NULL CHECK(ok=1))`,
];
let initialized: Promise<any> | undefined;
const db = () => env.DB;
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
      'SELECT payload FROM records WHERE owner=? AND kind=? ORDER BY rowid DESC LIMIT 200',
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
          'INSERT OR IGNORE INTO inventory(owner,id,stock) VALUES(?,?,?)',
        )
        .bind(owner, p.id, p.stock),
    ),
    db()
      .prepare(
        "INSERT OR IGNORE INTO campaigns(owner,code,name,status,percent,cap,budget,quota) VALUES(?,'KLIK5','Kebutuhan Fiber Lebih Hemat','active',5,300000,5000000,100)",
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
      "SELECT json_extract(payload,'$.status')='awaiting_payment' FROM records WHERE id=? AND owner=?",
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
    if (origin && origin !== url.origin)
      throw new BusinessError('Origin tidak diizinkan.', 403);
    if (!req.headers.get('content-type')?.includes('application/json'))
      throw new BusinessError('Content-Type harus application/json.', 415);
  }
  let body: any = {};
  if (isPost) {
    const text = await req.text();
    if (text.length > 20000)
      throw new BusinessError('Request terlalu besar.', 413);
    try {
      body = JSON.parse(text);
    } catch {
      throw new BusinessError('JSON tidak valid.', 400);
    }
  }
  const raw = req.headers
    .get('cookie')
    ?.match(/(?:^|;\s*)kf_session=([a-f0-9-]{36})/)?.[1];
  let session = raw
    ? await db()
        .prepare('SELECT * FROM sessions WHERE id=? AND expires>?')
        .bind(raw, Date.now())
        .first<any>()
    : null;
  if (path.join('/') === 'auth/demo' && isPost) {
    if (session) return respond(JSON.parse(session.profile));
    const sid = id();
    const profile = { name: 'Budi', id: id(), demo: true };
    await db()
      .prepare('INSERT INTO sessions VALUES(?,?,?)')
      .bind(sid, JSON.stringify(profile), Date.now() + 7 * 86400000)
      .run();
    await seed(sid);
    return respond(profile, 200, {
      'Set-Cookie': `kf_session=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${url.protocol === 'https:' ? '; Secure' : ''}`,
    });
  }
  if (path[0] === 'products')
    return respond(
      path[1] ? products.find((p) => p.id === path[1]) || null : products,
    );
  if (!session)
    throw new BusinessError('Silakan masuk ke akun uji terlebih dahulu.', 401);
  const owner = session.id as string;
  const profile = JSON.parse(session.profile);
  const r = path.join('/');
  if (r === 'auth/logout' && isPost) {
    await db().prepare('DELETE FROM sessions WHERE id=?').bind(owner).run();
    return respond({ ok: true }, 200, {
      'Set-Cookie': 'kf_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
    });
  }
  if (r === 'auth/demo-role' && isPost) {
    if (!profile.demo)
      throw new BusinessError('Peran uji tidak tersedia.', 403);
    if (!['operations', 'marketing', 'finance', 'owner'].includes(body.role))
      throw new BusinessError('Peran tidak valid.');
    profile.staffRole = body.role;
    await db().batch([
      db()
        .prepare('UPDATE sessions SET profile=? WHERE id=?')
        .bind(JSON.stringify(profile), owner),
      audit(
        owner,
        body.role,
        'demo.role',
        'Perubahan peran dalam tenant uji sendiri',
      ),
    ]);
    return respond(profile);
  }
  if (r === 'me') {
    if (isPost) {
      profile.name = str(body.name, 2, 100);
      await db()
        .prepare('UPDATE sessions SET profile=? WHERE id=?')
        .bind(JSON.stringify(profile), owner)
        .run();
    }
    return respond(profile);
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
    const campaign = code
      ? await db()
          .prepare('SELECT * FROM campaigns WHERE owner=? AND code=?')
          .bind(owner, code)
          .first()
      : null;
    if (code && !campaign)
      throw new BusinessError('Kode promo tidak ditemukan.');
    const totals = priceCart(body.items, body.shipping, campaign);
    for (const p of totals.items) {
      const stock = await db()
        .prepare(
          'SELECT stock-reserved AS available FROM inventory WHERE owner=? AND id=?',
        )
        .bind(owner, p.id)
        .first<any>();
      if (!stock || stock.available < p.qty)
        throw new BusinessError('Stok ' + p.name + ' tidak mencukupi.', 409);
    }
    const q = {
      id: id(),
      ...totals,
      address,
      code,
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
          "SELECT json_extract(payload,'$.status')='awaiting_payment' FROM records WHERE owner=? AND id=?",
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
        `<!doctype html><html lang="id"><meta charset="utf-8"><title>Invoice ${esc(o.number)}</title><style>body{font:16px Arial;color:#0b1f3a;max-width:850px;margin:50px auto;padding:25px}h1{color:#0098b8}table{width:100%;border-collapse:collapse}td,th{padding:15px;text-align:left;border-bottom:1px solid #ddd}.note{background:#eef7fa;padding:15px}</style><h1>KLIKFIBER</h1><h2>Invoice Penjualan Uji</h2><p>${esc(o.number)} · ${esc(o.paidAt)}</p><p>${esc(o.address.name)}<br>${esc(o.address.street)}, ${esc(o.address.city)}</p><table><tr><th>Produk</th><th>Jumlah</th><th>Harga</th></tr>${o.items.map((p: any) => `<tr><td>${esc(p.name)}</td><td>${p.qty}</td><td>Rp ${(p.qty * p.price).toLocaleString('id-ID')}</td></tr>`).join('')}</table><p>Subtotal: Rp ${o.subtotal.toLocaleString('id-ID')}<br>Diskon: Rp ${o.discount.toLocaleString('id-ID')}<br>Ongkir: Rp ${o.shippingCost.toLocaleString('id-ID')}</p><h2>Total Rp ${o.total.toLocaleString('id-ID')}</h2><p class="note">SIMULASI — bukan bukti pembayaran nyata atau faktur pajak.</p><p>klikfiber@gmail.com</p></html>`,
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
    const q = {
      id: id(),
      number: 'RFQ-' + id().slice(0, 8).toUpperCase(),
      company: str(body.company, 2, 150),
      name: str(body.name, 2, 100),
      email: str(body.email, 3, 200),
      phone: str(body.phone, 9, 16),
      city: str(body.city, 2, 100),
      requirements: str(body.requirements, 10, 3000),
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
        "SELECT json_extract(payload,'$.status')='offered' AND json_extract(payload,'$.version')=? FROM records WHERE id=? AND owner=?",
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
        "SELECT json_extract(payload,'$.status')=? FROM records WHERE id=? AND owner=?",
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
          "SELECT json_extract(payload,'$.version')=? FROM records WHERE owner=? AND id=?",
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
          "SELECT json_extract(payload,'$.status')='accepted' FROM records WHERE id=? AND owner=?",
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
        "SELECT json_extract(payload,'$.refunded')=? FROM records WHERE id=? AND owner=?",
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
