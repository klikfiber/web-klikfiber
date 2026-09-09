export const categories = [
  'Semua Produk',
  'Fusion Splicer',
  'Alat Uji & Monitoring',
  'Kabel Fiber Optik',
  'Konektor & Adapter',
  'ODF & Patch Panel',
  'Closure & ODP',
  'Tools & Aksesori',
];
export type Product = {
  id: string;
  name: string;
  model: string;
  category: string;
  price: number;
  stock: number;
  image: number;
  imageSrc?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  description: string;
  unit?: string;
  quote?: boolean;
  specs: Record<string, string>;
};
export const products: Product[] = [
  {
    id: 'ucl-swift-k33',
    name: 'SWIFT K33 Fusion Splicer',
    model: 'UCL SWIFT K33',
    category: categories[1],
    price: 28500000,
    stock: 8,
    image: 0,
    imageSrc: '/images/ucl-k33-studio.png',
    sourceUrl: 'https://uclswift.com/sub/prd-detail/40',
    sourceLabel: 'Spesifikasi produsen UCL Swift',
    description:
      'Peralatan penyambung serat optik untuk kebutuhan instalasi backbone, FTTH, dan jaringan enterprise.',
    specs: {
      'Metode alignment': 'IPAAS Core Alignment',
      'Waktu splicing tipikal': '7 detik (Quick mode)',
      Layar: 'Touchscreen elektrostatis 5,0 inci',
      Elektroda: 'Hingga 18.000 kali',
      Baterai: 'Tipikal 270 siklus (4.700 mAh)',
    },
  },
  {
    id: 'ucl-swift-kf4',
    name: 'SWIFT KF4 Fusion Splicer',
    model: 'UCL SWIFT KF4',
    category: categories[1],
    price: 45000000,
    stock: 6,
    image: 1,
    imageSrc: '/images/ucl-kf4.png',
    sourceUrl: 'https://uclswift.com/sub/prd-detail/42',
    sourceLabel: 'Spesifikasi produsen UCL Swift',
    description:
      'Fusion splicer active cladding alignment yang kompatibel dengan Fusion Splice-On Connector.',
    specs: {
      'Metode alignment': 'Active Cladding Alignment',
      'Waktu splicing tipikal': '7 detik',
      Elektroda: 'Hingga 38.000 kali',
      Baterai: 'Tipikal 200 siklus (3.400 mAh)',
    },
  },
  {
    id: 'ucl-swift-k11',
    name: 'SWIFT K11 Fusion Splicer',
    model: 'UCL SWIFT K11',
    category: categories[1],
    price: 2850000,
    stock: 12,
    image: 2,
    imageSrc: '/images/ucl-k11.png',
    sourceUrl: 'https://uclswift.com/sub/prd-detail/39',
    sourceLabel: 'Spesifikasi produsen UCL Swift',
    description:
      'Fusion splicer core alignment dengan layar sentuh untuk pekerjaan instalasi profesional.',
    specs: {
      'Metode alignment': 'IPAAS Core Alignment',
      'Waktu splicing tipikal': '6 detik (Quick mode)',
      Layar: 'Touchscreen elektrostatis 5,0 inci',
      Baterai: 'Tipikal 270 siklus (4.700 mAh)',
    },
  },
  {
    id: 'ucl-swift-cs-01bt',
    name: 'SWIFT Automatic Cleaver',
    model: 'CS-01BT',
    category: categories[7],
    price: 3250000,
    stock: 8,
    image: 3,
    imageSrc: '/images/ucl-cleaver.png',
    sourceUrl: 'https://uclswift.com/sub/prd-detail/37',
    sourceLabel: 'Spesifikasi produsen UCL Swift',
    description:
      'Cleaver otomatis dengan penggantian kanal, pemotongan, dan pengumpulan serpihan fiber.',
    specs: {
      Sistem: 'Oil damper',
      Fungsi: 'Pemotongan dan pengumpulan serpihan otomatis',
      Kompatibilitas: 'K33, KF4, KR12',
    },
  },
  {
    id: 'kabel-fiber-single-mode',
    name: 'Fiber Optic Cable Single Mode',
    model: 'KF-SM-01',
    category: categories[3],
    price: 5500,
    stock: 5000,
    image: 4,
    unit: 'meter',
    quote: true,
    description:
      'Kabel fiber optik untuk jaringan proyek. Pengiriman drum dikonfirmasi melalui penawaran.',
    specs: {
      'Tipe serat': 'Single mode',
      Satuan: 'Meter',
      Pengiriman: 'Penawaran kargo',
    },
  },
  {
    id: 'konektor-sc-upc',
    name: 'Konektor SC/UPC',
    model: 'KF-SC-UPC',
    category: categories[4],
    price: 2500,
    stock: 250,
    image: 5,
    description:
      'Konektor SC/UPC untuk kebutuhan terminasi jaringan fiber optik.',
    specs: { Konektor: 'SC', Polishing: 'UPC', Satuan: 'Pcs' },
  },
  {
    id: 'konektor-lc-upc',
    name: 'Konektor LC/UPC',
    model: 'KF-LC-UPC',
    category: categories[4],
    price: 3500,
    stock: 180,
    image: 6,
    description:
      'Konektor LC/UPC untuk sambungan fiber optik dengan bentuk ringkas.',
    specs: { Konektor: 'LC', Polishing: 'UPC', Satuan: 'Pcs' },
  },
  {
    id: 'patch-cord-sc-upc',
    name: 'Patch Cord Fiber Optik',
    model: 'Fabeal Catalog Example',
    category: categories[3],
    price: 45000,
    stock: 42,
    image: 7,
    imageSrc: '/images/patch-cord-studio.png',
    sourceUrl: 'https://fabeal.co.id/',
    sourceLabel: 'Contoh produk dari katalog Fabeal',
    description:
      'Patch cord fiber optik dari contoh katalog FTTH Fabeal. Jenis polish, fiber, dan dimensi perlu dikonfirmasi.',
    specs: {
      Kategori: 'FTTH Products',
      Catatan: 'Spesifikasi konektor dan panjang belum diverifikasi',
    },
  },
  {
    id: 'patch-panel-24-port',
    name: 'Patch Panel 24 Port SC/UPC',
    model: 'KF-ODF-24',
    category: categories[5],
    price: 750000,
    stock: 18,
    image: 8,
    description:
      'Panel distribusi untuk pengelolaan koneksi serat optik yang rapi.',
    specs: { Port: '24', Konektor: 'SC/UPC' },
  },
  {
    id: 'closure-24-core',
    name: 'Fiber Optic Closure 24 Core',
    model: 'KF-CL-24',
    category: categories[6],
    price: 985000,
    stock: 22,
    image: 9,
    description: 'Pelindung sambungan fiber optik untuk jaringan distribusi.',
    specs: { 'Kapasitas contoh': '24 core', Kategori: 'Closure' },
  },
  {
    id: 'ftth-drop-stripper',
    name: 'FTTH Drop Cable Stripper',
    model: 'KF-STR-01',
    category: categories[7],
    price: 85000,
    stock: 35,
    image: 10,
    description: 'Perkakas pengupas kabel untuk pekerjaan instalasi FTTH.',
    specs: { Tipe: 'Drop cable stripper', Penggunaan: 'Instalasi FTTH' },
  },
  {
    id: 'media-converter',
    name: 'Media Converter Gigabit',
    model: 'KF-MC-1G',
    category: categories[7],
    price: 325000,
    stock: 0,
    image: 11,
    description:
      'Perangkat konversi media untuk konektivitas jaringan. Hubungi tim untuk ketersediaan.',
    specs: { 'Kecepatan contoh': 'Gigabit', Tipe: 'Media converter' },
  },
];
export const rupiah = (value: number) =>
  'Rp ' + new Intl.NumberFormat('id-ID').format(value);
export type CartItem = { id: string; qty: number };
export const shipping = [
  { id: 'regular', name: 'Reguler', cost: 20000, eta: '2–4 hari kerja' },
  { id: 'sameday', name: 'Same Day', cost: 60000, eta: 'Hari yang sama' },
  { id: 'cargo', name: 'Cargo', cost: 150000, eta: '3–7 hari kerja' },
];
