'use client';
import { useEffect, useState } from 'react';

type Option = { id: string; name: string; postal: string };
export const initialAddress = { name: '', phone: '', provinceId: '', province: '', cityId: '', city: '', districtId: '', district: '', villageId: '', village: '', postal: '', street: '', landmark: '' };
const levels = [
  { field: 'province', label: 'Provinsi', parent: '' },
  { field: 'city', label: 'Kota / kabupaten', parent: 'provinceId' },
  { field: 'district', label: 'Kecamatan', parent: 'cityId' },
  { field: 'village', label: 'Kelurahan / desa', parent: 'districtId' },
];
function RegionSelect({ level, value, onChange }: { level: number; value: any; onChange: (value: any) => void }) {
  const { field, label, parent } = levels[level];
  const parentId = parent ? value[parent] || '' : '';
  const enabled = !parent || !!parentId;
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setOptions([]); setError('');
    if (!enabled) { setLoading(false); return; }
    setLoading(true);
    fetch('/api/regions?parent=' + encodeURIComponent(parentId), { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => { if (!Array.isArray(data)) throw new Error(); setOptions(data as Option[]); })
      .catch(e => { if (e.name !== 'AbortError') setError('Pilihan wilayah belum termuat.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [enabled, parentId, retry]);
  return <label>{label}<select name={field + 'Id'} required value={value[field + 'Id'] || ''} disabled={!enabled || loading} onChange={e => {
    const selected = options.find(option => option.id === e.target.value);
    const next = { ...value, [field + 'Id']: selected?.id || '', [field]: selected?.name || '', postal: '' };
    for (const child of levels.slice(level + 1)) { next[child.field] = ''; next[child.field + 'Id'] = ''; }
    if (field === 'village') next.postal = selected?.postal || '';
    onChange(next);
  }}>
    <option value="">{loading ? 'Memuat pilihan…' : !enabled ? 'Pilih ' + levels[level - 1]?.label.toLowerCase() + ' dahulu' : 'Pilih ' + label.toLowerCase()}</option>
    {options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
  </select>{error && <span className="field-error">{error} <button type="button" onClick={() => setRetry(n => n + 1)}>Coba lagi</button></span>}</label>;
}
export default function AddressFields({ value, onChange }: { value: any; onChange: (value: any) => void }) {
  return <div className="form-grid address-fields">
    <label>Nama penerima<input autoComplete="shipping name" name="name" required minLength={2} maxLength={100} value={value.name || ''} onChange={e => onChange({ ...value, name: e.target.value })} placeholder="Nama lengkap penerima" /></label>
    <label>Nomor WhatsApp / telepon<input autoComplete="shipping tel" name="phone" type="tel" inputMode="tel" required pattern="(\+62|62|0)[0-9]{8,13}" maxLength={16} value={value.phone || ''} onChange={e => onChange({ ...value, phone: e.target.value.replace(/[\s()-]/g, '') })} placeholder="08xxxxxxxxxx" /></label>
    {levels.map((item, level) => <RegionSelect key={item.field} level={level} value={value} onChange={onChange} />)}
    <label>Kode pos<input name="postal" autoComplete="shipping postal-code" value={value.villageId ? value.postal || '' : ''} readOnly required pattern="[0-9]{5}" placeholder="Otomatis dari kelurahan / desa" /><small>Terisi setelah memilih kelurahan atau desa.</small></label>
    <label className="span-2">Jalan, nomor rumah, RT / RW<textarea name="street" autoComplete="shipping street-address" required minLength={10} maxLength={250} value={value.street || ''} onChange={e => onChange({ ...value, street: e.target.value })} placeholder="Contoh: Jl. Melati No. 12, RT 003 / RW 002, Blok B" rows={3} /></label>
    <label className="span-2">Patokan / catatan kurir (opsional)<input name="landmark" maxLength={150} value={value.landmark || ''} onChange={e => onChange({ ...value, landmark: e.target.value })} placeholder="Contoh: pagar biru, sebelah minimarket" /></label>
    {value.villageId && <div className="address-preview span-2"><strong>Tujuan pengiriman</strong><span>{[value.village, value.district, value.city, value.province, value.postal].filter(Boolean).join(', ')}</span></div>}
  </div>;
}
