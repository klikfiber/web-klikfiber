import assert from 'node:assert/strict';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
process.loadEnvFile('.env.hostinger');
const base = process.env.TEST_BASE_URL || 'http://localhost:3002';
const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  prepare: false,
  max: 1,
  onnotice: () => {},
});
const fixture = 'qc-' + randomUUID();
let cookie = '';
async function request(path, body, authenticated = true) {
  const r = await fetch(base + '/api/v1/' + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(authenticated && cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  return { r, j: await r.json() };
}
try {
  assert.equal(
    (await request('portal/admin/overview', null, false)).r.status,
    401,
  );
  assert.equal(
    (await request('portal/admin/product', { id: 'x' }, false)).r.status,
    401,
  );
  assert.equal((await request('admin/overview', null, false)).r.status, 410);
  assert.equal(
    (await request('portal/sales/activity', null, false)).r.status,
    401,
  );
  assert.equal(
    (
      await request(
        'portal/admin/login',
        { email: 'not-admin@example.com', password: 'invalid' },
        false,
      )
    ).r.status,
    401,
  );
  const login = await request(
    'portal/admin/login',
    { email: 'klikfiber@gmail.com', password: process.env.TEST_ADMIN_PASSWORD },
    false,
  );
  assert.equal(login.r.status, 200);
  cookie = login.r.headers.get('set-cookie').split(';')[0];
  const overview = await request('portal/admin/overview');
  assert.equal(overview.r.status, 200);
  assert.ok(overview.j.data.products.length > 0);
  const p = overview.j.data.products[0];
  assert.equal((await request('portal/admin/product', p)).r.status, 200);
  const listing = await request('products', null, false);
  assert.equal(listing.j.data.find((x) => x.id === p.id).price, p.price);
  await sql`INSERT INTO portal_sales(id,email,name,phone) VALUES(${fixture},'qc@example.invalid','QC Portal','081234567890')`;
  assert.equal(
    (await sql`SELECT code,status FROM portal_sales WHERE id=${fixture}`)[0]
      .code,
    null,
  );
  assert.equal(
    (
      await request('portal/admin/sales', {
        id: fixture,
        status: 'approved',
        maxDiscount: 5,
        cap: 100000,
      })
    ).r.status,
    200,
  );
  const [approved] = await sql`SELECT * FROM portal_sales WHERE id=${fixture}`;
  assert.equal(approved.status, 'approved');
  assert.match(approved.code, /^KFS[A-Z0-9]+$/);
  assert.equal(
    (
      await request('portal/admin/sales', {
        id: fixture,
        status: 'approved',
        maxDiscount: 99,
        cap: 100000,
      })
    ).r.status,
    422,
  );
  assert.equal(
    (
      await request('portal/admin/sales', {
        id: fixture,
        status: 'suspended',
        maxDiscount: 5,
        cap: 100000,
      })
    ).r.status,
    200,
  );
  assert.equal(
    (await sql`SELECT status FROM portal_sales WHERE id=${fixture}`)[0].status,
    'suspended',
  );
  assert.equal((await request('portal/admin/logout', {})).r.status, 200);
  assert.equal((await request('portal/admin/overview')).r.status, 401);
  console.log(
    'PASS: admin allowlist/login/logout, protected endpoints, persistent product catalog, pending/approval/suspension and discount limit validation.',
  );
} finally {
  await sql`DELETE FROM portal_sales WHERE id=${fixture}`;
  await sql.end();
}
