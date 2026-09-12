'use client';

import {useEffect,useRef,useState} from 'react';
import {createBrowserClient} from '@supabase/ssr';
import {authUrl,authKey} from '@/lib/auth/config';

const googleClientId=process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '287724726112-bbm7qv7psodhdj73glho9jcrc23mk1fh.apps.googleusercontent.com';

type GoogleCredentialResponse={credential:string};
type GoogleIdentity={
 initialize:(options:{client_id:string;callback:(response:GoogleCredentialResponse)=>void;auto_select?:boolean})=>void;
 renderButton:(element:HTMLElement,options:{theme:string;size:string;text:string;shape:string;width:number})=>void;
};

declare global {
 interface Window {google?:{accounts:{id:GoogleIdentity}}}
}

export default function CustomerAuth({done,googleOnly=false}:{done:()=>void;googleOnly?:boolean}) {
 const [register,setRegister]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const googleButton=useRef<HTMLDivElement>(null);
 const doneRef=useRef(done);doneRef.current=done;
 const client=()=>createBrowserClient(authUrl,authKey);

 useEffect(()=>{
  let active=true;
  const render=()=>{
   if(!active||!googleButton.current||!window.google)return;
   googleButton.current.replaceChildren();
   window.google.accounts.id.initialize({
    client_id:googleClientId,
    auto_select:false,
    callback:async response=>{
     setBusy(true);setMessage('');
     const {error}=await client().auth.signInWithIdToken({provider:'google',token:response.credential});
     if(error)setMessage('Login Google belum berhasil. Silakan coba lagi.');
     else doneRef.current();
     setBusy(false);
    }
   });
   window.google.accounts.id.renderButton(googleButton.current,{theme:'outline',size:'large',text:'signin_with',shape:'rectangular',width:320});
  };
  const existing=document.querySelector<HTMLScriptElement>('script[data-google-identity]');
  if(existing){if(window.google)render();else existing.addEventListener('load',render,{once:true});}
  else {
   const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.defer=true;script.dataset.googleIdentity='true';script.addEventListener('load',render,{once:true});document.head.appendChild(script);
  }
  return()=>{active=false;};
 },[]);

 if(googleOnly)return <div className="customer-auth"><div className="google-signin-wrap" aria-busy={busy}><div ref={googleButton}/></div>{message&&<p role="status">{message}</p>}<p className="small muted">Gunakan akun Google Anda. Setelah masuk, lengkapi pendaftaran untuk ditinjau admin.</p></div>;

 return <div className="customer-auth"><div className="auth-toggle"><button type="button" aria-pressed={!register} onClick={()=>setRegister(false)}>Masuk</button><button type="button" aria-pressed={register} onClick={()=>setRegister(true)}>Daftar</button></div><div className="google-signin-wrap" aria-busy={busy}><div ref={googleButton}/></div><p className="auth-divider">atau gunakan email</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');try{const {data,error}=register?await client().auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/auth/callback'}}):await client().auth.signInWithPassword({email,password});if(error)throw error;if(data.session){done();}else setMessage('Periksa email Anda untuk mengonfirmasi pendaftaran.');}catch{setMessage('Belum berhasil. Periksa email dan kata sandi, atau coba beberapa saat lagi.');}finally{setBusy(false);}}}><label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Kata sandi<input type="password" minLength={8} required autoComplete={register?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="btn" disabled={busy}>{busy?'Memproses…':register?'Buat akun':'Masuk'}</button></form>{message&&<p role="status">{message}</p>}<p className="small muted">Dengan melanjutkan, Anda menyetujui <a href="/syarat">Syarat & Ketentuan</a> dan <a href="/privasi">Kebijakan Privasi</a>.</p></div>;
}
