'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import type PhotoSwipe from 'photoswipe';
import type { Product } from '@/lib/catalog';
import 'photoswipe/style.css';

export default function ProductGallery({ product }: { product: Product }) {
  const images = useMemo(() => [...new Set([product.imageSrc, ...(product.gallery || [])].filter((src): src is string => !!src))].slice(0, 8), [product.imageSrc, product.gallery]);
  const [viewport, carousel] = useEmblaCarousel({ loop: false });
  const [selected, setSelected] = useState(0);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const viewer = useRef<PhotoSwipe | null>(null);
  useEffect(() => {
    if (!carousel) return;
    const sync = () => setSelected(carousel.selectedScrollSnap());
    sync(); carousel.on('select', sync); carousel.on('reInit', sync);
    return () => { carousel.off('select', sync); carousel.off('reInit', sync); };
  }, [carousel]);
  useEffect(() => () => { viewer.current?.destroy(); }, []);
  async function enlarge(index: number) {
    if (opening || viewer.current) return;
    setOpening(true); setError('');
    try {
      const { default: Viewer } = await import('photoswipe');
      if (!root.current) return;
      const elements = root.current.querySelectorAll<HTMLImageElement>('.gallery-slide img');
      const dataSource = images.map((src, i) => ({ src, width: elements[i]?.naturalWidth || 1000, height: elements[i]?.naturalHeight || 1000, alt: `${product.name} — foto ${i + 1}` }));
      const instance = new Viewer({ dataSource, index, bgOpacity: 0.94, closeTitle: 'Tutup galeri', zoomTitle: 'Perbesar / perkecil', arrowPrevTitle: 'Foto sebelumnya', arrowNextTitle: 'Foto berikutnya', errorMsg: 'Foto belum dapat dimuat.', showHideAnimationType: 'fade' });
      viewer.current = instance;
      instance.on('destroy', () => { viewer.current = null; });
      instance.init();
    } catch { setError('Foto belum dapat diperbesar. Silakan coba lagi.'); }
    finally { setOpening(false); }
  }
  if (!images.length) return <div className="gallery-placeholder">Foto produk belum tersedia</div>;
  return <div className="shop-gallery" ref={root} aria-label={`Galeri ${product.name}`}>
    <div className="gallery-stage">
      <div className="gallery-viewport" ref={viewport}><div className="gallery-track">
        {images.map((src, i) => <button key={src} type="button" className="gallery-slide" aria-label={`Perbesar foto ${i + 1} ${product.name}`} onClick={() => void enlarge(i)} disabled={opening}><img src={src} alt={`${product.name} — foto ${i + 1}`} decoding="async" /></button>)}
      </div></div>
      {images.length > 1 && <><button type="button" className="gallery-arrow previous" aria-label="Foto sebelumnya" disabled={selected === 0} onClick={() => carousel?.scrollPrev()}><ChevronLeft size={20} /></button><button type="button" className="gallery-arrow next" aria-label="Foto berikutnya" disabled={selected === images.length - 1} onClick={() => carousel?.scrollNext()}><ChevronRight size={20} /></button></>}
      <span className="gallery-count" aria-live="polite">{selected + 1} / {images.length}</span>
      <button type="button" className="gallery-zoom" disabled={opening} onClick={() => void enlarge(selected)}><ZoomIn size={16} />{opening ? 'Memuat…' : 'Perbesar'}</button>
    </div>
    {images.length > 1 && <div className="gallery-thumbnails" aria-label="Pilih foto produk">{images.map((src, i) => <button key={src} type="button" aria-label={`Lihat foto ${i + 1}`} aria-pressed={selected === i} onClick={() => carousel?.scrollTo(i)}><img src={src} alt="" loading="lazy" /></button>)}</div>}
    <p className="gallery-hint">{images.length > 1 ? 'Geser untuk melihat foto lainnya. ' : ''}Ketuk foto untuk zoom.</p>
    {error && <p role="alert" className="field-error">{error}</p>}
  </div>;
}
