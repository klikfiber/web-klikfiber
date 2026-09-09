'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  ChevronRight,
  Truck,
  ShieldCheck,
  Headset,
  Building2,
  ShoppingCart,
  Trash2,
  Heart,
  FileText,
  MapPin,
  Check,
  CircleCheck,
  Package,
  UserRound,
  Gift,
  LogOut,
  Copy,
  RefreshCw,
  Download,
  Clock,
  LayoutDashboard,
  Megaphone,
  Mail,
  LockKeyhole,
  Plus,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Btn,
  useStore,
  ProductImage,
  ProductCard,
  Quantity,
  SectionHead,
  api,
  notify,
} from './store';
import { products, rupiah, shipping } from '@/lib/catalog';
export const office =
  'Jalan Mayor Madmuin Hasibuan. 4B RT.003/024, Margahayu, Kec. Bekasi Tim., Kota Bks, Jawa Barat 17113';
const date = (d: string) =>
  new Date(d).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
const labels: Record<string, string> = {
  awaiting_payment: 'Menunggu pembayaran',
  confirmed: 'Pembayaran berhasil',
  processing: 'Diproses',
  shipped: 'Dikirim',
  completed: 'Diterima',
  expired: 'Kedaluwarsa',
  canceled: 'Dibatalkan',
  submitted: 'Diajukan',
  offered: 'Penawaran tersedia',
  accepted: 'Disetujui',
  converted: 'Dikonversi',
  draft: 'Draft',
  pending_approval: 'Menunggu persetujuan',
  active: 'Aktif',
  paused: 'Nonaktif',
  requested: 'Diajukan',
  succeeded: 'Berhasil',
};
export function Status({ value }: { value: string }) {
  return (
    <span className={'status status-' + value}>{labels[value] || value}</span>
  );
}
function ErrorBox({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="error-box" role="alert">
      {message}
      {retry && <button onClick={retry}>Coba lagi</button>}
    </div>
  );
}
function Loading() {
  return (
    <div className="loading-block" aria-label="Memuat data">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
function LoginGate() {
  const s = useStore();
  return (
    <div className="panel empty">
      <UserRound size={45} />
      <h2>Satu akun untuk semua kebutuhan</h2>
      <p>Lihat pesanan, simpan alamat, dan kelola penawaran proyek Anda.</p>
      <Btn onClick={s.login}>
        Masuk ke Akun Uji <ArrowRight size={17} />
      </Btn>
    </div>
  );
}
const initialAddress = {
  name: 'Budi Santoso',
  phone: '081234567890',
  city: 'Bekasi',
  postal: '17113',
  street: 'Jalan Contoh No. 12, Margahayu',
  company: '',
};
function AddressFields({
  value,
  onChange,
}: {
  value: any;
  onChange: (v: any) => void;
}) {
  return (
    <div className="form-grid">
      {[
        ['name', 'Nama penerima', 'text'],
        ['phone', 'Nomor telepon', 'tel'],
        ['city', 'Kota / kabupaten', 'text'],
        ['postal', 'Kode pos', 'text'],
        ['company', 'Perusahaan (opsional)', 'text'],
      ].map(([key, label, type]) => (
        <label key={key}>
          {label}
          <input
            required={key !== 'company'}
            name={key}
            type={type}
            value={value[key] || ''}
            maxLength={key === 'postal' ? 5 : 100}
            pattern={
              key === 'postal'
                ? '[0-9]{5}'
                : key === 'phone'
                  ? '[+0-9]{9,16}'
                  : undefined
            }
            minLength={key === 'name' ? 2 : undefined}
            onChange={(e) => onChange({ ...value, [key]: e.target.value })}
          />
        </label>
      ))}
      <label className="span-2">
        Alamat lengkap
        <textarea
          required
          minLength={10}
          maxLength={250}
          value={value.street}
          onChange={(e) => onChange({ ...value, street: e.target.value })}
        />
      </label>
    </div>
  );
}
export function Checkout({ paymentId }: { paymentId?: string }) {
  const s = useStore();
  const router = useRouter();
  const path = usePathname();
  const [step, setStep] = useState(path === '/checkout' ? 1 : 0);
  const [address, setAddress] = useState(initialAddress);
  const [ship, setShip] = useState('regular');
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<any>(null);
  const key = useRef('');
  useEffect(() => {
    try {
      const saved = localStorage.getItem('klikfiber-address');
      if (saved) setAddress(JSON.parse(saved));
    } catch {}
  }, []);
  useEffect(() => {
    if (paymentId)
      api('orders/' + paymentId)
        .then(setOrder)
        .catch((e) => setError(e.message));
  }, [paymentId]);
  useEffect(() => {
    setQuote(null);
    key.current = '';
  }, [s.cart, ship, applied]);
  const subtotal = s.cart.reduce(
    (n, item) => n + products.find((p) => p.id === item.id)!.price * item.qty,
    0,
  );
  async function getQuote(promo = applied) {
    setError('');
    setBusy(true);
    try {
      const q = await api('checkout/quote', {
        items: s.cart,
        address,
        shipping: ship,
        code: promo,
      });
      setQuote(q);
      return q;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  if (paymentId) {
    if (!order)
      return (
        <main className="container page">
          {error ? <ErrorBox message={error} /> : <Loading />}
        </main>
      );
    const paid = ['confirmed', 'processing', 'shipped', 'completed'].includes(
      order.status,
    );
    return (
      <main className="container page payment-page">
        <div className="payment-card panel">
          <span className="kicker">PEMBAYARAN SIMULASI</span>
          {paid ? (
            <CircleCheck size={57} className="green" />
          ) : (
            <LockKeyhole size={49} />
          )}
          <h1>{paid ? 'Pembayaran berhasil' : 'Selesaikan pembayaran uji'}</h1>
          <p>{order.number}</p>
          <Status value={order.status} />
          <div className="payment-total">{rupiah(order.total)}</div>
          <p>
            Tidak ada uang yang ditagih. Halaman ini mensimulasikan pembayaran
            hosted; tidak meminta data kartu atau rekening Anda.
          </p>
          {error && <ErrorBox message={error} />}
          <div className="stack">
            {order.status === 'awaiting_payment' && (
              <>
                <Btn
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      setOrder(
                        await api(
                          'orders/' + order.id + '/simulate-payment',
                          {},
                        ),
                      );
                      s.clearCart();
                      notify('Pembayaran simulasi berhasil');
                    } catch (e: any) {
                      setError(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? 'Memproses…' : 'Simulasikan Pembayaran Berhasil'}
                  <Check size={18} />
                </Btn>
                <Btn
                  outline
                  onClick={async () => {
                    try {
                      setOrder(await api('orders/' + order.id + '/cancel', {}));
                      notify('Pesanan dibatalkan');
                    } catch (e: any) {
                      setError(e.message);
                    }
                  }}
                >
                  Batalkan pesanan uji
                </Btn>
              </>
            )}
            <Btn href={'/akun/pesanan/' + order.id} outline>
              Lihat Detail Pesanan <ArrowRight size={17} />
            </Btn>
          </div>
        </div>
      </main>
    );
  }
  if (!s.ready)
    return (
      <main className="container page">
        <Loading />
      </main>
    );
  if (!s.cart.length)
    return (
      <main className="container page empty">
        <ShoppingCart size={55} />
        <h1>Keranjang Anda masih kosong</h1>
        <p>Temukan perangkat yang tepat untuk proyek berikutnya.</p>
        <Btn href="/produk">
          Jelajahi Produk <ArrowRight size={18} />
        </Btn>
      </main>
    );
  return (
    <main className="container page checkout-page">
      <div className="steps">
        {['Keranjang', 'Alamat & Pengiriman', 'Pembayaran'].map((t, i) => (
          <div key={t} className={i <= step ? 'active' : ''}>
            <span>{i < step ? <Check size={16} /> : i + 1}</span>
            <strong>{t}</strong>
            {i < 2 && <i />}
          </div>
        ))}
      </div>
      <div className="checkout-layout">
        <div className="stack">
          <section className="panel">
            <SectionHead
              title="Keranjang Belanja"
              sub={s.cart.length + ' jenis produk'}
            />
            {s.cart.map((item) => {
              const p = products.find((p) => p.id === item.id)!;
              return (
                <div className="cart-item" key={p.id}>
                  <Link href={'/produk/' + p.id}>
                    <ProductImage p={p} />
                  </Link>
                  <div className="cart-item-info">
                    <Link href={'/produk/' + p.id}>
                      <strong>{p.name}</strong>
                    </Link>
                    <p>{p.model}</p>
                    <span className="green small">● Stok tersedia</span>
                  </div>
                  <Quantity
                    value={item.qty}
                    max={Math.min(99, p.stock)}
                    onChange={(n) => s.setQty(p.id, n)}
                  />
                  <div className="cart-item-price">
                    <strong>{rupiah(p.price * item.qty)}</strong>
                    <button onClick={() => s.setQty(p.id, 0)}>
                      <Trash2 size={14} /> Hapus
                    </button>
                  </div>
                </div>
              );
            })}
            <Link className="text-link" href="/produk">
              ← Lanjut belanja
            </Link>
          </section>
          {step >= 1 && (
            <section className="panel">
              <h2 className="icon-heading">
                <MapPin /> Alamat Pengiriman
              </h2>
              {!s.profile ? (
                <LoginGate />
              ) : (
                <form
                  id="address-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await api('addresses', address);
                      localStorage.setItem(
                        'klikfiber-address',
                        JSON.stringify(address),
                      );
                      const q = await getQuote();
                      if (q) {
                        setStep(2);
                        notify('Alamat dan ongkir berhasil diperiksa');
                      }
                    } catch (e: any) {
                      setError(e.message);
                    }
                  }}
                >
                  <AddressFields
                    value={address}
                    onChange={(v) => {
                      setAddress(v);
                      setQuote(null);
                      setStep(1);
                    }}
                  />
                  <Btn type="submit" outline disabled={busy}>
                    Simpan & Periksa Ongkir <ArrowRight size={17} />
                  </Btn>
                </form>
              )}
            </section>
          )}
          {step >= 1 && (
            <section className="panel">
              <h2 className="icon-heading">
                <Truck /> Metode Pengiriman
              </h2>
              <p className="small muted">
                Tarif uji. Ketersediaan layanan aktual dikonfirmasi oleh
                provider.
              </p>
              <RadioGroup
                value={ship}
                onValueChange={(v) => setShip(String(v))}
                className="shipping-options"
              >
                {shipping.map((option) => (
                  <label
                    key={option.id}
                    className={
                      'shipping-option ' +
                      (ship === option.id ? 'selected' : '')
                    }
                  >
                    <RadioGroupItem value={option.id} />
                    <div>
                      <strong>{option.name}</strong>
                      <span>{option.eta}</span>
                      <b>{rupiah(option.cost)}</b>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </section>
          )}
          <section className="panel promo-box">
            <Gift />
            <div>
              <h3>Punya kode promo?</h3>
              <p>Coba KLIK5: diskon 5%, maks. Rp300.000.</p>
            </div>
            <input
              aria-label="Kode promo"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Masukkan kode promo"
              maxLength={24}
            />
            <Btn
              outline
              disabled={busy}
              onClick={async () => {
                const normalized = code.trim().toUpperCase();
                const q = await getQuote(normalized);
                if (q) {
                  setApplied(normalized);
                  notify(
                    normalized ? 'Kode promo diterapkan' : 'Kode promo dihapus',
                  );
                }
              }}
            >
              Terapkan
            </Btn>
          </section>
        </div>
        <aside className="panel order-summary">
          <h2>Ringkasan Pesanan</h2>
          <dl>
            <div>
              <dt>Subtotal ({s.cart.length} produk)</dt>
              <dd>{rupiah(quote?.subtotal ?? subtotal)}</dd>
            </div>
            <div>
              <dt>Pengiriman ({shipping.find((x) => x.id === ship)!.name})</dt>
              <dd>
                {rupiah(
                  quote?.shippingCost ??
                    shipping.find((x) => x.id === ship)!.cost!,
                )}
              </dd>
            </div>
            <div>
              <dt>Diskon {applied && `(${applied})`}</dt>
              <dd className="green">− {rupiah(quote?.discount ?? 0)}</dd>
            </div>
            <div>
              <dt>Pajak tambahan (simulasi)</dt>
              <dd>Rp 0</dd>
            </div>
            <div className="total">
              <dt>Total Pembayaran</dt>
              <dd>
                {rupiah(
                  quote?.total ??
                    subtotal + shipping.find((x) => x.id === ship)!.cost!,
                )}
              </dd>
            </div>
          </dl>
          {error && <ErrorBox message={error} />}
          <label className="check-label terms">
            <Checkbox checked={accepted} onCheckedChange={setAccepted} />
            <span>
              Saya menyetujui <Link href="/syarat">Syarat & Ketentuan</Link> dan
              memahami transaksi ini simulasi.
            </span>
          </label>
          <Btn
            className="full"
            disabled={busy}
            onClick={async () => {
              if (step === 0) {
                setStep(1);
                return;
              }
              if (!s.profile) {
                s.login();
                return;
              }
              if (!accepted) {
                setError('Setujui syarat transaksi simulasi terlebih dahulu.');
                return;
              }
              if (!quote) {
                const form = document.getElementById(
                  'address-form',
                ) as HTMLFormElement;
                form?.requestSubmit();
                return;
              }
              setBusy(true);
              setError('');
              try {
                key.current ||= crypto.randomUUID();
                const o = await api('orders', {
                  quoteId: quote.id,
                  requestId: key.current,
                  terms: true,
                });
                router.push('/pembayaran/' + o.id);
              } catch (e: any) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy
              ? 'Memproses…'
              : step === 0
                ? 'Lanjut ke Pengiriman'
                : !quote
                  ? 'Periksa Alamat & Total'
                  : 'Lanjut Bayar Uji'}
            <ArrowRight size={18} />
          </Btn>
          <div className="secure-box">
            <LockKeyhole />
            <strong>Belanja dengan tenang</strong>
            <p>Pembayaran nyata akan diproses melalui halaman aman Xendit.</p>
          </div>
          <div className="summary-benefits">
            <span>
              <ShieldCheck /> Informasi garansi transparan
            </span>
            <span>
              <Truck /> Pengiriman seluruh Indonesia
            </span>
            <span>
              <FileText /> Invoice penjualan setelah dibayar
            </span>
          </div>
        </aside>
      </div>
    </main>
  );
}
function OrderView({ order, reload }: { order: any; reload: () => void }) {
  const s = useStore();
  const [ticket, setTicket] = useState(false);
  const [reason, setReason] = useState('');
  const paid = ['confirmed', 'processing', 'shipped', 'completed'].includes(
    order.status,
  );
  const statuses = ['confirmed', 'processing', 'shipped', 'completed'];
  return (
    <section className="panel order-view">
      <div className="order-header">
        <div>
          <h3>{order.number}</h3>
          <p>{date(order.createdAt)} WIB</p>
        </div>
        <Status value={order.status} />
      </div>
      {order.items.map((item: any) => (
        <div className="order-product" key={item.id}>
          <ProductImage p={products.find((p) => p.id === item.id)!} />
          <div>
            <strong>{item.name}</strong>
            <p>
              {item.model} · Qty: {item.qty}
            </p>
            <b>{rupiah(item.price * item.qty)}</b>
          </div>
        </div>
      ))}
      <div className="timeline">
        {statuses.map((v, i) => (
          <div
            key={v}
            className={statuses.indexOf(order.status) >= i ? 'done' : ''}
          >
            <span>
              {statuses.indexOf(order.status) >= i ? (
                <Check size={17} />
              ) : (
                i + 1
              )}
            </span>
            <strong>{['Dibayar', 'Diproses', 'Dikirim', 'Diterima'][i]}</strong>
          </div>
        ))}
      </div>
      {order.tracking && (
        <div className="tracking-box">
          <Truck />
          <span>
            Nomor resi simulasi<strong>{order.tracking}</strong>
          </span>
          <button
            className="icon-btn"
            aria-label="Salin resi"
            onClick={() =>
              navigator.clipboard
                .writeText(order.tracking)
                .then(() => notify('Resi disalin'))
                .catch(() => notify('Tidak dapat menyalin resi', 'error'))
            }
          >
            <Copy size={17} />
          </button>
        </div>
      )}
      <div className="order-details">
        <div>
          <strong>Alamat pengiriman</strong>
          <p>
            {order.address.name}
            <br />
            {order.address.street}
            <br />
            {order.address.city} {order.address.postal}
            <br />
            {order.address.phone}
          </p>
        </div>
        <div>
          <strong>Total pesanan</strong>
          <p>
            Barang: {rupiah(order.subtotal)}
            <br />
            Ongkir: {rupiah(order.shippingCost)}
            <br />
            Diskon: − {rupiah(order.discount)}
          </p>
          <b>{rupiah(order.total)}</b>
        </div>
      </div>
      <div className="row">
        {order.status === 'awaiting_payment' && (
          <Btn href={'/pembayaran/' + order.id}>Lanjut Pembayaran</Btn>
        )}
        {paid && (
          <a
            className="btn outline"
            href={'/api/v1/orders/' + order.id + '/invoice'}
            target="_blank"
            rel="noreferrer"
          >
            <Download size={16} /> Invoice
          </a>
        )}
        <Btn
          outline
          onClick={() => {
            order.items.forEach((item: any) => {
              const p = products.find((p) => p.id === item.id);
              if (p) s.add(p, item.qty);
            });
          }}
        >
          Beli Lagi <ShoppingCart size={16} />
        </Btn>
        {paid && (
          <Btn outline onClick={() => setTicket(true)}>
            Ajukan Retur / Garansi
          </Btn>
        )}
        <Btn outline onClick={reload}>
          <RefreshCw size={15} /> Periksa Status
        </Btn>
      </div>
      <Dialog open={ticket} onOpenChange={setTicket}>
        <DialogContent>
          <DialogTitle>Permintaan purnajual</DialogTitle>
          <DialogDescription>
            Jelaskan masalah pada pesanan {order.number}. Permintaan disimpan
            dalam mode uji.
          </DialogDescription>
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api('support', { orderId: order.id, reason });
                notify('Tiket purnajual berhasil dibuat');
                setTicket(false);
              } catch (e: any) {
                notify(e.message, 'error');
              }
            }}
          >
            <label>
              Keluhan
              <textarea
                required
                minLength={10}
                maxLength={1500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <Btn type="submit">Kirim Permintaan</Btn>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
export function Account() {
  const s = useStore();
  const path = usePathname();
  const [orders, setOrders] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [address, setAddress] = useState(initialAddress);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  async function load() {
    setLoading(true);
    setError('');
    try {
      const [o, q, a] = await Promise.all([
        api('orders'),
        api('quotes'),
        api('addresses'),
      ]);
      setOrders(o);
      setQuotes(q);
      if (a.length) setAddress(a[0]);
      setName(s.profile?.name || 'Budi');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (s.profile) load();
    else setLoading(false);
  }, [s.profile]);
  const links = [
    [LayoutDashboard, 'Ringkasan', '/akun'],
    [FileText, 'Pesanan Saya', '/akun/pesanan'],
    [MapPin, 'Alamat', '/akun/alamat'],
    [Heart, 'Wishlist', '/akun/wishlist'],
    [Building2, 'Penawaran Proyek', '/akun/penawaran'],
    [UserRound, 'Profil', '/akun/profil'],
  ];
  const selected = path.split('/')[3];
  return (
    <main className="container page">
      <div className="account-layout">
        <aside className="account-sidebar">
          <div className="account-avatar">
            <UserRound />
            <strong>{s.profile?.name || 'Akun Saya'}</strong>
            <span>Pelanggan KLIKFIBER</span>
          </div>
          {links.map(([Icon, label, href]: any) => (
            <Link
              href={href}
              key={href}
              className={path === href ? 'active' : ''}
            >
              <Icon size={19} />
              {label}
            </Link>
          ))}
          {s.profile && (
            <button
              onClick={async () => {
                await api('auth/logout', {});
                await s.refresh();
                notify('Anda telah keluar');
              }}
            >
              <LogOut size={19} />
              Keluar
            </button>
          )}
        </aside>
        <div className="account-content">
          {path === '/akun/wishlist' ? (
            <>
              <SectionHead
                title="Wishlist Saya"
                sub="Produk pilihan Anda, tersimpan di browser ini."
              />
              <div className="product-grid catalog-grid">
                {products
                  .filter((p) => s.favorites.includes(p.id))
                  .map((p) => (
                    <ProductCard key={p.id} p={p} />
                  ))}
              </div>
              {!s.favorites.length && (
                <div className="panel empty">
                  <Heart />
                  <h2>Belum ada produk favorit</h2>
                  <p>Ketuk ikon hati pada produk untuk menyimpannya.</p>
                  <Btn href="/produk">Jelajahi Produk</Btn>
                </div>
              )}
            </>
          ) : !s.profile ? (
            <LoginGate />
          ) : loading ? (
            <Loading />
          ) : error ? (
            <ErrorBox message={error} retry={load} />
          ) : (
            <>
              <div className="page-heading">
                <span className="kicker">AKUN KLIKFIBER</span>
                <h1>
                  {path === '/akun'
                    ? `Halo, ${s.profile.name}!`
                    : path.includes('/alamat')
                      ? 'Alamat Pengiriman'
                      : path.includes('/profil')
                        ? 'Profil Saya'
                        : path.includes('/penawaran')
                          ? 'Penawaran Proyek'
                          : 'Pesanan Saya'}
                </h1>
                <p>Kelola kebutuhan dan pantau setiap langkah pesanan Anda.</p>
              </div>
              {path === '/akun' && (
                <>
                  <div className="stat-grid">
                    <div className="stat-card">
                      <FileText />
                      <span>
                        Total Pesanan<strong>{orders.length}</strong>
                        <small>Semua pesanan Anda</small>
                      </span>
                    </div>
                    <div className="stat-card">
                      <Truck />
                      <span>
                        Pesanan Aktif
                        <strong>
                          {
                            orders.filter((o) =>
                              ['confirmed', 'processing', 'shipped'].includes(
                                o.status,
                              ),
                            ).length
                          }
                        </strong>
                        <small>Sedang ditangani</small>
                      </span>
                    </div>
                    <div className="stat-card">
                      <Heart />
                      <span>
                        Wishlist<strong>{s.favorites.length}</strong>
                        <small>Produk favorit Anda</small>
                      </span>
                    </div>
                  </div>
                  <SectionHead
                    title="Pesanan Terbaru"
                    href="/akun/pesanan"
                    label="Lihat semua"
                  />
                </>
              )}
              {(path === '/akun' || path.includes('/pesanan')) && (
                <>
                  {(selected
                    ? orders.filter((o) => o.id === selected)
                    : path === '/akun'
                      ? orders.slice(0, 1)
                      : orders
                  ).map((o) => (
                    <OrderView key={o.id} order={o} reload={load} />
                  ))}
                  {(!orders.length ||
                    (selected && !orders.some((o) => o.id === selected))) && (
                    <div className="panel empty">
                      <Package size={42} />
                      <h2>
                        {selected
                          ? 'Pesanan tidak ditemukan'
                          : 'Belum ada pesanan'}
                      </h2>
                      <p>
                        {selected
                          ? 'Pesanan ini tidak tersedia untuk akun Anda.'
                          : 'Mulai pesanan pertama Anda dari katalog produk.'}
                      </p>
                      <Btn href="/produk">Jelajahi Produk</Btn>
                    </div>
                  )}
                </>
              )}
              {path === '/akun/alamat' && (
                <form
                  className="panel"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await api('addresses', address);
                      localStorage.setItem(
                        'klikfiber-address',
                        JSON.stringify(address),
                      );
                      notify('Alamat disimpan');
                    } catch (e: any) {
                      notify(e.message, 'error');
                    }
                  }}
                >
                  <AddressFields value={address} onChange={setAddress} />
                  <Btn type="submit">Simpan Alamat</Btn>
                </form>
              )}
              {path === '/akun/profil' && (
                <form
                  className="panel stack"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await api('me', { name });
                      await s.refresh();
                      notify('Profil diperbarui');
                    } catch (e: any) {
                      notify(e.message, 'error');
                    }
                  }}
                >
                  <label>
                    Nama tampilan
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      minLength={2}
                      maxLength={100}
                      required
                    />
                  </label>
                  <p className="small">
                    Akun pelanggan uji · Data tersimpan di server dan terikat
                    sesi browser.
                  </p>
                  <Btn type="submit">Simpan Profil</Btn>
                </form>
              )}
              {path === '/akun/penawaran' && (
                <div className="stack">
                  {!quotes.length && (
                    <div className="panel empty">
                      <Building2 />
                      <h2>Mulai pengadaan proyek Anda</h2>
                      <Btn href="/penawaran">Minta Penawaran</Btn>
                    </div>
                  )}
                  {quotes.map((q) => (
                    <div key={q.id} className="panel">
                      <div className="order-header">
                        <h3>{q.number}</h3>
                        <Status value={q.status} />
                      </div>
                      <p>
                        {q.company} · {q.city}
                      </p>
                      <p className="preserve-lines">{q.requirements}</p>
                      {q.amount && (
                        <p>
                          <b>Total penawaran: {rupiah(q.amount)}</b>
                          <br />
                          <span className="small">
                            Berlaku sampai {date(q.expiresAt)} WIB · Revisi{' '}
                            {q.version}
                          </span>
                        </p>
                      )}
                      {q.status === 'offered' && (
                        <Btn
                          onClick={async () => {
                            try {
                              await api('quotes/' + q.id + '/accept', {
                                version: q.version,
                              });
                              await load();
                              notify('Penawaran diterima');
                            } catch (e: any) {
                              notify(e.message, 'error');
                            }
                          }}
                        >
                          Terima Penawaran
                        </Btn>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {path === '/akun' && (
                <div className="account-help panel">
                  <Headset />
                  <div>
                    <h3>Butuh bantuan untuk pesanan Anda?</h3>
                    <p>Tim KLIKFIBER siap membantu.</p>
                  </div>
                  <Btn outline href="/dukungan">
                    Pusat Bantuan <ArrowRight size={16} />
                  </Btn>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
export function QuoteForm() {
  const s = useStore();
  const params = useSearchParams();
  const p = products.find((p) => p.id === params.get('produk'));
  const [sent, setSent] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <main className="container page quote-page">
      <div className="page-heading">
        <span className="kicker">PENGADAAN UNTUK BISNIS & PROYEK</span>
        <h1>
          Kebutuhan besar,
          <br />
          solusi yang lebih personal.
        </h1>
        <p>
          Ceritakan kebutuhan Anda. Mari temukan perangkat dan pengiriman yang
          sesuai.
        </p>
      </div>
      <div className="quote-layout">
        <div className="panel">
          {sent ? (
            <div className="empty">
              <CircleCheck size={50} />
              <h2>Permintaan berhasil disimpan</h2>
              <p>
                Nomor penawaran: <strong>{sent.number}</strong>
              </p>
              <p>
                Ini adalah permintaan uji. Pantau status di akun Anda atau
                proses melalui Portal Staf Uji.
              </p>
              <Btn href="/akun/penawaran">Lihat Penawaran Saya</Btn>
            </div>
          ) : !s.profile ? (
            <LoginGate />
          ) : (
            <form
              className="stack"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError('');
                const form = new FormData(e.currentTarget);
                try {
                  setSent(await api('quotes', Object.fromEntries(form)));
                } catch (e: any) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h2>Detail kebutuhan proyek</h2>
              <div className="form-grid">
                <label>
                  Nama perusahaan
                  <input
                    name="company"
                    required
                    minLength={2}
                    maxLength={150}
                    placeholder="PT Perusahaan Anda"
                  />
                </label>
                <label>
                  Nama penanggung jawab
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={100}
                    defaultValue={s.profile.name}
                  />
                </label>
                <label>
                  Email kontak
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="nama@perusahaan.id"
                  />
                </label>
                <label>
                  Telepon
                  <input
                    name="phone"
                    type="tel"
                    pattern="[+0-9]{9,16}"
                    required
                    placeholder="08xxxxxxxxxx"
                  />
                </label>
                <label className="span-2">
                  Kota tujuan
                  <input
                    name="city"
                    required
                    minLength={2}
                    placeholder="Kota / kabupaten proyek"
                  />
                </label>
                <label className="span-2">
                  Daftar produk, jumlah, dan kebutuhan
                  <textarea
                    name="requirements"
                    required
                    minLength={10}
                    maxLength={3000}
                    defaultValue={
                      p
                        ? `${p.name} (${p.model})\nJumlah: \nKebutuhan proyek: `
                        : ''
                    }
                    placeholder="Contoh: Fusion Splicer 5 unit, patch cord 100 pcs. Untuk instalasi FTTH di Bekasi."
                  />
                </label>
              </div>
              <p className="small muted">
                Pengajuan penawaran tidak menahan stok. Harga dan pengiriman
                diperiksa sebelum pembayaran.
              </p>
              {error && <ErrorBox message={error} />}
              <Btn type="submit" disabled={busy}>
                {busy ? 'Menyimpan…' : 'Kirim Permintaan Uji'}
                <ArrowRight size={17} />
              </Btn>
            </form>
          )}
        </div>
        <aside>
          <div className="panel contact-panel">
            <Building2 />
            <h2>KLIKFIBER Office</h2>
            <p>{office}</p>
            <a href="mailto:klikfiber@gmail.com">
              <Mail size={17} />
              klikfiber@gmail.com
            </a>
          </div>
          <div className="panel contact-panel">
            <Headset />
            <h3>Konsultasi yang tepat sasaran</h3>
            <p>
              Sertakan SKU, jumlah, lokasi, dan jadwal proyek agar kebutuhan
              dapat ditinjau dengan baik.
            </p>
            <div className="info-strip">
              Mode uji: formulir disimpan, tanpa mengirim email kepada pihak
              lain.
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
export function Backoffice() {
  const s = useStore();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [role, setRole] = useState('operations');
  const [tab, setTab] = useState('overview');
  const [edit, setEdit] = useState<any>(null);
  const [campaign, setCampaign] = useState(false);
  async function load() {
    try {
      setData(await api('admin/overview'));
      setError('');
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    if (s.profile?.staffRole) {
      setRole(s.profile.staffRole);
      load();
    }
  }, [s.profile]);
  async function action(path: string, body: any) {
    try {
      await api(path, body);
      await load();
      notify('Perubahan uji disimpan');
      setEdit(null);
    } catch (e: any) {
      notify(e.message, 'error');
    }
  }
  if (!s.profile)
    return (
      <main className="container page">
        <LoginGate />
      </main>
    );
  if (!s.profile.staffRole)
    return (
      <main className="container page">
        <div className="panel empty">
          <LockKeyhole size={45} />
          <h1>Portal Staf Uji</h1>
          <p>
            Aktifkan peran untuk mencoba pengelolaan data uji milik sesi Anda
            sendiri.
            <br />
            Peran ini tidak memberi akses ke data pengunjung lain.
          </p>
          <div className="role-buttons">
            {[
              ['operations', 'Operasional'],
              ['marketing', 'Marketing'],
              ['finance', 'Finance'],
              ['owner', 'Owner'],
            ].map(([r, label]) => (
              <Btn
                key={r}
                outline
                onClick={async () => {
                  await api('auth/demo-role', { role: r });
                  await s.refresh();
                }}
              >
                {label}
              </Btn>
            ))}
          </div>
        </div>
      </main>
    );
  if (!data)
    return (
      <main className="container page">
        {error ? <ErrorBox message={error} retry={load} /> : <Loading />}
      </main>
    );
  const financial = ['finance', 'owner'].includes(role);
  return (
    <main className="container page admin-page">
      <div className="admin-heading">
        <div className="page-heading">
          <span className="kicker">PORTAL STAF · LINGKUNGAN UJI</span>
          <h1>Ruang kerja KLIKFIBER</h1>
          <p>
            Data sesi Anda · Asia/Jakarta · Diperbarui{' '}
            {new Date().toLocaleTimeString('id-ID')}
          </p>
        </div>
        <div className="row">
          <Select
            value={role}
            onValueChange={async (r) => {
              await api('auth/demo-role', { role: r });
              await s.refresh();
            }}
          >
            <SelectTrigger aria-label="Peran uji" className="sort-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['operations', 'marketing', 'finance', 'owner'].map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Btn outline onClick={load}>
            <RefreshCw size={16} />
          </Btn>
        </div>
      </div>
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(String(v))}
        className="admin-tabs"
      >
        <TabsList variant="line">
          {[
            ['overview', 'Ringkasan'],
            ['orders', 'Pesanan'],
            ['products', 'Produk & Stok'],
            ['quotes', 'Penawaran'],
            ['campaigns', 'Campaign'],
            ['finance', 'Finance'],
            ['audit', 'Audit'],
          ]
            .filter(
              ([v]) =>
                role !== 'marketing' || ['overview', 'campaigns'].includes(v),
            )
            .map(([v, label]) => (
              <TabsTrigger key={v} value={v}>
                {label}
              </TabsTrigger>
            ))}
        </TabsList>
        <TabsContent value="overview">
          <div className="stat-grid">
            <div className="stat-card">
              <FileText />
              <span>
                Pesanan dibayar<strong>{data.paidCount}</strong>
                <small>Pending tidak dihitung</small>
              </span>
            </div>
            <div className="stat-card">
              <Building2 />
              <span>
                Penjualan barang net<strong>{rupiah(data.netSales)}</strong>
                <small>Setelah refund barang</small>
              </span>
            </div>
            <div className="stat-card">
              <Gift />
              <span>
                Diskon digunakan<strong>{rupiah(data.discountUsed)}</strong>
                <small>Dari pesanan paid</small>
              </span>
            </div>
          </div>
          <div className="panel">
            <h2>Antrean operasional</h2>
            <p>
              {data.orders.filter((o: any) => o.status === 'confirmed').length}{' '}
              pesanan menunggu diproses ·{' '}
              {data.quotes.filter((q: any) => q.status === 'submitted').length}{' '}
              permintaan penawaran
            </p>
            <div className="info-strip">
              <ShieldCheck />
              <span>
                Perubahan stok, campaign, penawaran, dan status dicatat dalam
                audit. Hak akses diperiksa di server.
              </span>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="orders">
          <div className="panel">
            <SectionHead
              title="Pesanan"
              sub="Status pembayaran dan pengiriman dipisahkan."
            />
            {!data.orders.length && (
              <p>Belum ada pesanan uji. Buat pesanan dari storefront.</p>
            )}
            {data.orders.map((o: any) => (
              <div className="admin-row" key={o.id}>
                <div>
                  <strong>{o.number}</strong>
                  <p>
                    {date(o.createdAt)} · {rupiah(o.total)}
                  </p>
                </div>
                <Status value={o.status} />
                <div className="row">
                  <Btn outline href={'/akun/pesanan/' + o.id}>
                    Detail
                  </Btn>
                  {['owner', 'operations'].includes(role) &&
                    ['confirmed', 'processing', 'shipped'].includes(
                      o.status,
                    ) && (
                      <Btn
                        onClick={() =>
                          action('admin/orders/' + o.id + '/advance', {})
                        }
                      >
                        {o.status === 'confirmed'
                          ? 'Proses'
                          : o.status === 'processing'
                            ? 'Kirim Uji'
                            : 'Tandai Diterima Uji'}
                      </Btn>
                    )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="products">
          <div className="panel">
            <h2>Produk & Stok</h2>
            <p className="small muted">
              Stok uji terpisah per sesi. Penyesuaian membutuhkan alasan.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk / SKU</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead>Tersedia</TableHead>
                  <TableHead>Ditahan</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.inventory.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <strong>{p.name}</strong>
                      <br />
                      <small>{p.model}</small>
                    </TableCell>
                    <TableCell>{rupiah(p.price)}</TableCell>
                    <TableCell>{p.stock - p.reserved}</TableCell>
                    <TableCell>{p.reserved}</TableCell>
                    <TableCell>
                      <Btn
                        outline
                        disabled={!['owner', 'operations'].includes(role)}
                        onClick={() => setEdit({ kind: 'stock', ...p })}
                      >
                        Sesuaikan
                      </Btn>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="quotes">
          <div className="panel">
            <h2>Penawaran Proyek</h2>
            {!data.quotes.length && <p>Belum ada pengajuan penawaran.</p>}
            {data.quotes.map((q: any) => (
              <div className="admin-row" key={q.id}>
                <div>
                  <strong>
                    {q.number} · {q.company}
                  </strong>
                  <p className="preserve-lines">{q.requirements}</p>
                  {q.amount && <b>{rupiah(q.amount)}</b>}
                </div>
                <Status value={q.status} />
                {['owner', 'operations'].includes(role) &&
                  ['submitted', 'offered'].includes(q.status) && (
                    <Btn
                      outline
                      onClick={() => setEdit({ kind: 'quote', ...q })}
                    >
                      Buat / Revisi Penawaran
                    </Btn>
                  )}
                {q.status === 'accepted' &&
                  ['owner', 'operations'].includes(role) && (
                    <Btn
                      onClick={() =>
                        action('admin/quotes/' + q.id + '/convert', {})
                      }
                    >
                      Konversi ke Order
                    </Btn>
                  )}
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="campaigns">
          <div className="panel">
            <SectionHead
              title="Campaign & Promo"
              sub="Satu kode per pesanan. Budget ditahan ketika order dibuat."
            />
            <Btn onClick={() => setCampaign(true)}>
              <Plus size={17} /> Campaign Baru
            </Btn>
            <div className="campaign-list">
              {data.campaigns.map((c: any) => (
                <div className="admin-row" key={c.code}>
                  <div>
                    <strong>{c.name}</strong>
                    <p>
                      <b>{c.code}</b> · {c.percent}% · maks. {rupiah(c.cap)}
                      <br />
                      Budget: {rupiah(c.budget)} · Terpakai: {rupiah(c.used)} ·
                      Ditahan: {rupiah(c.reserved)}
                    </p>
                  </div>
                  <Status value={c.status} />
                  <div className="row">
                    <button
                      className="icon-btn"
                      aria-label="Salin kode campaign"
                      onClick={() =>
                        navigator.clipboard
                          .writeText(c.code)
                          .then(() => notify('Kode disalin'))
                          .catch(() => notify('Salin tidak tersedia', 'error'))
                      }
                    >
                      <Copy size={17} />
                    </button>
                    {c.status === 'pending_approval' && financial && (
                      <Btn
                        onClick={() =>
                          action(
                            'marketing/campaigns/' + c.code + '/approve',
                            {},
                          )
                        }
                      >
                        Setujui
                      </Btn>
                    )}
                    {['active', 'paused'].includes(c.status) && (
                      <Btn
                        outline
                        onClick={() =>
                          action(
                            'marketing/campaigns/' + c.code + '/toggle',
                            {},
                          )
                        }
                      >
                        {c.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                      </Btn>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="finance">
          <div className="panel">
            <h2>Finance & Rekonsiliasi</h2>
            <p>
              Mode uji: dana masuk dan settlement bank nyata tidak tersedia.
            </p>
            {!financial ? (
              <ErrorBox message="Peran finance atau owner diperlukan." />
            ) : (
              <>
                {data.orders
                  .filter((o: any) =>
                    [
                      'confirmed',
                      'processing',
                      'shipped',
                      'completed',
                    ].includes(o.status),
                  )
                  .map((o: any) => (
                    <div className="admin-row" key={o.id}>
                      <div>
                        <strong>{o.number}</strong>
                        <p>
                          Paid: {rupiah(o.total)} · Refund:{' '}
                          {rupiah(o.refunded || 0)}
                        </p>
                      </div>
                      <Btn
                        outline
                        disabled={(o.refunded || 0) >= o.total}
                        onClick={() => setEdit({ kind: 'refund', ...o })}
                      >
                        Refund Uji
                      </Btn>
                    </div>
                  ))}
                <h3>Tiket Purnajual</h3>
                {data.tickets.map((t: any) => (
                  <p key={t.id}>
                    {t.reason} · <Status value={t.status} />
                  </p>
                ))}
              </>
            )}
          </div>
        </TabsContent>
        <TabsContent value="audit">
          <div className="panel">
            <h2>Audit Aktivitas</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu WIB</TableHead>
                  <TableHead>Peran</TableHead>
                  <TableHead>Aksi</TableHead>
                  <TableHead>Alasan / objek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.audit.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>{date(a.createdAt)}</TableCell>
                    <TableCell>{a.role}</TableCell>
                    <TableCell>{a.action}</TableCell>
                    <TableCell>{a.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent>
          <DialogTitle>
            {edit?.kind === 'stock'
              ? 'Penyesuaian stok'
              : edit?.kind === 'refund'
                ? 'Refund simulasi'
                : 'Penawaran proyek'}
          </DialogTitle>
          <DialogDescription>
            Perubahan disimpan pada data uji sesi Anda dan dicatat dalam audit.
          </DialogDescription>
          {edit && (
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                const f = Object.fromEntries(new FormData(e.currentTarget));
                if (edit.kind === 'stock')
                  action('admin/stock-adjustments', {
                    id: edit.id,
                    delta: Number(f.amount),
                    reason: f.reason,
                  });
                else if (edit.kind === 'refund')
                  action('admin/refunds', {
                    orderId: edit.id,
                    amount: Number(f.amount),
                    reason: f.reason,
                    requestId: crypto.randomUUID(),
                  });
                else
                  action('admin/quotes/' + edit.id + '/offer', {
                    amount: Number(f.amount),
                    reason: f.reason,
                    productId: f.productId,
                    qty: Number(f.qty),
                    shippingCost: Number(f.shippingCost),
                  });
              }}
            >
              {edit.kind === 'quote' && (
                <>
                  <label>
                    SKU untuk konversi
                    <input
                      name="productId"
                      defaultValue={products[0].id}
                      required
                      list="sku-options"
                    />
                    <datalist id="sku-options">
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </datalist>
                  </label>
                  <label>
                    Jumlah
                    <input
                      name="qty"
                      type="number"
                      defaultValue="1"
                      min="1"
                      max="99"
                      required
                    />
                  </label>
                  <label>
                    Ongkir final (Rp)
                    <input
                      name="shippingCost"
                      type="number"
                      defaultValue="20000"
                      min="1"
                      required
                    />
                  </label>
                </>
              )}
              <label>
                {edit.kind === 'stock'
                  ? 'Perubahan jumlah (+ / −)'
                  : edit.kind === 'quote'
                    ? 'Harga satuan disepakati (Rp)'
                    : 'Jumlah refund (Rp)'}
                <input
                  name="amount"
                  type="number"
                  required
                  step="1"
                  min={edit.kind === 'stock' ? undefined : 1}
                  max={
                    edit.kind === 'refund'
                      ? edit.total - (edit.refunded || 0)
                      : undefined
                  }
                />
              </label>
              <label>
                Alasan / catatan
                <textarea
                  name="reason"
                  minLength={5}
                  maxLength={1000}
                  required
                />
              </label>
              <Btn type="submit">Simpan Perubahan Uji</Btn>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={campaign} onOpenChange={setCampaign}>
        <DialogContent>
          <DialogTitle>Campaign Baru</DialogTitle>
          <DialogDescription>
            Diskon di atas 5%, cap di atas Rp500.000, atau budget di atas Rp5
            juta memerlukan approval owner / finance.
          </DialogDescription>
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api(
                  'marketing/campaigns',
                  Object.fromEntries(new FormData(e.currentTarget)),
                );
                setCampaign(false);
                await load();
                notify('Campaign disimpan');
              } catch (e: any) {
                notify(e.message, 'error');
              }
            }}
          >
            {[
              ['name', 'Nama campaign', 'text', ''],
              ['code', 'Kode promo', 'text', ''],
              ['percent', 'Diskon (%)', 'number', '5'],
              ['cap', 'Maksimum diskon (Rp)', 'number', '300000'],
              ['budget', 'Budget (Rp)', 'number', '5000000'],
              ['quota', 'Kuota penggunaan', 'number', '100'],
            ].map(([name, label, type, value]) => (
              <label key={name}>
                {label}
                <input
                  name={name}
                  type={type}
                  defaultValue={value}
                  required
                  min={type === 'number' ? 1 : undefined}
                  max={name === 'percent' ? 50 : undefined}
                />
              </label>
            ))}
            <Btn type="submit">Simpan / Ajukan Approval</Btn>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
export function Information({ page }: { page: string }) {
  const promo = page === '/promo';
  const support = ['/dukungan', '/pengiriman', '/garansi'].includes(page);
  const legal = ['/syarat', '/privasi'].includes(page);
  const title = promo
    ? 'Promo untuk kebutuhan Anda'
    : support
      ? 'Kami siap membantu Anda'
      : page === '/solusi'
        ? 'Solusi jaringan, dari awal hingga terhubung.'
        : page === '/tentang'
          ? 'Koneksi lebih dekat, masa depan lebih luas.'
          : page === '/privasi'
            ? 'Privasi pada lingkungan uji'
            : page === '/syarat'
              ? 'Ketentuan lingkungan uji'
              : 'Halaman tidak ditemukan';
  return (
    <main className="container page information">
      <div className="info-hero">
        <span className="kicker">
          KLIKFIBER ·{' '}
          {support
            ? 'PUSAT BANTUAN'
            : promo
              ? 'PROMO PILIHAN'
              : legal
                ? 'INFORMASI'
                : 'SOLUSI KONEKTIVITAS'}
        </span>
        <h1>{title}</h1>
        <p>
          {legal
            ? 'Informasi sementara untuk penggunaan versi uji KLIKFIBER.'
            : promo
              ? 'Dapatkan manfaat lebih untuk perlengkapan proyek Anda.'
              : 'Perangkat, aksesori, dan pengadaan fiber optik untuk teknisi, ISP, kontraktor, dan perusahaan.'}
        </p>
      </div>
      {promo ? (
        <div className="promo-card panel">
          <Gift size={43} />
          <span className="kicker">PROMO SIMULASI</span>
          <h2>Hemat 5% untuk kebutuhan fiber Anda.</h2>
          <p>
            Maksimum diskon Rp300.000. Minimum belanja Rp100.000.
            <br />
            Satu kode per pesanan, sesuai ketersediaan budget campaign.
          </p>
          <div className="row">
            <code>KLIK5</code>
            <Btn
              outline
              onClick={() =>
                navigator.clipboard
                  .writeText('KLIK5')
                  .then(() => notify('Kode promo disalin'))
                  .catch(() =>
                    notify('Salin kode KLIK5 secara manual', 'error'),
                  )
              }
            >
              <Copy size={16} />
              Salin Kode
            </Btn>
            <Btn href="/produk">
              Belanja Sekarang
              <ArrowRight size={16} />
            </Btn>
          </div>
        </div>
      ) : legal ? (
        <div className="panel prose">
          <h2>
            {page === '/privasi'
              ? 'Data yang disimpan'
              : 'Penggunaan versi uji'}
          </h2>
          <p>
            Website ini adalah lingkungan pengujian. Produk, harga, stok,
            ongkir, dan pembayaran merupakan data simulasi. Tidak ada transaksi
            uang atau pengiriman barang nyata.
          </p>
          <p>
            Data keranjang dan wishlist disimpan pada browser. Profil, alamat
            uji, pesanan, dan penawaran disimpan di database dengan sesi browser
            sebagai identitas. Gunakan data fiktif saat mencoba formulir; jangan
            memasukkan kata sandi, nomor kartu, atau dokumen pribadi.
          </p>
          <p>
            Kebijakan komersial final, pajak, garansi, retur, retensi data, dan
            integrasi provider akan ditetapkan sebelum toko menerima transaksi
            nyata. Kontak untuk pertanyaan:{' '}
            <a href="mailto:klikfiber@gmail.com">klikfiber@gmail.com</a>.
          </p>
        </div>
      ) : (
        <>
          <div className="info-cards">
            {[
              [
                CableIcon,
                'Instalasi FTTH',
                'Kabel, konektor, distribusi, dan perlengkapan instalasi untuk koneksi last-mile.',
              ],
              [
                Building2,
                'ISP & Infrastruktur',
                'Perangkat penyambungan dan pengujian untuk kebutuhan jaringan Anda.',
              ],
              [
                ShieldCheck,
                'Pengadaan Perusahaan',
                'Konsultasikan daftar kebutuhan, volume, dokumen, dan jadwal pengadaan.',
              ],
            ].map(([Icon, t, desc]: any) => (
              <div key={t} className="panel">
                <Icon size={32} />
                <h2>{t}</h2>
                <p>{desc}</p>
                <Link className="text-link" href="/penawaran">
                  Diskusikan kebutuhan <ArrowRight size={16} />
                </Link>
              </div>
            ))}
          </div>
          <div className="contact-layout">
            <section className="panel prose">
              <h2>Pertanyaan yang sering diajukan</h2>
              {[
                [
                  'Bagaimana cara membeli produk?',
                  'Cari produk, pilih jumlah, tambahkan ke keranjang, lalu masuk ke akun uji. Isi alamat, pilih pengiriman, periksa total, dan lanjutkan ke pembayaran simulasi.',
                ],
                [
                  'Apakah tersedia pengiriman ke luar kota?',
                  'Layanan dan ongkir bergantung pada tujuan, berat, dimensi, dan jenis perangkat. Pada versi uji, ongkir adalah simulasi; barang kargo diarahkan melalui penawaran.',
                ],
                [
                  'Bagaimana dengan garansi dan retur?',
                  'Cakupan serta masa garansi dikonfirmasi berdasarkan SKU dan kebijakan final. Alur permintaan retur/garansi dapat dicoba dari detail pesanan yang sudah dibayar.',
                ],
                [
                  'Bisa meminta penawaran untuk proyek?',
                  'Bisa. Isi daftar produk, jumlah, lokasi, dan kebutuhan Anda pada halaman Minta Penawaran. Pengajuan uji dapat ditinjau dari Portal Staf.',
                ],
              ].map(([q, a]) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </section>
            <aside className="panel contact-panel">
              <MapPin />
              <h2>Kunjungi kantor kami</h2>
              <p>{office}</p>
              <a href="mailto:klikfiber@gmail.com">
                <Mail size={18} /> klikfiber@gmail.com
              </a>
              <Btn outline href="/penawaran">
                Minta Penawaran <ArrowRight size={17} />
              </Btn>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
function CableIcon({ size = 24 }: { size?: number }) {
  return <Package size={size} />;
}
