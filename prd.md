# Product Requirements Document (PRD)
# VignusStream Web v2 (Serverless Architecture)

---

## 1. Project Overview
VignusStream Web v2 adalah transformasi total dari aplikasi desktop berbasis Electron menjadi platform SaaS *fully web-based*. Sistem ini berfungsi sebagai pusat penerimaan, monitoring, sinkronisasi *overlay*, dan *routing* output kamera dari *smartphone* (baik menggunakan *browser* bawaan maupun aplikasi pihak ketiga via WHIP) langsung menuju OBS Studio melalui jaringan internet tanpa memerlukan VPS, IP Publik, Port Forwarding, ataupun Tailscale Mesh Network.

### Tujuan Utama:
* **Fully Cloud & Serverless:** Berjalan sepenuhnya di infrastruktur modern tanpa pemeliharaan server fisik atau VPS.
* **Cross-Network Capability:** Pengirim (smartphone) dan penerima (OBS) dapat berada di jaringan internet yang sepenuhnya berbeda (misal: Seluler 5G vs WiFi Rumah).
* **Latensi Ultra-Rendah:** Menggunakan teknologi WebRTC (Peer-to-Peer) untuk mencapai latensi 100–300 ms.
* **Unified Signaling:** Menggunakan database *real-time* untuk menjembatani pertukaran sinyal WebRTC dan WHIP serta sinkronisasi *remote control overlay*.
* **Freemium Model:** Skema akun terbagi menjadi Free Tier (1 Kamera, fitur dasar) dan Pro Tier (Mencapai 5 Kamera, kontrol tingkat lanjut).

---

## 2. Technology Stack
* **Frontend & API Gateway:** Next.js (Hosted on Vercel)
* **Authentication & Database:** Supabase Auth & Supabase PostgreSQL
* **Real-time Data Layer:** Supabase Realtime (PostgreSQL Replication via WebSockets)
* **Video Streaming Protocol:** WebRTC (Client-to-Client / Peer-to-Peer)
* **External Ingestion Protocol:** WHIP (WebRTC HTTP Ingestion Protocol) untuk aplikasi eksternal (Larix Broadcaster, OBS Mobile, dll.)
* **Network Traversal:** STUN/TURN Servers (Google STUN & Metered.ca TURN Provider)

---

## 3. Akun & Pembagian Fitur (Free vs Pro Tier)

### 3.1. Free Tier
* **Jumlah Kamera:** Maksimal 1 slot kamera aktif.
* **Pilihan Protokol:** Mendukung Web Browser Camera Mode & WHIP Input Mode.
* **Output:** 1 OBS Browser Source Widget URL.
* **Fitur Monitoring:** Statistik dasar (FPS dan Status Koneksi).
* **Batas Akses:** Akses standar ke Dashboard Kontrol di perangkat yang sama atau berbeda.

### 3.2. Pro Tier
* **Jumlah Kamera:** Multi-camera hingga maksimal 5 slot kamera aktif secara bersamaan.
* **Tata Letak Dashboard:** Fitur *Dynamic Grid Monitoring* (Pilihan layout 1x1, 2x2, 3x2, atau Kustom).
* **Advanced Overlay System:** Akses penuh ke sistem *overlay* interaktif (Teks dinamis, gambar/PNG, jam digital, dan *Custom HTML Overlay*).
* **Scene Management:** Fitur untuk mengelompokkan kamera dan aset visual ke dalam beberapa adegan (*scenes*) yang dapat diganti secara instan dari jarak jauh.
* **Advanced Statistics:** Monitoring mendalam (Bitrate real-time, resolusi aktif, estimasi *packet loss*, dan grafik latensi via `RTCPeerConnection.getStats()`).

---

## 4. Sistem Pairing Terpadu (Unified Pairing System)

Setiap slot kamera yang dibuat di dalam Dashboard Pengguna akan menghasilkan token unik yang divalidasi oleh sistem keamanan Supabase. Pengguna diberikan dua pilihan metode transmisi yang berjalan secara paralel:

### Metode A: Web Camera Mode (Instant Browser Capture)
1. Dashboard menampilkan QR Code dan Pairing URL khusus.
   * *Contoh URL:* `https://vignusstream.vercel.app/capture?slot=1&token=uuid-token-keamanan`
