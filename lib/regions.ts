import rows from '@/data/indonesia-regions.json';

export type Region = { id: string; name: string; postal: string };
const regions = new Map<string, Region>();
const children = new Map<string, Region[]>();
for (const [id, name, postal] of rows) {
  const region = { id, name, postal };
  regions.set(id, region);
  const parent = id.includes('.') ? id.slice(0, id.lastIndexOf('.')) : '';
  const list = children.get(parent) || [];
  list.push(region);
  children.set(parent, list);
}
export function regionChildren(parent = '') { return children.get(parent) || []; }
export function selectedRegion(id: string) {
  const village = regions.get(id);
  if (!village || id.length !== 13) return null;
  const district = regions.get(id.slice(0, 8));
  const city = regions.get(id.slice(0, 5));
  const province = regions.get(id.slice(0, 2));
  if (!district || !city || !province || !/^\d{5}$/.test(village.postal)) return null;
  return { provinceId: province.id, province: province.name, cityId: city.id, city: city.name, districtId: district.id, district: district.name, villageId: village.id, village: village.name, postal: village.postal };
}
