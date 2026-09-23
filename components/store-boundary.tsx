'use client';
import { Component, type ReactNode } from 'react';
export default class StoreBoundary extends Component<{children:ReactNode},{failed:boolean}> {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed ? <main className="container page" role="alert"><h1>Halaman belum dapat ditampilkan</h1><p>Coba muat ulang. Isi keranjang di perangkat ini tetap tersimpan.</p><button className="btn" onClick={()=>location.reload()}>Muat ulang</button> <a href="/produk">Kembali ke produk</a></main> : this.props.children;}
}