2. Pengguna memindai QR Code menggunakan kamera *smartphone*.
3. Browser ponsel (Chrome/Safari) terbuka, meminta izin akses *Camera* dan *Microphone*.
4. Setelah diizinkan, browser secara otomatis memulai penawaran sinyal (*WebRTC Offer*) ke database untuk disambungkan langsung ke OBS Widget.

### Metode B: Pro App Mode via WHIP (Larix / OBS Mobile / Capture Card Mirrorless)
1. Dashboard menyediakan *Endpoint URL* WHIP beserta kunci otentikasi.
   * *WHIP URL:* `https://vignusstream.vercel.app/api/whip?slot=1`
   * *Bearer Token:* `uuid-token-keamanan`
2. Pengguna memasukkan detail tersebut ke aplikasi *encoder* seperti Larix Broadcaster.
3. Metode ini mendukung skenario **Kamera Mirrorless**: Kamera Mirrorless -> Capture Card USB-C -> Smartphone -> Larix Broadcaster (WHIP) -> OBS Widget.

---

## 5. Alur Kerja Sistem Remote & Arsitektur Pensinyalan (Signaling)

Karena platform ini bersifat *serverless* tanpa VPS yang berjalan terus-menerus, proses pertukaran data pensinyalan (*SDP Offer/Answer*) memanfaatkan kombinasi Next.js API Routes dan fitur *Supabase Realtime*.

### 5.1. Alur Transmisi Video (WebRTC & WHIP)
1. **Inisiasi Pengirim:** Ponsel (via Web Browser atau Larix via WHIP API) mengirimkan data teknis video (*SDP Offer*) ke sistem.
2. **Penyimpanan Sinyal:** Next.js API menyimpan data *Offer* tersebut ke tabel `signaling_sessions` di Supabase.
3. **Notifikasi Real-time:** OBS Browser Source Widget yang terpasang di OBS Studio secara instan menerima data *Offer* tersebut melalui *Supabase Realtime Listener* tanpa perlu memuat ulang (*refresh*) halaman.
4. **Respon Penerima:** OBS Widget memproses *Offer*, menghasilkan *SDP Answer*, dan menyimpannya kembali ke tabel `signaling_sessions`.
5. **Koneksi Terbentuk:** Data *Answer* diteruskan kembali ke pengirim (untuk WHIP, Next.js API menahan *request HTTP POST* selama beberapa detik hingga *Answer* tersedia di DB untuk dikembalikan sebagai respon HTTP).
6. **Aliran Video:** Koneksi Peer-to-Peer (P2P) langsung terjalin dari *smartphone* ke komputer OBS melalui rute STUN/TURN Server. Jalur video tidak membebani Vercel maupun Supabase.

### 5.2. Alur Remote Control Overlay & Fitur
1. Pengguna membuka halaman `https://vignusstream.vercel.app/dashboard` di perangkat manapun (misal: Tablet/Laptop terpisah dari PC OBS).
2. Ketika tombol pengubah status ditekan (contoh: Mengubah teks *overlay* atau menyembunyikan kamera 2), Dashboard akan melakukan operasi *update* ke tabel `overlays` atau `camera_slots` di Supabase.
3. Perubahan baris data di PostgreSQL secara instan direplikasi oleh *Supabase Realtime* dan diterima oleh OBS Browser Source Widget yang sedang berjalan.
4. OBS Widget langsung memperbarui visual CSS/HTML secara transparan di layar *live streaming* dalam hitungan milidetik.

---

## 6. Fitur Pendukung & Kinerja

* **Auto Reconnect System:** Jika koneksi internet seluler di smartphone terputus secara tidak sengaja, sistem pengirim dan OBS Widget akan melakukan *polling* ulang penawaran sinyal setiap 2 detik sekali hingga status video kembali menjadi `streaming`.
* **Keamanan Akses:** Semua interaksi database dan pembacaan token dilindungi oleh kebijakan keamanan internal Supabase bernama **Row Level Security (RLS)**. Token pairing diatur agar kedaluwarsa setelah 10 menit jika tidak digunakan untuk mencegah eksploitasi URL.
* **Optimasi Performa Browser Source:** Halaman widget OBS dibangun dengan kode HTML/JS yang sangat minimalis dan memanfaatkan akselerasi perangkat keras (*hardware acceleration*) bawaan Chromium OBS untuk menjaga penggunaan RAM di bawah 100 MB per slot kamera.
