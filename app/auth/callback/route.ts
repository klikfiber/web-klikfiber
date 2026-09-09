import { NextResponse } from 'next/server';
import { authServer } from '@/lib/auth/server';
export async function GET(req:Request) {
 const url=new URL(req.url);const code=url.searchParams.get('code');
 if(code){const client=await authServer();const {error}=await client.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL('/akun',url.origin));}
 return NextResponse.redirect(new URL('/akun?auth_error=1',url.origin));
}
