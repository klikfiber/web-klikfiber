'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { authUrl, authKey } from '@/lib/auth/config';
import { api, useStore } from './store';
import CustomerAuth from './customer-auth';
import { rupiah } from '@/lib/catalog';

const statusLabel: Record<string, string> = {
  pending: 'Menunggu persetujuan',
  approved: 'Aktif',
  rejected: 'Ditolak',
  suspended: 'Dinonaktifkan',
};
const formData = (form: HTMLFormElement) =>
  Object.fromEntries(new FormData(form));
function Activity({ items }: { items: any[] }) {
  return (
    <div className="portal-activity">
      {!items.length ? (
        <p>Belum ada penggunaan kode.</p>
      ) : (
        items.map((x) => (
          <article key={x.id}>
            <strong>{x.name}</strong>
            <span>
              {x.number} · {x.kind === 'rfq' ? 'Penawaran' : 'Pesanan'}
            </span>
            <small>
              {new Date(x.createdAt).toLocaleString('id-ID')} · {x.status}
            </small>
            {x.total > 0 && (
              <span>
                {rupiah(x.total)} · Diskon {rupiah(x.discount)}
              </span>
            )}
          </article>
        ))
      )}
    </div>
  );
}

export function AdminPortal() {
  const [data, setData] = useState<any>(null),
    [loading, setLoading] = useState(true),
    [tab, setTab] = useState('products'),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [edit, setEdit] = useState<any>(null),
    [activities, setActivities] = useState<any[] | null>(null);
  async function load() {
    try {
      setData(await api('portal/admin/overview'));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (edit)
      document
        .getElementById('portal-editor')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [edit]);
  async function action(path: string, body: any) {
    setBusy(true);
    setError('');
    try {
      await api('portal/admin/' + path, body);
      setEdit(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <main className="container page">
        <p role="status">Memuat admin…</p>
      </main>
    );
  if (!data)
    return (
      <main className="portal-login admin-login">
        <Link href="/">← Kembali ke toko</Link>
        <div className="portal-login-card">
          <span className="kicker">KLIKFIBER / MYSHOP</span>
          <h1>Ruang kendali toko.</h1>
          <p>Akses khusus admin KLIKFIBER.</p>
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              try {
                await api('portal/admin/login', formData(e.currentTarget));
                await load();
              } catch (x: any) {
                setError(x.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Email admin
              <input
                type="email"
                name="email"
                autoComplete="username"
                required
                defaultValue="klikfiber@gmail.com"
              />
            </label>
            <label>
              Kata sandi
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
              />
            </label>
            <button className="btn" disabled={busy}>
              {busy ? 'Memeriksa…' : 'Masuk dashboard admin'}
            </button>
          </form>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </div>
      </main>
    );
  return (
    <main className="container page portal-dashboard admin-dashboard">
      <header className="portal-heading">
        <div>
          <span className="kicker">KLIKFIBER / MYSHOP</span>
          <h1>Kelola toko, satu tempat.</h1>
          <p>{data.email}</p>
        </div>
        <button
          className="btn outline"
          onClick={async () => {
            await api('portal/admin/logout', {});
            setData(null);
          }}
        >
          Keluar admin
        </button>
      </header>
      <nav className="portal-tabs" aria-label="Menu admin">
        {[
          ['products', 'Produk & Harga'],
          ['sales', 'Pendaftaran Sales'],
          ['promos', 'Promo'],
        ].map(([v, l]) => (
          <button
            key={v}
            aria-pressed={tab === v}
            onClick={() => {
              setTab(v);
              setEdit(null);
              setActivities(null);
            }}
          >
            {l}
            {v === 'sales' &&
              ` (${data.sales.filter((s: any) => s.status === 'pending').length})`}
          </button>
        ))}
      </nav>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {tab === 'products' && (
        <section className="panel">
          <h2>Katalog toko</h2>
          <p>
            Perubahan produk, harga dan stok langsung digunakan oleh katalog
            publik.
          </p>
          <div className="portal-products">
            {data.products.map((p: any) => (
              <article key={p.id}>
                <img src={p.imageSrc} alt="" />
                <div>
                  <strong>{p.name}</strong>
                  <p>
                    {p.model} · {rupiah(p.price)} · Stok {p.stock}
                  </p>
                </div>
                <button
                  className="btn outline"
                  onClick={() => setEdit({ kind: 'product', ...p })}
                >
                  Edit
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
      {tab === 'sales' && (
        <section className="panel">
          <h2>Mitra sales</h2>
          {!data.sales.length && <p>Belum ada pendaftaran sales.</p>}
          {data.sales.map((s: any) => (
            <article className="portal-sales-row" key={s.id}>
              <div>
                <strong>{s.name}</strong>
                <p>
                  {s.email}
                  <br />
                  {s.phone}
                </p>
                <span className="tiny-pill">{statusLabel[s.status]}</span>
                {s.code && (
                  <p>
                    Kode {s.code} · Diskon {s.discount}% · Batas{' '}
                    {s.max_discount}% / {rupiah(s.cap)}
                  </p>
                )}
              </div>
              <form
                className="portal-approval"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = formData(e.currentTarget);
                  void action('sales', { id: s.id, ...f, status: 'approved' });
                }}
              >
                <label>
                  Batas diskon (%)
                  <input
                    name="maxDiscount"
                    type="number"
                    min="0"
                    max="50"
                    required
                    defaultValue={s.max_discount}
                  />
                </label>
                <label>
                  Maksimal potongan (Rp)
                  <input
                    name="cap"
                    type="number"
                    min="0"
                    max="10000000"
                    required
                    defaultValue={s.cap}
                  />
                </label>
                <button className="btn" disabled={busy}>
                  {s.status === 'approved' ? 'Simpan batas' : 'Setujui sales'}
                </button>
                <button
                  className="btn outline"
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    action('sales', {
                      id: s.id,
                      status: s.status === 'pending' ? 'rejected' : 'suspended',
                      maxDiscount: s.max_discount,
                      cap: s.cap,
                    })
                  }
                >
                  {s.status === 'pending' ? 'Tolak' : 'Nonaktifkan'}
                </button>
                {s.code && (
                  <button
                    className="btn outline"
                    type="button"
                    onClick={async () => {
                      try {
                        setActivities(
                          await api('portal/admin/activity?code=' + s.code),
                        );
                      } catch (e: any) {
                        setError(e.message);
                      }
                    }}
                  >
                    Lihat penggunaan kode
                  </button>
                )}
              </form>
            </article>
          ))}
          {activities && (
            <section>
              <h3>Penggunaan referral</h3>
              <Activity items={activities} />
            </section>
          )}
        </section>
      )}
      {tab === 'promos' && (
        <section className="panel">
          <div className="portal-heading">
            <h2>Promo toko</h2>
            <button
              className="btn"
              onClick={() =>
                setEdit({
                  kind: 'promo',
                  code: '',
                  name: '',
                  percent: 5,
                  cap: 300000,
                  active: true,
                })
              }
            >
              Buat promo
            </button>
          </div>
          <p>
            Promo aktif bisa digunakan pembeli pada checkout atau penawaran.
          </p>
          {data.promos.map((p: any) => (
            <article className="portal-sales-row" key={p.code}>
              <div>
                <strong>
                  {p.code} — {p.name}
                </strong>
                <p>
                  {p.percent}% · Maks. {rupiah(p.cap)} ·{' '}
                  {p.active ? 'Aktif' : 'Nonaktif'}
                </p>
              </div>
              <button
                className="btn outline"
                onClick={() => setEdit({ kind: 'promo', ...p })}
              >
                Edit promo
              </button>
            </article>
          ))}
        </section>
      )}
      {edit && (
        <section className="panel portal-editor" aria-label="Editor" id="portal-editor">
          <div className="portal-heading">
            <h2>{edit.kind === 'product' ? 'Edit produk' : 'Edit promo'}</h2>
            <button className="btn outline" onClick={() => setEdit(null)}>
              Tutup
            </button>
          </div>
          <form
            className="stack"
            key={edit.id || edit.code || 'new'}
            onSubmit={(e) => {
              e.preventDefault();
              const f = formData(e.currentTarget);
              void action(edit.kind === 'product' ? 'product' : 'promo', {
                ...f,
                id: edit.id,
                active: f.active === 'on',
              });
            }}
          >
            <label>
              Nama
              <input name="name" required defaultValue={edit.name} />
            </label>
            {edit.kind === 'product' ? (
              <>
                <label>
                  SKU / Model
                  <input name="model" required defaultValue={edit.model} />
                </label>
                <label>
                  Harga (Rp)
                  <input
                    name="price"
                    type="number"
                    min="0"
                    max="1000000000"
                    required
                    defaultValue={edit.price}
                  />
                </label>
                <label>
                  Stok
                  <input
                    name="stock"
                    type="number"
                    min="0"
                    max="1000000"
                    required
                    defaultValue={edit.stock}
                  />
                </label>
                <label>
                  Deskripsi
                  <textarea
                    name="description"
                    rows={5}
                    required
                    defaultValue={edit.description}
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  Kode promo
                  <input
                    name="code"
                    pattern="[A-Za-z0-9]{3,20}"
                    required
                    defaultValue={edit.code}
                  />
                </label>
                <label>
                  Diskon (%)
                  <input
                    name="percent"
                    type="number"
                    min="1"
                    max="50"
                    required
                    defaultValue={edit.percent}
                  />
                </label>
                <label>
                  Maksimal potongan (Rp)
                  <input
                    name="cap"
                    type="number"
                    min="1"
                    max="10000000"
                    required
                    defaultValue={edit.cap}
                  />
                </label>
                <label>
                  <input
                    name="active"
                    type="checkbox"
                    defaultChecked={edit.active}
                  />{' '}
                  Promo aktif
                </label>
              </>
            )}
            <button className="btn" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan perubahan'}
            </button>
          </form>
        </section>
      )}
    </main>
  );
}

export function SalesArea() {
  const s = useStore();
  const [profile, setProfile] = useState<any>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [items, setItems] = useState<any[]>([]),
    [notice, setNotice] = useState('');
  async function load() {
    setError('');
    try {
      const p = await api('portal/sales/profile');
      setProfile(p);
      if (p?.status === 'approved')
        setItems(await api('portal/sales/activity'));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (s.profile) void load();
    else setLoading(false);
  }, [s.profile]);
  const logout = async () => {
    await createBrowserClient(authUrl, authKey).auth.signOut();
    await s.refresh();
    setProfile(null);
  };
  if (!s.profile)
    return (
      <main className="portal-login sales-login">
        <Link href="/">← Kembali ke toko</Link>
        <div className="portal-login-card">
          <span className="kicker">KLIKFIBER / SALES AREA</span>
          <h1>Kenalan. Gabung. Bertumbuh.</h1>
          <p>
            Jadi mitra sales dan bagikan penawaran lewat kode referral kamu.
          </p>
          <CustomerAuth googleOnly done={() => location.reload()} />
          <div className="sales-steps">
            <span>1. Masuk Google</span>
            <span>2. Isi data diri</span>
            <span>3. Persetujuan admin</span>
          </div>
        </div>
      </main>
    );
  if (loading)
    return (
      <main className="container page">
        <p role="status">Memuat sales area…</p>
      </main>
    );
  return (
    <main className="container page portal-dashboard sales-dashboard">
      <header className="portal-heading">
        <div>
          <span className="kicker">KLIKFIBER / SALES AREA</span>
          <h1>
            {profile?.status === 'approved'
              ? `Halo, ${profile.name}!`
              : 'Pendaftaran mitra sales'}
          </h1>
        </div>
        <button className="btn outline" onClick={logout}>
          Keluar
        </button>
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!profile ? (
        <form
          className="panel stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              await api('portal/sales/profile', formData(e.currentTarget));
              await load();
            } catch (x: any) {
              setError(x.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>Lengkapi data diri</h2>
          <label>
            Nama lengkap
            <input
              name="name"
              minLength={2}
              maxLength={150}
              required
              defaultValue={s.profile.name}
            />
          </label>
          <label>
            Nomor WhatsApp
            <input
              type="tel"
              name="phone"
              placeholder="081234567890"
              required
              pattern="(\+62|62|0)[0-9]{8,13}"
            />
          </label>
          <label>
            Email Google
            <input type="email" readOnly value={s.profile.email} />
          </label>
          <p>
            Admin akan memeriksa pendaftaranmu. Dashboard dan kode referral
            tersedia setelah disetujui.
          </p>
          <button className="btn" disabled={busy}>
            {busy ? 'Mengirim…' : 'Ajukan pendaftaran sales'}
          </button>
        </form>
      ) : profile.status !== 'approved' ? (
        <section className="panel sales-pending">
          <span className="tiny-pill">{statusLabel[profile.status]}</span>
          <h2>
            {profile.status === 'pending'
              ? 'Pendaftaranmu sudah masuk.'
              : 'Akses sales belum aktif.'}
          </h2>
          <p>
            {profile.status === 'pending'
              ? 'Tunggu persetujuan admin. Kode referral akan tersedia setelah akunmu aktif.'
              : 'Hubungi admin KLIKFIBER untuk informasi pendaftaranmu.'}
          </p>
          <p>
            {profile.name}
            <br />
            {profile.email}
            <br />
            {profile.phone}
          </p>
          <button className="btn" onClick={load}>
            Periksa status
          </button>
        </section>
      ) : (
        <div className="sales-grid">
          <section className="panel">
            <span className="kicker">KODE REFERRAL KAMU</span>
            <h2>{profile.code}</h2>
            <button
              className="btn"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `${location.origin}/penawaran?ref=${profile.code}`,
                  );
                  setNotice('Tautan referral berhasil disalin.');
                } catch {
                  setNotice(`Kode referral: ${profile.code}`);
                }
              }}
            >
              Salin tautan referral
            </button>
            <p>Pembeli juga bisa memasukkan kode ini pada checkout.</p>
            <form
              className="stack"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError('');
                try {
                  await api('portal/sales/discount', formData(e.currentTarget));
                  await load();
                  setNotice('Diskon berhasil diperbarui.');
                } catch (x: any) {
                  setError(x.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Diskon untuk pembeli (%)
                <input
                  type="number"
                  name="discount"
                  min="0"
                  max={profile.max_discount}
                  required
                  defaultValue={profile.discount}
                />
              </label>
              <p>
                Batas dari admin: {profile.max_discount}%. Maksimal potongan{' '}
                {rupiah(profile.cap)} per transaksi.
              </p>
              <button className="btn" disabled={busy}>
                Simpan diskon
              </button>
            </form>
          </section>
          <section className="panel">
            <h2>Penggunaan kode</h2>
            <strong className="sales-count">{items.length}</strong>
            <p>Penawaran dan pesanan dengan kode kamu.</p>
            <button className="btn outline" onClick={load}>
              Perbarui aktivitas
            </button>
            <Activity items={items} />
          </section>
        </div>
      )}
    </main>
  );
}
