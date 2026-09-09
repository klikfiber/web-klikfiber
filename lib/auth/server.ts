import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { authUrl, authKey } from './config';
export async function authServer() {
 const jar = await cookies();
 return createServerClient(authUrl, authKey, {cookies:{getAll:()=>jar.getAll(),setAll:items=>{items.forEach(({name,value,options})=>jar.set(name,value,options));}}});
}
