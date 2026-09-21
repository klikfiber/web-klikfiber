'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { authUrl, authKey } from '@/lib/auth/config';
import { api, useStore } from './store';
import CustomerAuth from './customer-auth';
import { rupiah, categories } from '@/lib/catalog';
import {
  Bell,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  PackageSearch,
  Search,
  ShoppingBag,
  Tag,
  TrendingUp,
  UsersRound,
} from 'lucide-react';

const readImage = (file: File) =>
  new Promise<string>((resolve, reject) => {
    if (file.size > 4 * 1024 * 1024) {
      reject(new Error('Ukuran gambar maksimal 4 MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Format gambar tidak dapat dibaca. Gunakan JPG, PNG, atau WebP.'));
      image.onload = () => {
        const scale = Math.min(1, 1920 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) { reject(new Error('Gambar tidak dapat diproses.')); return; }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        let result = canvas.toDataURL('image/webp', 0.86);
        if (result.length > 1300000) result = canvas.toDataURL('image/webp', 0.65);
        if (result.length > 1300000) { reject(new Error('Gambar terlalu besar. Gunakan foto dengan resolusi lebih kecil.')); return; }
        resolve(result);
      };
      image.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Gambar tidak dapat dibaca.'));
    reader.readAsDataURL(file);
  });

function BannerManager({
  banners,
  busy,
  onSave,
}: {
  banners: any[];
  busy: boolean;
  onSave: (banner: any) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<any>(null);
  const [fileError, setFileError] = useState('');
  const pick = async (key: 'desktopImage' | 'mobileImage', file?: File) => {
    if (!file) return;
    setFileError('');
    try {
      const image = await readImage(file);
      setDraft((current: any) => ({ ...current, [key]: image }));
    } catch (error: any) {
      setFileError(error.message);
    }
  };
  return (
    <section className="panel banner-manager">
      <div className="portal-heading">
        <div>
          <h2>Banner homepage</h2>
          <p>Empat slide, masing-masing dengan gambar desktop dan mobile.</p>
        </div>
      </div>
      <div className="banner-admin-grid">
        {banners.map((banner, index) => (
          <article className="banner-admin-card" key={banner.id}>
            <div className="banner-admin-preview">
              <img src={banner.desktopImage} alt="" />
              <span>Banner {index + 1}</span>
            </div>
            <div>
              <strong>Banner {index + 1}</strong>
              <small>{banner.active ? 'Aktif di homepage' : 'Disembunyikan'}</small>
            </div>
            <button className="btn outline" onClick={() => setDraft({ ...banner })}>
              Edit banner
            </button>
          </article>
        ))}
      </div>
      {draft && (
        <section className="panel portal-editor banner-editor" id="portal-editor" aria-label="Editor banner">
          <div className="portal-heading">
            <div><h2>Edit {'banner ' + draft.id.replace('hero-','')}</h2><p>Seluruh gambar ditampilkan utuh. Masukkan tulisan promosi langsung di desain gambar.</p></div>
            <button className="btn outline" onClick={() => setDraft(null)}>Tutup</button>
          </div>
          <form className="stack" onSubmit={async (event) => {
            event.preventDefault();
            if(await onSave(draft)) setDraft(null);
          }}>
            <div className="banner-upload-grid">
              <label className="banner-upload">
                <span><strong>Versi desktop</strong><small>1600 × 640 px · rasio 5:2 · JPG, PNG, atau WebP</small></span>
                <img src={draft.desktopImage} alt="Pratinjau banner desktop" />
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void pick('desktopImage', event.target.files?.[0])} />
              </label>
              <label className="banner-upload mobile-preview">
                <span><strong>Versi mobile</strong><small>800 × 400 px · rasio 2:1 · JPG, PNG, atau WebP</small></span>
                <img src={draft.mobileImage} alt="Pratinjau banner mobile" />
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void pick('mobileImage', event.target.files?.[0])} />
              </label>
            </div>
            {fileError && <p className="error" role="alert">{fileError}</p>}
            <div className="banner-copy-grid">
              <label>Tautan saat gambar diklik<input value={draft.href} maxLength={200} required onChange={(e) => setDraft({ ...draft, href: e.target.value })} /></label>
              <label className="banner-active"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Tampilkan banner</label>
            </div>
            <button className="btn" disabled={busy || !!fileError}>{busy ? 'Menyimpan…' : 'Simpan dan tampilkan'}</button>
          </form>
        </section>
      )}
    </section>
  );
}

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
              {new Date(x.createdAt).toLocaleString('id-ID')} ·{' '}
              {orderStatus[x.status] || statusLabel[x.status] || x.status}
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

