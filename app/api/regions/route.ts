import { regionChildren } from '@/lib/regions';

export function GET(request: Request) {
  const parent = new URL(request.url).searchParams.get('parent') || '';
  if (parent && !/^\d{2}(\.\d{2}){0,2}$/.test(parent))
    return Response.json({ error: 'Kode wilayah tidak valid.' }, { status: 400 });
  return Response.json(regionChildren(parent), { headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' } });
}
