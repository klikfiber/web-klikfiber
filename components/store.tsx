'use client';
import {
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CustomerAuth from './customer-auth';
import {AdminPortal,SalesArea} from './portals';
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
  SalesPortal,
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
  products: Product[];
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
      <img src="/images/klikfiber-playful.png" alt="klikfiber.id — Klik, sambung, beres!" width={3200} height={1600} />
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
  if (p.imageSrc) {
    return (
      <div
        className={'product-image ' + (large ? 'large' : '')}
        role="img"
        aria-label={p.name}
      >
        <img className="direct-product-image" src={p.imageSrc} alt={p.name} />
      </div>
    );
  }
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
 const {products}=useStore();
 const [bannerIndex,setBannerIndex]=useState(0);
 const bannerRef=useRef<HTMLDivElement>(null);
 const banners=[
  {image:'cable',tag:'HALO, SOBAT KONEKSI!',title:'Klik, sambung,',accent:'beres!',text:'Cari kebutuhan fiber? Semua kumpul di sini.',cta:'Yuk, cari produk',href:'/produk',sticker:'Good connections. Good vibes.'},
  {image:'tools',tag:'TEMAN KERJA ANDALAN',title:'Siap ngegas',accent:'di lapangan.',text:'Splicer dan alat kerja buat proyek berikutnya.',cta:'Lihat peralatannya',href:'/produk?kategori=Fusion%20Splicer',sticker:'Ready, set, connect!'},
  {image:'connect',tag:'KECIL-KECIL, PENTING!',title:'Beda ujung,',accent:'tetap nyambung.',text:'Lengkapi koneksi dari kabel sampai konektor.',cta:'Cari pelengkapnya',href:'/produk',sticker:'Let’s connect!'},
  {image:'project',tag:'PROYEK BESAR? GAS BARENG.',title:'Ide besar?',accent:'Gas bareng.',text:'Cari perangkat buat proyekmu, bareng kami.',cta:'Ngobrolin proyek',href:'/penawaran',sticker:'Big ideas welcome.'},
 ];
 const [categoryPaused,setCategoryPaused]=useState(false);
 const categoryRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(categoryPaused || matchMedia('(prefers-reduced-motion: reduce)').matches)return;const timer=setInterval(()=>{const el=categoryRef.current;if(el)el.scrollTo({left:el.scrollLeft+130>=el.scrollWidth-el.clientWidth?0:el.scrollLeft+130,behavior:'smooth'});},3500);return()=>clearInterval(timer);},[categoryPaused]);
 return (<>
      <section className="play-hero" aria-label="Inspirasi koneksi" aria-roledescription="carousel">
        <div className="play-track" ref={bannerRef} onScroll={()=>{const el=bannerRef.current;if(el)setBannerIndex(Math.round(el.scrollLeft/el.clientWidth));}}>
          {banners.map((b,i)=><article className={'play-slide play-'+b.image} key={b.image} aria-label={`${i+1} dari 4`} aria-roledescription="slide">
            <Image className="play-art" src={`/images/play-${b.image}.png`} alt="" width={1536} height={1024} sizes="(max-width:767px) 100vw, 850px" priority={i===0}/>
            <div className="play-copy"><span className="play-tag">✳ {b.tag}</span>{i===0?<h1>{b.title}<br/><em>{b.accent}</em></h1>:<h2>{b.title}<br/><em>{b.accent}</em></h2>}<p>{b.text}</p><Link className="play-cta" href={b.href}>{b.cta}<ArrowUpRight size={20}/></Link></div>
            <span className="play-sticker">{b.sticker}</span>
          </article>)}
        </div>
        <div className="play-pagination"><span>Geser, temukan yang cocok <ArrowRight size={14}/></span><div>{banners.map((b,i)=><button key={b.image} aria-label={`Lihat banner ${i+1}`} aria-pressed={bannerIndex===i} onClick={()=>bannerRef.current?.scrollTo({left:i*bannerRef.current.clientWidth,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}/>)}</div></div>
      </section>      <div className="container">
        <section className="section">
          <SectionHead
            title="Lagi cari apa, nih?"
            sub="Pilih kategori, langsung ketemu."
            href="/produk"
            label="Semua kategori"
          />
          <div className="category-grid" ref={categoryRef} onTouchStart={()=>setCategoryPaused(true)} onMouseEnter={()=>setCategoryPaused(true)} onMouseLeave={()=>setCategoryPaused(false)}>
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
            title="Kenalan sama jagoannya"
            sub="Perangkat pilihan buat teman kerja kamu."
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
            <span className="kicker">PROYEKMU, KITA BANTUIN.</span>
            <h2>
              Punya proyek seru?
              <br />
              Yuk, beresin bareng.
            </h2>
            <p>
              Dari daftar belanja sampai pilihan perangkat,
              <br className="desktop" /> tim kami siap jadi teman diskusi kamu.
            </p>
            <Btn href="/penawaran">
              Yuk, ngobrol dulu <ArrowUpRight size={18} />
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
            title="Jangan lupa si kecil ini"
            sub="Pelengkap instalasi biar makin komplit."
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
  const {products}=useStore();
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
            Menampilkan {result.length} dari {products.length} produk
          </div>
        </div>
      </div>
      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="right" className="filter-sheet">
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
  const {products}=useStore();
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
          {p.sourceUrl && (
            <a
              className="source-link"
              href={p.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              {p.sourceLabel} <ArrowUpRight size={14} />
            </a>
          )}
        </div>
      </div>
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
  const [catalog,setCatalog]=useState<Product[]>(products);
  const router=useRouter();
  const path = usePathname();
  const query = useSearchParams();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const referral = (query.get('ref') || '').trim().toUpperCase();
    if (/^[A-Z0-9-]{4,24}$/.test(referral)) localStorage.setItem('klikfiber-referral', referral);
  }, [query]);
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
    refresh().finally(() => setReady(true));
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
    try {setCatalog(await api('products'));}catch{}
    try {
      const current=await api('me');
      setProfile(current);
      setFavorites(await api('portal/customer/favorites').catch(()=>[]));
    } catch {
      setProfile(null);
    }
  }
  const state: State = {
    products:catalog,
    cart,
    favorites,
    profile,
    ready,
    refresh,
    clearCart: () => setCart([]),
    login: () => setLoginOpen(true),
    add: (p, qty = 1) => {
      if (!profile) {
        setLoginOpen(true);
        notify('Masuk atau daftar untuk menambahkan produk', 'info');
        return;
      }
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
    favorite: (id) => {
      if(!profile){setLoginOpen(true);return;}
      const next=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];
      setFavorites(next);
      api('portal/customer/favorites',{ids:next}).catch(()=>{setFavorites(favorites);notify('Wishlist belum tersimpan. Coba lagi.','error');});
    },
  };
  const count = cart.reduce((n, x) => n + x.qty, 0);
  return (
    <Context.Provider value={state}>
      <Toaster>
        <a href="#main" className="skip-link">
          Lewati ke konten
        </a>
        {path === '/' && <><div className="topbar">
          <div className="container">
            <span>
              <Truck size={14} /> Solusi fiber untuk Indonesia yang lebih
              terhubung
            </span>
            <span>
              
              <Link href="/dukungan">Pusat Bantuan</Link>
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
        </header></>}
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
          ) : path.startsWith('/myshop') || path.startsWith('/admin') || path.startsWith('/marketing') ? (
            <AdminPortal />
          ) : path.startsWith('/sales') ? (
            <SalesArea />
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
                PT KARYA FABEAL SUKSES
                <br />
                Klik, sambung, beres!
                <br />
                Teman belanja kebutuhan koneksi.
              </p>
              <div className="footer-tag">Dari satu klik, jadi banyak koneksi.</div>
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
                ['Hubungi Kami', '/dukungan'],
                ['Sales Area', '/sales'],
              ],
              [
                'Perusahaan',
                ['Tentang KLIKFIBER', '/tentang'],
                ['Solusi Proyek', '/solusi'],
                ['Penawaran B2B', '/penawaran'],
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
            <div><h3>Perlu bantuan?</h3><p>Tim kami siap membantu kebutuhan produk dan proyek Anda.</p><Link className="footer-contact" href="/dukungan">Hubungi Kami <ArrowUpRight size={16}/></Link></div>
          </div>
          <div className="container footer-bottom">
            <span>© 2026 KLIKFIBER. Semua hak dilindungi.</span>
            <span>
              <Link href="/syarat">Syarat & Ketentuan</Link>
              <Link href="/privasi">Kebijakan Privasi</Link>
            </span>
          </div>
        </footer>
        {path !== '/' && !['/myshop','/admin','/marketing','/sales'].some(prefix => path.startsWith(prefix)) && (
          <nav className="desktop-quick-nav desktop" aria-label="Navigasi cepat desktop">
            {[
              [Grid2X2, 'Beranda', '/'],
              [Cable, 'Produk', '/produk'],
              [ShoppingCart, 'Keranjang', '/keranjang'],
              [UserRound, 'Akun', '/akun'],
            ].map(([Icon, label, url]: any) => (
              <Link key={url} href={url} className={(url === '/' ? path === '/' : path.startsWith(url)) ? 'active' : ''} aria-label={label} title={label}>
                <span><Icon size={20}/>{url === '/keranjang' && count > 0 && <b>{count > 99 ? '99+' : count}</b>}</span>
                {label}
              </Link>
            ))}
          </nav>
        )}
        <nav className="bottom-nav mobile" aria-label="Navigasi utama mobile">
          {[
            [Grid2X2, 'Beranda', '/'],
            [Cable, 'Produk', '/produk'],
            [ShoppingCart, 'Keranjang', '/keranjang'],
            [UserRound, 'Akun', '/akun'],
          ].map(([Icon, label, url]: any) => (
            <Link key={url} href={url} className={(url === '/' ? path === '/' : path.startsWith(url)) ? 'active' : ''} aria-current={(url === '/' ? path === '/' : path.startsWith(url)) ? 'page' : undefined}>
              <span className="bottom-icon"><Icon size={22} />{url === '/keranjang' && count > 0 && <b className="nav-cart-count">{count > 99 ? '99+' : count}</b>}</span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <Sheet open={menu} onOpenChange={setMenu}>
          <SheetContent side="right" className="quick-menu">
            <SheetTitle>Jelajahi KLIKFIBER</SheetTitle>
            <p className="menu-intro">Belanja, konsultasi, dan bantuan.</p>
            <nav className="sheet-nav">
              {[
                ['Beranda', '/'],
                ['Semua Produk', '/produk'],
                ['Solusi Proyek', '/solusi'],
                ['Dukungan', '/dukungan'],
                ['Tentang Kami', '/tentang'],
                ['Promo', '/promo'],
                ['Akun Saya', '/akun'],
              ].map(([label, url]) => (
                <Link key={url} href={url} onClick={() => setMenu(false)}>
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
            <DialogDescription>Masuk atau daftar untuk melanjutkan pembelian dan mengelola pesanan.</DialogDescription>
            <CustomerAuth done={async()=>{await refresh();setLoginOpen(false);}} />
          </DialogContent>
        </Dialog>
      </Toaster>
    </Context.Provider>
  );
}