const orderStatus: Record<string, string> = {
  awaiting_payment: 'Menunggu pembayaran',
  confirmed: 'Dibayar',
  processing: 'Diproses',
  shipped: 'Dikirim',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  expired: 'Kedaluwarsa',
};

function RevenueChart({ daily }: { daily: any[] }) {
  const values = daily.map((item) => Number(item.revenue || 0));
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => ({
    x: 36 + index * (564 / Math.max(values.length - 1, 1)),
    y: 174 - (value / max) * 128,
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `36,174 ${line} ${points.at(-1)?.x || 600},174`;
  return (
    <div className="admin-chart-wrap">
      <svg
        className="admin-chart"
        viewBox="0 0 640 220"
        role="img"
        aria-label={`Kurva omzet ${daily.length} hari terakhir`}
      >
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff8a1f" stopOpacity=".28" />
            <stop offset="1" stopColor="#ff8a1f" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[46, 88, 130, 174].map((y) => (
          <line key={y} x1="36" x2="600" y1={y} y2={y} className="chart-grid" />
        ))}
        <polygon points={area} fill="url(#revenueFill)" />
        <polyline points={line} className="chart-line" />
        {points.map((point, index) => (
          <g key={daily[index].date}>
            <circle cx={point.x} cy={point.y} r="5" className="chart-dot" />
            {(daily.length <= 7 ||
              index % 5 === 0 ||
              index === daily.length - 1) && (
              <text x={point.x} y="205" textAnchor="middle">
                {daily[index].label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function OrdersTable({ orders }: { orders: any[] }) {
  if (!orders.length)
    return (
      <div className="admin-empty">
        <PackageSearch size={34} />
        <strong>Belum ada pesanan</strong>
        <span>Pesanan baru akan muncul otomatis di sini.</span>
      </div>
    );
  return (
    <div className="admin-order-list">
      {orders.map((order) => (
        <article key={order.id}>
          <div className="order-icon">
            <ShoppingBag size={19} />
          </div>
          <div className="order-main">
            <strong>{order.number}</strong>
            <span>
              {order.name} · {order.itemCount} item
            </span>
            <small>
              {String(order.paymentProvider || 'legacy').toUpperCase()}
              {order.paymentType ? ` · ${order.paymentType}` : ''}
            </small>
          </div>
          <div className="order-value">
            <strong>{rupiah(order.total)}</strong>
            <span className={`order-status status-${order.status}`}>
              {orderStatus[order.status] || order.status}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function AdminOverview({ data }: { data: any }) {
  const a = data.analytics;
  const [range, setRange] = useState<7 | 30>(7);
  const daily = range === 7 ? a.daily7 : a.daily30;
  const rangeRevenue = daily.reduce(
    (sum: number, item: any) => sum + item.revenue,
    0,
  );
  const metric = [
    [
      'Total omzet',
      rupiah(a.totalRevenue),
      'Transaksi lunas',
      CircleDollarSign,
    ],
    ['Total pesanan', a.totalOrders, 'Semua pesanan', ClipboardList],
    ['Pesanan hari ini', a.todayOrders, 'Data hari ini', ShoppingBag],
    ['Menunggu bayar', a.awaitingPayment, 'Perlu ditindaklanjuti', Bell],
  ];
  return (
    <>
      <section className="admin-metrics" aria-label="Ringkasan toko">
        {metric.map(([label, value, hint, Icon]: any) => (
          <article key={label}>
            <div className="metric-icon">
              <Icon size={21} />
            </div>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{hint}</small>
          </article>
        ))}
      </section>
      <div className="admin-overview-grid">
        <section className="admin-card revenue-card">
          <header>
            <div>
              <span className="admin-eyebrow">PERFORMA TOKO</span>
              <h2>Ringkasan penjualan</h2>
              <p>Riwayat omzet transaksi lunas.</p>
            </div>
            <div className="chart-range" aria-label="Rentang grafik">
              {[7, 30].map((days) => (
                <button
                  key={days}
                  aria-pressed={range === days}
                  onClick={() => setRange(days as 7 | 30)}
                >
                  {days} hari
                </button>
              ))}
            </div>
          </header>
          <div className="chart-summary">
            <div>
              <span>Omzet {range} hari</span>
              <strong>{rupiah(rangeRevenue)}</strong>
            </div>
            <div>
              <span>Pesanan {range} hari</span>
              <strong>
                {daily.reduce((sum: number, d: any) => sum + d.orders, 0)}
              </strong>
            </div>
            <div>
              <span>Rata-rata harian</span>
              <strong>{rupiah(Math.round(rangeRevenue / range))}</strong>
            </div>
          </div>
          <RevenueChart daily={daily} />
        </section>
        <section className="admin-card recent-card">
          <header>
            <div>
              <span className="admin-eyebrow">AKTIVITAS</span>
              <h2>Pesanan terbaru</h2>
              <p>Order yang baru masuk.</p>
            </div>
          </header>
          <OrdersTable orders={a.recentOrders.slice(0, 6)} />
        </section>
      </div>
      <section className="admin-health">
        <article>
          <Boxes size={22} />
          <div>
            <strong>{data.products.length} produk</strong>
            <span>{a.lowStock} stok perlu diperhatikan</span>
          </div>
        </article>
        <article>
          <UsersRound size={22} />
          <div>
            <strong>{a.activeSales} sales aktif</strong>
            <span>
              {data.sales.filter((s: any) => s.status === 'pending').length}{' '}
              menunggu persetujuan
            </span>
          </div>
        </article>
        <article>
          <Tag size={22} />
          <div>
            <strong>
              {data.promos.filter((p: any) => p.active).length} promo aktif
            </strong>
            <span>Siap digunakan saat checkout</span>
          </div>
        </article>
      </section>
    </>
  );
}

export function AdminPortal() {
  const [data, setData] = useState<any>(null),
    [loading, setLoading] = useState(true),
    [tab, setTab] = useState('dashboard'),
    [query, setQuery] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [notificationsOpen, setNotificationsOpen] = useState(false),
    [edit, setEdit] = useState<any>(null),
    [activities, setActivities] = useState<any[] | null>(null);
  async function load(showError = false) {
    try {
      setData(await api('portal/admin/overview'));
      return true;
    } catch (e: any) {
      setData(null);
      if (showError) setError(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => {
      void api('portal/admin/overview')
        .then(setData)
        .catch(() => undefined);
    }, 30000);
    return () => window.clearInterval(timer);
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
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
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
                await load(true);
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
  const navigation = [
    ['dashboard', 'Dashboard', LayoutDashboard],
    ['products', 'Produk', Boxes],
    ['banners', 'Banner Homepage', ImageIcon],
    ['orders', 'Pesanan', ClipboardList],
    ['sales', 'Sales & Referral', UsersRound],
    ['promos', 'Voucher Promo', Tag],
    ['settings','Media Sosial',UsersRound],
  ];
  const pageTitle: Record<string, [string, string]> = {
    dashboard: ['Dashboard', 'Pantau performa toko dan operasional terbaru.'],
    products: ['Produk', 'Kelola harga, stok, dan informasi katalog.'],
    banners: ['Banner Homepage', 'Kelola empat banner desktop dan mobile.'],
    orders: ['Pesanan', 'Pantau transaksi pelanggan dari satu tempat.'],
    sales: ['Sales & Referral', 'Setujui sales dan atur batas diskonnya.'],
    promos: ['Voucher Promo', 'Kelola program promo untuk pelanggan.'],
    settings:['Media Sosial','Atur Instagram dan TikTok yang ditampilkan di footer.'],
  };
  const changeTab = (value: string) => {
    setTab(value);
    setEdit(null);
    setActivities(null);
    setQuery('');
  };
  return (
    <main className="portal-dashboard admin-dashboard admin-app">
      <aside className="admin-sidebar">
        <Link href="/" className="admin-brand">
          <span>K</span>
          <div>
            <strong>KLIKFIBER</strong>
            <small>MYSHOP</small>
          </div>
        </Link>
        <nav aria-label="Menu admin">
          {navigation.map(([value, label, Icon]: any) => (
            <button
              key={value}
              aria-pressed={tab === value}
              onClick={() => changeTab(value)}
            >
              <Icon size={19} /> <span>{label}</span>
              {value === 'sales' &&
                data.sales.some((s: any) => s.status === 'pending') && (
                  <b>
                    {
                      data.sales.filter((s: any) => s.status === 'pending')
                        .length
                    }
                  </b>
                )}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-foot">
          <div className="admin-user">
            <span>AK</span>
            <div>
              <strong>Admin Toko</strong>
              <small>{data.email}</small>
            </div>
          </div>
          <button
            onClick={async () => {
              await api('portal/admin/logout', {});
              setData(null);
            }}
          >
            <LogOut size={18} /> Keluar admin
          </button>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <label>
            <Search size={18} />
            <input
              aria-label="Cari data dashboard"
              placeholder="Cari produk atau pesanan…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div>
            <button
              aria-label="Notifikasi"
              aria-expanded={notificationsOpen}
              onClick={() => setNotificationsOpen((open) => !open)}
            >
              <Bell size={19} />
              {data.analytics.notifications.length > 0 && (
                <b>{data.analytics.notifications.length}</b>
              )}
            </button>
            {notificationsOpen && (
              <section
                className="notification-panel"
                aria-label="Notifikasi toko"
              >
                <header>
                  <strong>Notifikasi</strong>
                  <span>{data.analytics.notifications.length} terbaru</span>
                </header>
                {!data.analytics.notifications.length && (
                  <p>Semua aktivitas sudah aman.</p>
                )}
                {data.analytics.notifications.map((notice: any) => (
                  <button
                    key={notice.id}
                    onClick={() => {
                      changeTab(notice.type);
                      setNotificationsOpen(false);
                    }}
                  >
                    <span>
                      <Bell size={16} />
                    </span>
                    <div>
                      <strong>{notice.title}</strong>
                      <small>{notice.detail}</small>
                    </div>
                  </button>
                ))}
              </section>
            )}
            <span className="admin-avatar">AK</span>
            <p>
              <strong>Admin Toko</strong>
              <small>Administrator</small>
            </p>
          </div>
        </header>
        <div className="admin-content">
          <header className="admin-page-heading">
            <div>
              <span className="admin-eyebrow">OPERASIONAL TOKO</span>
              <h1>{pageTitle[tab][0]}</h1>
              <p>{pageTitle[tab][1]}</p>
            </div>
            <button className="admin-refresh" onClick={() => load(true)}>
              <TrendingUp size={17} /> Perbarui data
            </button>
          </header>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {tab === 'dashboard' && <AdminOverview data={data} />}
          {tab === 'settings' && <section className="panel"><h2>Terhubung dengan pelanggan</h2><p>Isi tautan akun resmi. Kosongkan untuk menyembunyikannya dari footer.</p><form className="stack" onSubmit={e=>{e.preventDefault();void action('settings',formData(e.currentTarget));}}><label>Instagram<input type="url" name="instagram" placeholder="https://www.instagram.com/akun-anda/" defaultValue={data.settings?.instagram || ''}/></label><label>TikTok<input type="url" name="tiktok" placeholder="https://www.tiktok.com/@akun-anda" defaultValue={data.settings?.tiktok || ''}/></label><button className="btn" disabled={busy}>Simpan media sosial</button></form></section>}
          {tab === 'products' && (
            <section className="panel">
              <h2>Katalog toko</h2>
              <p>
                Perubahan produk, harga dan stok langsung digunakan oleh katalog
                publik.
              </p>
              <div className="portal-products">
                {data.products
                  .filter((p: any) =>
                    `${p.name} ${p.model}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((p: any) => (
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
          {tab === 'banners' && (
            <BannerManager
              banners={data.banners || []}
              busy={busy}
              onSave={(banner) => action('banner', banner)}
            />
          )}
          {tab === 'orders' && (
            <section className="admin-card orders-page-card">
              <div className="section-heading">
                <div>
                  <h2>Semua pesanan</h2>
                  <p>{data.analytics.totalOrders} transaksi tercatat.</p>
                </div>
                <span className="live-pill">
                  <i /> Data realtime
                </span>
              </div>
              <OrdersTable
                orders={data.analytics.recentOrders.filter((order: any) =>
                  `${order.number} ${order.name}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )}
              />
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
                      void action('sales', {
                        id: s.id,
                        ...f,
                        status: 'approved',
                      });
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
                      {s.status === 'approved'
                        ? 'Simpan batas'
                        : 'Setujui sales'}
                    </button>
                    <button
                      className="btn outline"
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        action('sales', {
                          id: s.id,
                          status:
                            s.status === 'pending' ? 'rejected' : 'suspended',
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
            <section
              className="panel portal-editor"
              aria-label="Editor"
              id="portal-editor"
            >
              <div className="portal-heading">
                <h2>
                  {edit.kind === 'product' ? 'Edit produk' : 'Edit promo'}
                </h2>
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
                    quote: f.quote === 'on',
                    imageSrc: edit.imageSrc,
                    gallery: edit.gallery || [],
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
                    <label>Kategori<select name="category" defaultValue={edit.category}>{categories.slice(1).map(category=><option key={category}>{category}</option>)}</select></label>
                    <label>Berat pengiriman (gram)<input name="weight" type="number" min="1" max="1000000" defaultValue={edit.weight || 1000} required/></label>
                    <label className="product-image-editor">Foto produk<img src={edit.imageSrc} alt="Pratinjau produk" style={{width:150,height:150,objectFit:'contain'}}/><input type="file" accept="image/png,image/jpeg,image/webp" onChange={async e=>{const file=e.target.files?.[0];if(file)try{const imageSrc=await readImage(file);setEdit((current:any)=>({...current,imageSrc}));}catch(error:any){setError(error.message);}}}/></label>
                    <div className="product-gallery-editor"><strong>Galeri foto produk</strong><p>Tambahkan hingga 7 foto. Foto utama ditampilkan paling awal. JPG, PNG, WebP.</p><div className="admin-gallery-thumbs">{(edit.gallery || []).map((src:string,index:number)=><div key={index}><img src={src} alt={'Foto tambahan '+(index+1)}/><button type="button" aria-label={'Hapus foto tambahan '+(index+1)} onClick={()=>setEdit((current:any)=>({...current,gallery:current.gallery.filter((_:string,i:number)=>i!==index)}))}>Hapus</button></div>)}</div><input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={(edit.gallery || []).length>=7} onChange={async e=>{const files=Array.from(e.target.files || []);if(files.length+(edit.gallery || []).length>7){setError('Maksimal 7 foto tambahan.');return;}try{const gallery=await Promise.all(files.map(readImage));setEdit((current:any)=>({...current,gallery:[...(current.gallery || []),...gallery]}));}catch(error:any){setError(error.message);}e.target.value='';}}/></div>
                    {edit.category !== 'Fusion Splicer' && <label><input type="checkbox" name="quote" defaultChecked={edit.quote}/> Harga melalui penawaran sales</label>}
                    <label>Spesifikasi (satu per baris, Nama: Nilai)<textarea name="specsText" rows={6} maxLength={6000} defaultValue={Object.entries(edit.specs || {}).map(([k,v])=>`${k}: ${v}`).join('\n')}/></label>
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
        </div>
      </div>
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
                    `${location.origin}/produk?ref=${profile.code}`,
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
