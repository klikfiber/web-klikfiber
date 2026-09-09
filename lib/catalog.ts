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
  description: string;
  unit?: string;
  quote?: boolean;
  specs: Record<string, string>;
};
export const products: Product[] = [
  {
    id: 'fusion-splicer-kf-fs-88',
    name: 'Fusion Splicer Core Alignment',
    model: 'KF-FS-88',
    category: categories[1],
    price: 28500000,
    stock: 8,
    image: 0,
    description:
      'Peralatan penyambung serat optik untuk kebutuhan instalasi backbone, FTTH, dan jaringan enterprise.',
    specs: {
      'Metode alignment': 'Core alignment',
      'Waktu splicing': '7 detik',
      Layar: 'LCD 5 inci',
      'Garansi contoh': '12 bulan',
    },
  },
  {
    id: 'otdr-1310-1550',
    name: 'OTDR 1310/1550nm',
    model: 'KF-OTDR-3300',
    category: categories[2],
    price: 45000000,
    stock: 6,
    image: 1,
    description:
      'Pengujian dan pemantauan jalur fiber optik untuk kebutuhan instalasi dan pemeliharaan.',
    specs: {
      'Panjang gelombang': '1310 / 1550 nm',
      Penggunaan: 'Pengujian jalur fiber',
      'Garansi contoh': '12 bulan',
    },
  },
  {
    id: 'optical-power-meter',
    name: 'Optical Power Meter',
    model: 'KF-OPM-100',
    category: categories[2],
    price: 2850000,
    stock: 12,
    image: 2,
    description:
      'Alat ukur daya optik portabel untuk pekerjaan teknisi di lapangan.',
    specs: {
      Tipe: 'Optical power meter',
      Penggunaan: 'Pengukuran daya optik',
      'Garansi contoh': '12 bulan',
    },
  },
  {
    id: 'fiber-cleaver',
    name: 'Fiber Cleaver High Precision',
    model: 'KF-FC-16',
    category: categories[7],
    price: 3250000,
    stock: 8,
    image: 3,
    description: 'Pemotong serat optik untuk persiapan proses penyambungan.',
    specs: {
      Tipe: 'Fiber cleaver',
      Penggunaan: 'Persiapan penyambungan',
      'Garansi contoh': '12 bulan',
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
    name: 'Patch Cord SC/UPC–SC/UPC',
    model: 'KF-PC-SC-SC-3M',
    category: categories[3],
    price: 45000,
    stock: 42,
    image: 7,
    description:
      'Patch cord single mode untuk menghubungkan perangkat dan distribusi fiber optik.',
    specs: {
      Konektor: 'SC/UPC–SC/UPC',
      'Panjang contoh': '3 meter',
      'Tipe serat': 'Single mode',
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
