'use client';
import {
  useEffect,
  useState,
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Search,
  ShoppingCart,
  UserRound,
  Menu,
  Truck,
  ShieldCheck,
  Headset,
  Building2,
  Cable,
  SlidersHorizontal,
  Grid2X2,
  List,
  Heart,
  Plus,
  Minus,
  FileText,
  Package,
  Gift,
  CircleCheck,
  Zap,
  X,
  ArrowUpRight,
  Wrench,
  LockKeyhole,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Toaster, toast } from '@/components/ui/toast';
import {
  products,
  categories,
  rupiah,
  type Product,
  type CartItem,
} from '@/lib/catalog';
import {
  Checkout,
  Account,
  Backoffice,
  QuoteForm,
  Information,
} from '@/components/workflows';
export async function api(path: string, body?: unknown) {
  const r = await fetch('/api/v1/' + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j: any = await r.json();
  if (!r.ok)
    throw new Error(j.message || 'Terjadi kendala. Silakan coba lagi.');
  return j.data;
}
export const notify = (title: string, type = 'success') =>
  toast.add({ title, type });
export type State = {
  cart: CartItem[];
  favorites: string[];
  profile: any;
  ready: boolean;
  add: (p: Product, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  favorite: (id: string) => void;
  login: () => void;
  refresh: () => Promise<void>;
  clearCart: () => void;
};
const Context = createContext<State>(null!);
export const useStore = () => useContext(Context);
export function Logo() {
  return (
    <Link className="logo" href="/" aria-label="KLIKFIBER beranda">
      <svg viewBox="0 0 50 50" aria-hidden="true">
        <path fill="#0B1F3A" d="M4 3h12v44H8l-4-5z" />
        <path fill="#00A6C8" d="M18 23 36 3h14L28 25l22 22H35L17 28z" />
        <circle
          cx="16"
          cy="25"
          r="6"
          fill="#00A6C8"
          stroke="white"
          strokeWidth="3"
        />
      </svg>
      <span>
        KLIK<b>FIBER</b>
      </span>
    </Link>
  );
}
export function ProductImage({
  p,
  large = false,
}: {
  p: Product;
  large?: boolean;
}) {
  const boxes = [
    [336, 245, 245, 158],
    [642, 240, 245, 163],
    [950, 218, 206, 183],
    [1228, 242, 246, 163],
    [342, 594, 231, 153],
    [642, 598, 240, 150],
    [950, 593, 219, 149],
    [1227, 592, 249, 153],
    [605, 588, 141, 83],
    [783, 588, 141, 83],
    [953, 588, 143, 83],
    [1305, 588, 141, 83],
  ];
  const [x, y, w, h] =
    large && p.image === 0 ? [170, 155, 368, 333] : boxes[p.image];
  const file =
    large && p.image === 0 ? 'detail' : p.image > 7 ? 'home' : 'catalog';
  return (
    <div
      className={'product-image ' + (large ? 'large' : '')}
      role="img"
      aria-label={p.name}
    >
      <div
        style={{
          aspectRatio: `${w}/${h}`,
          width: '100%',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <img
          src={'/images/' + file + '.png'}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            maxWidth: 'none',
            width: `${(1536 / w) * 100}%`,
            height: 'auto',
            left: `${(-x / w) * 100}%`,
            top: `${(-y / h) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
export function Btn({
  children,
  href,
  onClick,
  outline = false,
  disabled = false,
  type = 'button',
  className = '',
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  outline?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) {
  const cls = `btn ${outline ? 'outline' : ''} ${className}`;
  return href ? (
    <Link className={cls} href={href}>
      {children}
    </Link>
  ) : (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
export function Quantity({
  value,
  onChange,
  max = 99,
}: {
  value: number;
  onChange: (n: number) => void;
  max?: number;
}) {
  return (
    <div className="quantity">
      <button
        aria-label="Kurangi jumlah"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={16} />
      </button>
      <span>{value}</span>
      <button
        aria-label="Tambah jumlah"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
export function ProductCard({ p }: { p: Product }) {
  const s = useStore();
  return (
    <article className="product-card">
      <Link href={'/produk/' + p.id} className="product-visual">
        <ProductImage p={p} />
      </Link>
      <span
        className={
          'stock-tag ' + (!p.stock ? 'out' : p.quote ? 'quotation' : '')
        }
      >
        {p.quote ? 'Penawaran kargo' : p.stock ? 'Stok tersedia' : 'Stok habis'}
      </span>
      <button
        className={'favorite ' + (s.favorites.includes(p.id) ? 'selected' : '')}
        aria-label={'Simpan ' + p.name}
        onClick={() => s.favorite(p.id)}
      >
        <Heart size={17} />
      </button>
      <div className="product-copy">
        <span className="eyebrow">{p.category}</span>
        <Link href={'/produk/' + p.id} className="product-name">
          {p.name}
        </Link>
        <p className="model">{p.model}</p>
        <div className="product-price">
          {rupiah(p.price)}
          {p.unit && <small> / {p.unit}</small>}
        </div>
        <div className="card-bottom">
          <span className="small muted">
            {p.quote
              ? 'Ongkir dikonfirmasi'
              : p.stock
                ? `${p.stock} ${p.unit || 'unit'} tersedia`
                : 'Hubungi tim kami'}
          </span>
          <button
            aria-label={
              p.quote ? 'Minta penawaran' : 'Tambah ' + p.name + ' ke keranjang'
            }
            className="cart-btn"
            onClick={() =>
              p.quote ? location.assign('/penawaran?produk=' + p.id) : s.add(p)
            }
            disabled={!p.stock}
          >
            {p.quote ? <FileText size={19} /> : <ShoppingCart size={19} />}
          </button>
        </div>
      </div>
    </article>
  );
}
export function SectionHead({
  title,
  sub,
  href,
  label = 'Lihat semua produk',
}: {
  title: string;
  sub?: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="section-head">
      <div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {href && (
        <Link href={href}>
          {label}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function Benefits() {
  return (
    <div className="benefits">
      {[
        [
          Truck,
          'Pengiriman seluruh Indonesia',
          'Pilihan layanan sesuai kebutuhan',
        ],
        [ShieldCheck, 'Informasi garansi jelas', 'Belanja dengan lebih tenang'],
        [Headset, 'Dukungan teknis', 'Bantuan untuk kebutuhan Anda'],
        [Building2, 'Solusi pengadaan B2B', 'Untuk bisnis dan proyek'],
      ].map(([Icon, title, sub]: any) => (
        <div key={title}>
          <span className="benefit-icon">
            <Icon />
          </span>
          <span>
            <strong>{title}</strong>
            <small>{sub}</small>
          </span>
        </div>
      ))}
    </div>
  );
}
function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="kicker">
              <span /> SOLUSI KONEKTIVITAS ANDA
            </span>
            <h1>
              Klik kebutuhan
              <br />
              fiber, <em>beres.</em>
            </h1>
            <p>
              Perangkat, aksesori, dan solusi fiber optik berkualitas untuk
              proyek Anda. Semua di satu tempat.
            </p>
            <div className="row">
              <Btn href="/produk">
                Jelajahi Produk <ArrowRight size={18} />
              </Btn>
              <Btn outline href="/penawaran">
                <FileText size={18} /> Minta Penawaran
              </Btn>
            </div>
            <div className="hero-note">
              <ShieldCheck size={17} /> Pilihan tepat untuk teknisi, ISP, dan
              bisnis Anda
            </div>
          </div>
          <div className="hero-product">
            <ProductImage p={products[0]} large />
            <div className="hero-product-label">
              <span className="tiny-pill">PROFESSIONAL SERIES</span>
              <strong>Presisi di setiap sambungan.</strong>
              <span>Fusion Splicer · Core Alignment</span>
            </div>
          </div>
          <div className="hero-pagination">
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>
      <div className="container">
        <Benefits />
        <section className="section">
          <SectionHead
            title="Temukan kebutuhan Anda"
            sub="Dari sambungan pertama hingga jaringan yang lebih luas."
            href="/produk"
            label="Semua kategori"
          />
          <div className="category-grid">
            {[
              [Cable, 3, 'Kabel Fiber Optik'],
              [Zap, 4, 'Konektor & Adapter'],
              [Grid2X2, 5, 'ODF & Patch Panel'],
              [Package, 6, 'Closure & ODP'],
              [Wrench, 7, 'Tools & Splicing'],
              [SlidersHorizontal, 2, 'Alat Uji & Monitoring'],
            ].map(([Icon, c, title]: any) => (
              <Link
                key={title}
                href={'/produk?kategori=' + encodeURIComponent(categories[c])}
              >
                <span>
                  <Icon size={29} />
                </span>
                <strong>{title}</strong>
                <ChevronRight size={16} />
              </Link>
            ))}
          </div>
        </section>
        <section className="section">
          <SectionHead
            title="Peralatan andalan, siap bekerja"
            sub="Pilihan perangkat untuk mendukung pekerjaan Anda."
            href="/produk"
          />
          <div className="product-grid home-grid">
            {[products[0], products[1], products[2], products[7]].map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
        <section className="b2b">
          <div>
            <span className="kicker">UNTUK BISNIS & PROYEK ANDA</span>
            <h2>
              Proyek lebih besar.
              <br />
              Pengadaan lebih mudah.
            </h2>
            <p>
              Konsultasikan daftar kebutuhan Anda. Dapatkan penawaran
              <br className="desktop" /> yang sesuai untuk perusahaan, ISP, dan
              integrator.
            </p>
            <Btn href="/penawaran">
              Minta Penawaran B2B <ArrowUpRight size={18} />
            </Btn>
          </div>
          <div className="b2b-features">
            {[
              'Penawaran sesuai volume proyek',
              'Konsultasi kompatibilitas perangkat',
              'Koordinasi pengiriman dan pengadaan',
            ].map((t) => (
              <div key={t}>
                <CircleCheck size={20} />
                {t}
              </div>
            ))}
            <Building2 className="building-art" />
          </div>
        </section>
        <section className="section">
          <SectionHead
            title="Lengkapi instalasi Anda"
            sub="Komponen kecil yang membuat koneksi lebih baik."
            href="/produk"
          />
          <div className="product-grid home-grid">
            {[products[5], products[8], products[9], products[10]].map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
function Catalog() {
  const query = useSearchParams();
  const [category, setCategory] = useState(
    query.get('kategori') || categories[0],
  );
  const [search, setSearch] = useState(query.get('q') || '');
  const [sort, setSort] = useState('Pilihan');
  const [inStock, setInStock] = useState(false);
  const [max, setMax] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [list, setList] = useState(false);
  useEffect(() => {
    setSearch(query.get('q') || '');
    setCategory(query.get('kategori') || categories[0]);
  }, [query]);
  const result = products
    .filter(
      (p) =>
        (category === categories[0] || p.category === category) &&
        (!inStock || p.stock > 0) &&
        (!max || p.price <= Number(max)) &&
        `${p.name} ${p.model}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'Harga terendah'
        ? a.price - b.price
        : sort === 'Harga tertinggi'
          ? b.price - a.price
          : 0,
    );
  const reset = () => {
    setCategory(categories[0]);
    setSearch('');
    setInStock(false);
    setMax('');
  };
  const filters = (
    <>
      <h3>Kategori Produk</h3>
      <div className="filter-categories">
        {categories.map((c) => (
          <button
            key={c}
            className={category === c ? 'active' : ''}
            onClick={() => setCategory(c)}
          >
            {c}
            <span>
              {c === categories[0]
                ? products.length
                : products.filter((p) => p.category === c).length}
            </span>
          </button>
        ))}
      </div>
      <div className="filter-block">
        <h3>Harga</h3>
        <label className="small" htmlFor="price-max">
          Harga maksimum (Rp)
        </label>
        <input
          id="price-max"
          type="number"
          min="0"
          placeholder="Tanpa batas"
          value={max}
          onChange={(e) => setMax(e.target.value)}
        />
      </div>
      <div className="filter-block">
        <h3>Ketersediaan</h3>
        <label className="check-label">
          <Checkbox checked={inStock} onCheckedChange={setInStock} /> Stok
          tersedia
        </label>
      </div>
      <Btn outline onClick={reset}>
        Reset filter
      </Btn>
      <div className="filter-help">
        <Headset />
        <h3>Butuh rekomendasi?</h3>
        <p>Konsultasikan kebutuhan proyek Anda.</p>
        <Link href="/penawaran">
          Hubungi tim <ArrowRight size={15} />
        </Link>
      </div>
    </>
  );
  return (
    <main className="container page">
      <div className="breadcrumb">
        <Link href="/">Beranda</Link>
        <ChevronRight size={13} /> Semua Produk
      </div>
      <div className="catalog-layout">
        <aside className="filters">{filters}</aside>
        <div>
          <div className="page-heading">
            <span className="kicker">KATALOG KLIKFIBER</span>
            <h1>Produk Fiber Optik</h1>
            <p>Perangkat dan aksesori untuk jaringan yang lebih baik.</p>
          </div>
          <div className="catalog-toolbar">
            <label className="search">
              <Search size={19} />
              <input
                aria-label="Cari dalam katalog"
                placeholder="Cari produk atau kode SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <button
              className="icon-btn mobile"
              aria-label="Filter produk"
              onClick={() => setDrawer(true)}
            >
              <SlidersHorizontal />
            </button>
            <Select value={sort} onValueChange={(v) => setSort(v || 'Pilihan')}>
              <SelectTrigger
                className="sort-select"
                aria-label="Urutkan produk"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['Pilihan', 'Harga terendah', 'Harga tertinggi'].map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              className="icon-btn desktop"
              aria-label="Tampilan grid"
              onClick={() => setList(false)}
            >
              <Grid2X2 />
            </button>
            <button
              className="icon-btn desktop"
              aria-label="Tampilan daftar"
              onClick={() => setList(true)}
            >
              <List />
            </button>
          </div>
          <div className="result-row">
            <span>{result.length} produk ditemukan</span>
            {category !== categories[0] && (
              <button
                className="chip"
                onClick={() => setCategory(categories[0])}
              >
                {category}
                <X size={14} />
              </button>
            )}
          </div>
          <div
            className={'product-grid catalog-grid ' + (list ? 'list-view' : '')}
          >
            {result.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
          {!result.length && (
            <div className="empty">
              <Search size={42} />
              <h2>Produk belum ditemukan</h2>
              <p>Coba kata kunci lain atau ubah filter Anda.</p>
              <Btn onClick={reset}>Tampilkan semua produk</Btn>
            </div>
          )}
          <div className="catalog-foot">
            Menampilkan {result.length} dari {products.length} produk contoh
          </div>
        </div>
      </div>
      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="left" className="filter-sheet">
          <SheetTitle>Filter Produk</SheetTitle>
          {filters}
          <Btn onClick={() => setDrawer(false)}>
            Lihat {result.length} produk
          </Btn>
        </SheetContent>
      </Sheet>
    </main>
  );
}
function Detail({ id }: { id: string }) {
  const p = products.find((p) => p.id === id);
  const s = useStore();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [zoom, setZoom] = useState(false);
  if (!p)
    return (
      <main className="container empty">
        <Package />
        <h1>Produk tidak ditemukan</h1>
        <Btn href="/produk">Kembali ke katalog</Btn>
      </main>
    );
  return (
    <main className="container page">
      <div className="breadcrumb">
        <Link href="/">Beranda</Link>
        <ChevronRight size={13} />
        <Link href="/produk">Produk</Link>
        <ChevronRight size={13} />
        {p.name}
      </div>
      <div className="detail-grid">
        <div>
          <button
            className="gallery"
            aria-label="Perbesar foto produk"
            onClick={() => setZoom(true)}
          >
            <ProductImage p={p} large />
            <span>
              <Search size={18} /> Perbesar foto
            </span>
          </button>
          <p className="small muted">
            Gambar ilustrasi dari mockup · {p.model}
          </p>
        </div>
        <div className="detail-info">
          <span className="kicker">{p.category}</span>
          <h1>
            {p.name} {p.model}
          </h1>
          <div className="detail-meta">
            <span>SKU: {p.model}</span>
            <span className={p.stock ? 'green' : 'muted'}>
              ● {p.stock ? 'Stok tersedia' : 'Stok habis'}
            </span>
          </div>
          <div className="detail-price">
            {rupiah(p.price)}
            {p.unit && <small> / {p.unit}</small>}
          </div>
          <p>{p.description}</p>
          <div className="info-strip">
            <ShieldCheck size={23} />
            <span>
              Garansi dan isi paket diinformasikan pada penawaran final.
            </span>
          </div>
          <strong>Jumlah</strong>
          <div className="purchase-row">
            <Quantity
              value={qty}
              onChange={setQty}
              max={Math.min(99, p.stock)}
            />
            {p.quote ? (
              <Btn href={'/penawaran?produk=' + p.id}>
                Minta Penawaran <FileText size={18} />
              </Btn>
            ) : (
              <Btn disabled={!p.stock} onClick={() => s.add(p, qty)}>
                <ShoppingCart size={19} /> Tambah ke Keranjang
              </Btn>
            )}
          </div>
          {!p.quote && (
            <Btn
              className="full"
              disabled={!p.stock}
              onClick={() => {
                s.add(p, qty);
                router.push('/checkout');
              }}
            >
              Beli Sekarang <ArrowRight size={18} />
            </Btn>
          )}
          <Link className="quote-link" href={'/penawaran?produk=' + p.id}>
            <FileText size={18} /> Minta Penawaran Proyek{' '}
            <ChevronRight size={18} />
          </Link>
          <p className="small muted">
            Harga dan spesifikasi contoh. Belum untuk transaksi nyata.
          </p>
        </div>
      </div>
      <Benefits />
      <Tabs defaultValue="description" className="detail-tabs">
        <TabsList variant="line">
          {[
            ['description', 'Deskripsi'],
            ['specs', 'Spesifikasi'],
            ['package', 'Isi Paket & Garansi'],
            ['compatibility', 'Kompatibilitas'],
          ].map(([id, label]) => (
            <TabsTrigger key={id} value={id}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="description">
          <h3>Tentang {p.name}</h3>
          <p>{p.description}</p>
          <p>
            Diskusikan kebutuhan instalasi, jumlah, dan tujuan pengiriman
            bersama tim KLIKFIBER melalui permintaan penawaran proyek.
          </p>
        </TabsContent>
        <TabsContent value="specs">
          <dl className="spec-table">
            {Object.entries(p.specs).map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="small muted">
            Spesifikasi contoh dari mockup; verifikasi dokumen produsen sebelum
            pembelian.
          </p>
        </TabsContent>
        <TabsContent value="package">
          <h3>Isi paket & garansi</h3>
          <p>
            Unit {p.name}. Aksesori, dokumen, masa garansi, serta pengecualian
            dikonfirmasi melalui penawaran final.
          </p>
        </TabsContent>
        <TabsContent value="compatibility">
          <h3>Pastikan perangkat kompatibel</h3>
          <p>
            Kirimkan tipe serat, konektor, dan perangkat yang Anda gunakan.
            Kompatibilitas perlu diperiksa sebelum pembelian.
          </p>
          <Btn outline href="/penawaran">
            Konsultasi kompatibilitas
          </Btn>
        </TabsContent>
      </Tabs>
      <section className="section">
        <SectionHead title="Lengkapi kebutuhan Anda" href="/produk" />
        <div className="product-grid home-grid">
          {products
            .filter((x) => x.id !== p.id && !x.quote)
            .slice(0, 4)
            .map((x) => (
              <ProductCard key={x.id} p={x} />
            ))}
        </div>
      </section>
      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="zoom-dialog">
          <DialogTitle>{p.name}</DialogTitle>
          <DialogDescription>Foto ilustrasi produk</DialogDescription>
          <ProductImage p={p} large />
        </DialogContent>
      </Dialog>
      <div className="mobile-buy mobile">
        <strong>{rupiah(p.price)}</strong>
        <Btn
          disabled={!p.stock}
          onClick={() =>
            p.quote ? router.push('/penawaran?produk=' + p.id) : s.add(p, qty)
          }
        >
          {p.quote ? 'Penawaran' : 'Tambah ke Keranjang'}
        </Btn>
      </div>
    </main>
  );
}
export default function Store() {
  const path = usePathname();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem('klikfiber-cart') || '[]');
      setCart(
        c.filter(
          (x: any) =>
            products.some((p) => p.id === x.id) &&
            Number.isInteger(x.qty) &&
            x.qty > 0 &&
            x.qty <= 99,
        ),
      );
      setFavorites(
        JSON.parse(localStorage.getItem('klikfiber-favorites') || '[]'),
      );
    } catch {}
    setReady(true);
    refresh();
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem('klikfiber-cart', JSON.stringify(cart));
  }, [cart, ready]);
  useEffect(() => {
    if (ready)
      localStorage.setItem('klikfiber-favorites', JSON.stringify(favorites));
  }, [favorites, ready]);
  useEffect(() => {
    setMenu(false);
  }, [path]);
  async function refresh() {
    try {
      setProfile(await api('me'));
    } catch {
      setProfile(null);
    }
  }
  const state: State = {
    cart,
    favorites,
    profile,
    ready,
    refresh,
    clearCart: () => setCart([]),
    login: () => setLoginOpen(true),
    add: (p, qty = 1) => {
      if (!p.stock || p.quote) return;
      setCart((c) => {
        const previous = c.find((x) => x.id === p.id)?.qty || 0;
        if (previous + qty > Math.min(99, p.stock)) {
          notify('Jumlah melebihi stok tersedia', 'error');
          return c;
        }
        notify('Produk ditambahkan ke keranjang');
        return previous
          ? c.map((x) => (x.id === p.id ? { ...x, qty: x.qty + qty } : x))
          : [...c, { id: p.id, qty }];
      });
    },
    setQty: (id, qty) =>
      setCart((c) =>
        qty === 0
          ? c.filter((x) => x.id !== id)
          : c.map((x) =>
              x.id === id
                ? {
                    ...x,
                    qty: Math.min(
                      qty,
                      99,
                      products.find((p) => p.id === id)!.stock,
                    ),
                  }
                : x,
            ),
      ),
    favorite: (id) =>
      setFavorites((f) =>
        f.includes(id) ? f.filter((x) => x !== id) : [...f, id],
      ),
  };
  const count = cart.reduce((n, x) => n + x.qty, 0);
  return (
    <Context.Provider value={state}>
      <Toaster>
        <a href="#main" className="skip-link">
          Lewati ke konten
        </a>
        <div className="topbar">
          <div className="container">
            <span>
              <Truck size={14} /> Solusi fiber untuk Indonesia yang lebih
              terhubung
            </span>
            <span>
              <span className="demo-dot" /> MODE UJI <i />{' '}
              <Link href="/dukungan">Pusat Bantuan</Link>
              <i />
              <Link href="/admin">Portal Staf</Link>
            </span>
          </div>
        </div>
        <header className="header">
          <div className="container header-main">
            <button
              className="icon-btn mobile menu-toggle"
              aria-label="Buka menu"
              onClick={() => setMenu(true)}
            >
              <Menu />
            </button>
            <Logo />
            <form className="search header-search" action="/produk">
              <Search size={19} />
              <input
                name="q"
                aria-label="Cari produk"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari produk, kategori, atau kebutuhan fiber..."
              />
              <button aria-label="Cari">
                <ArrowRight size={18} />
              </button>
            </form>
            <Link className="header-action account-action" href="/akun">
              <UserRound size={24} />
              <span>
                <small>Selamat datang</small>
                <strong>{profile ? profile.name : 'Akun Saya'}</strong>
              </span>
            </Link>
            <Link className="header-action cart-link" href="/keranjang">
              <span className="cart-icon">
                <ShoppingCart size={25} />
                <b>{count}</b>
              </span>
              <span className="desktop">Keranjang</span>
            </Link>
          </div>
          <nav className="desktop-nav container">
            <Link className={path === '/' ? 'active' : ''} href="/">
              Beranda
            </Link>
            <Link
              className={path.startsWith('/produk') ? 'active' : ''}
              href="/produk"
            >
              Produk <ChevronDown size={14} />
            </Link>
            <Link href="/solusi">Solusi Proyek</Link>
            <Link href="/dukungan">Dukungan</Link>
            <Link href="/tentang">Tentang Kami</Link>
            <Link className="nav-promo" href="/promo">
              <Gift size={16} /> Promo Pilihan
            </Link>
            <span className="nav-help">
              <Headset size={17} /> Siap bantu kebutuhan Anda
            </span>
          </nav>
        </header>
        <div id="main">
          {path === '/' ? (
            <Home />
          ) : path === '/produk' ? (
            <Catalog />
          ) : path.startsWith('/produk/') ? (
            <Detail key={path} id={path.split('/')[2]} />
          ) : ['/keranjang', '/checkout'].includes(path) ? (
            <Checkout />
          ) : path.startsWith('/pembayaran/') ? (
            <Checkout paymentId={path.split('/')[2]} />
          ) : path.startsWith('/akun') ? (
            <Account />
          ) : path.startsWith('/admin') || path.startsWith('/marketing') ? (
            <Backoffice />
          ) : path === '/penawaran' ? (
            <QuoteForm />
          ) : (
            <Information page={path} />
          )}
        </div>
        <footer className="footer">
          <div className="container footer-grid">
            <div>
              <Logo />
              <p>
                Menghubungkan kebutuhan.
                <br />
                Membangun masa depan.
              </p>
              <div className="footer-tag">Koneksi untuk Indonesia.</div>
            </div>
            {[
              [
                'Belanja',
                ['Semua Produk', '/produk'],
                ['Kabel Fiber Optik', '/produk?kategori=Kabel%20Fiber%20Optik'],
                [
                  'Peralatan & Tools',
                  '/produk?kategori=Tools%20%26%20Aksesori',
                ],
                ['Promo', '/promo'],
              ],
              [
                'Dukungan',
                ['Pusat Bantuan', '/dukungan'],
                ['Pengiriman', '/pengiriman'],
                ['Garansi & Retur', '/garansi'],
                ['Hubungi Kami', '/penawaran'],
              ],
              [
                'Perusahaan',
                ['Tentang KLIKFIBER', '/tentang'],
                ['Solusi Proyek', '/solusi'],
                ['Penawaran B2B', '/penawaran'],
                ['Portal Staf', '/admin'],
              ],
            ].map(([title, ...links]: any) => (
              <div key={title}>
                <h3>{title}</h3>
                {links.map(([label, url]: string[]) => (
                  <Link key={label} href={url}>
                    {label}
                  </Link>
                ))}
              </div>
            ))}
            <div>
              <h3>Mari bangun koneksi.</h3>
              <a className="footer-contact" href="mailto:klikfiber@gmail.com">
                klikfiber@gmail.com <ArrowUpRight size={16} />
              </a>
              <p>
                Jalan Mayor Madmuin Hasibuan. 4B RT.003/024, Margahayu, Kec.
                Bekasi Tim., Kota Bks, Jawa Barat 17113
              </p>
            </div>
          </div>
          <div className="container footer-bottom">
            <span>© 2026 KLIKFIBER. Semua hak dilindungi.</span>
            <span>
              <Link href="/syarat">Syarat & Ketentuan</Link>
              <Link href="/privasi">Kebijakan Privasi</Link>
            </span>
          </div>
          <div className="demo-footer">
            Lingkungan uji · Produk, harga, stok, pembayaran, dan pengiriman
            adalah simulasi.
          </div>
        </footer>
        <nav className="bottom-nav mobile">
          {[
            [Grid2X2, 'Beranda', '/'],
            [Cable, 'Produk', '/produk'],
            [Heart, 'Favorit', '/akun/wishlist'],
            [UserRound, 'Akun', '/akun'],
          ].map(([Icon, label, url]: any) => (
            <Link key={url} href={url} className={path === url ? 'active' : ''}>
              <Icon size={22} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <Sheet open={menu} onOpenChange={setMenu}>
          <SheetContent side="left">
            <SheetTitle>Menu KLIKFIBER</SheetTitle>
            <nav className="sheet-nav">
              {[
                ['Beranda', '/'],
                ['Semua Produk', '/produk'],
                ['Solusi Proyek', '/solusi'],
                ['Dukungan', '/dukungan'],
                ['Tentang Kami', '/tentang'],
                ['Promo', '/promo'],
                ['Akun Saya', '/akun'],
                ['Portal Staf', '/admin'],
              ].map(([label, url]) => (
                <Link key={url} href={url}>
                  {label}
                  <ChevronRight size={17} />
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
          <DialogContent className="login-dialog">
            <DialogTitle>Selamat datang di KLIKFIBER</DialogTitle>
            <DialogDescription>
              Masuk ke akun uji untuk menyimpan alamat, membuat pesanan
              simulasi, dan mencoba pengadaan proyek.
            </DialogDescription>
            <div className="info-strip">
              <LockKeyhole />
              <span>
                Tidak perlu email atau kata sandi asli. Akun uji ini hanya untuk
                sesi browser Anda.
              </span>
            </div>
            <Btn
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api('auth/demo', {});
                  await refresh();
                  setLoginOpen(false);
                  notify('Berhasil masuk ke akun uji');
                } catch (e: any) {
                  notify(e.message, 'error');
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Menyiapkan akun…' : 'Masuk sebagai pelanggan uji'}
              <ArrowRight size={18} />
            </Btn>
            <p className="small muted">
              Google dan email OTP diaktifkan setelah konfigurasi provider
              tersedia.
            </p>
          </DialogContent>
        </Dialog>
      </Toaster>
    </Context.Provider>
  );
}
