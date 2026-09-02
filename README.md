# 🧠 NEURAL AI STUDIO

Platform AI generatif **all-in-one**: AI Chat multi-model, AI Image Generator, 10 downloader sosial media,
media/audio tooling, photo lab, file converter, web scraper & 12 utility tools — dalam satu website Next.js.

```
Frontend   Next.js 14 (App Router) · Tailwind CSS · Framer Motion · Three.js
Backend    Next.js Route Handlers · SSE/WebSocket realtime
Database   SQLite (better-sqlite3) — PostgreSQL tinggal ganti DATABASE_URL
AI         Groq (LLaMA 3.3/3.1, Mixtral, Gemma, Whisper) · NVIDIA NIM (SD3/SDXL/FLUX, Nemotron)
Auth       NextAuth.js (Credentials + Google/GitHub opsional) · API key system
Payment    Stripe (checkout session + demo fallback)
PWA        Manifest + Service Worker (bisa di-install di HP/Desktop)
```

---

## ⚡ Quick Start

```bash
git clone https://github.com/raizenamericano-del/webAi.git
cd webAi
npm install
cp .env.example .env.local     # lalu isi API key lu
npm run dev                    # http://localhost:3000
```

Database (SQLite) dibuat otomatis di folder `data/` saat pertama kali jalan.
Akun admin juga di-*seed* otomatis.

### Login Admin (unlimited)

| Field | Value |
| --- | --- |
| URL | `/login` (atau tombol **Login Demo Admin**) |
| Email | `admin@neuralai.studio` |
| Password | `neuraladmin2025` |

> Ganti kredensial ini di `.env.local` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) sebelum dipakai production.
> Role `ADMIN` = kuota **unlimited** + akses `/admin`.

---

## 🔑 Environment (`.env.local`)

```env
DATABASE_URL="file:./data/neural.db"     # ganti ke postgres://... kalau mau PostgreSQL
NEXTAUTH_SECRET="..."                    # random string
ADMIN_EMAIL="admin@neuralai.studio"
ADMIN_PASSWORD="neuraladmin2025"

GROQ_API_KEY="gsk_..."                   # chat + whisper
GROQ_API_KEY_2="gsk_..."                 # fallback
NVIDIA_API_KEY="nvapi-..."               # image generation + Nemotron
APP_SECRET="..."                         # enkripsi "Bring Your Own Key"

# opsional
OPENAI_API_KEY=""      TAVILY_API_KEY=""     ELEVENLABS_API_KEY=""
REMOVEBG_API_KEY=""    CLIPDROP_API_KEY=""   REPLICATE_API_TOKEN=""
SUNO_API_KEY=""        RUNWAY_API_KEY=""     PIKA_API_KEY=""
STRIPE_SECRET_KEY=""   STRIPE_PRICE_PRO=""   STRIPE_PRICE_ENTERPRISE=""
GOOGLE_CLIENT_ID=""    GOOGLE_CLIENT_SECRET=""
GITHUB_ID=""           GITHUB_SECRET=""
```

**Nggak punya key?** Masuk → **Settings → Bring Your Own Key**, tempel key punya lu sendiri.
Key dienkripsi AES-256 sebelum disimpan, dan dipakai otomatis kalau env server kosong.

---

## 🧩 Fitur (semua udah jalan di repo ini)

### 🌟 Landing Page
Hero **particle network Three.js**, teks glitch + typing effect, live stats realtime (SSE),
8 kartu fitur dengan hover 3D, slider testimoni, pricing (Stripe/ demo mode), CTA, PWA-ready.

### 💬 AI Chat (`/chat`)
| Fitur | Status |
| --- | --- |
| Multi-model: LLaMA 3.3 70B, LLaMA 3.1 70B/405B, Mixtral 8x7B, Gemma 2/7B, Nemotron 70B | ✅ |
| Streaming token (SSE) | ✅ |
| Thread system (pin, rename, hapus, riwayat) | ✅ |
| Upload PDF / DOCX / XLSX / CSV / TXT (auto ekstrak & dianalisis) | ✅ |
| `/image <prompt>` → generate gambar di dalam chat (NVIDIA NIM) | ✅ |
| Voice input (rekam → Whisper lewat Groq) | ✅ |
| Web search (Tavily, fallback DuckDuckGo) + daftar sumber | ✅ |
| Code interpreter (JS dijalankan di sandbox iframe) | ✅ |
| Export chat ke PDF / JSON / Markdown | ✅ |

### 🎨 AI Image Generator (`/image`)
Prompt + negative prompt · 9 style preset · 6 aspect ratio (1:1 → 21:9) · batch 1-4 gambar ·
model SD3 / SDXL / SDXL-Turbo / FLUX.1-dev / schnell · img2img · inpainting (mask) ·
upscale 2x/4x + sharpen · gallery tersimpan per user · download PNG · share X.

### 🔍 Social Downloader (`/downloader`) — 10 platform
TikTok (no watermark + audio) · Instagram (foto/reel/carousel) · YouTube (video/audio multi-kualitas) ·
X/Twitter (video/GIF/foto) · Facebook · Pinterest · Reddit (video + galeri) · Spotify (metadata + preview) ·
SoundCloud · CapCut. Tiap platform punya **beberapa provider berurutan** (auto fallback).

### 🎬 Media Studio (`/media`)
Text-to-Speech (ElevenLabs + fallback browser) · Speech-to-Text (Whisper) · AI Music (Suno) ·
AI Video (Runway/Pika) · Voice Cloning (ElevenLabs) · Video Trimmer (re-encode di browser) ·
Audio Converter (MP3/WAV/OGG/WEBM).

### 🖼️ Photo Lab (`/photo`) — 7 tool
Background Remover (remove.bg/clipdrop + magic-wand lokal) · Enhancer (auto-level + sharpen) ·
Upscale 2x/4x · AI Colorizer (DeOldify via Replicate + tint fallback) · Style Transfer (7 preset) ·
Object Remover (kuas + patch fill) · Image Extender (outpainting mirror-edge).

### 📂 File Converter (`/converter`)
PDF merge / split / compress / → TXT / → DOCX · Images → PDF · konversi gambar (PNG/JPG/WEBP/BMP/ICO) ·
konversi video (WEBM/MP4) · konversi audio (MP3/WAV/OGG) · DOCX ↔ PDF/TXT · XLSX ↔ CSV/PDF.
Mayoritas diproses **di browser** (file nggak dikirim ke server).

### 📊 Scraper (`/scraping`)
Web scraper (teks, metadata, link, gambar) · Social analytics (TikTok/IG/X/YouTube/FB) ·
Keyword research (Google Suggest + DuckDuckGo) · Competitor analysis (heading, keyword density, deteksi teknologi, load time).

### 🛠️ Utilities (`/tools`) — 12 tool, gratis & unlimited
QR generator · QR scanner (kamera) · URL shortener (`/s/kode`) · Password generator (Web Crypto + indikator entropi) ·
Random data generator (nama/email/alamat/dll → JSON/CSV) · Unit converter (8 kategori) · Color picker (HEX/RGB/HSL + palet) ·
JSON formatter & validator · Code beautifier (HTML/CSS/JS) · Code minifier (Terser + CSS/HTML) ·
Base64 encoder/decoder · Hash generator (MD5, SHA-1, SHA-256, SHA-512, SHA3, RIPEMD-160).

### 👤 User System
Register/login · profil & bio · kuota harian (Free 100, Pro 10.000, Enterprise/Admin unlimited) ·
API key pribadi · riwayat aktivitas/download/generasi · dashboard · admin panel (`/admin`) · Stripe checkout.

### 📱 Lainnya
Dark/light theme (default dark) · mobile-first · PWA installable · cursor neon trail · toast realtime ·
live stats global via SSE (`/api/realtime`) atau Socket.IO (`npm run dev:socket`).

---

## 🔌 Public API

Bikin API key di `/dashboard → API Keys`, lalu:

```bash
curl -X POST http://localhost:3000/api/public/v1/chat \
  -H "Authorization: Bearer na_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Halo!"}],"model":"llama-3.3-70b-versatile"}'

curl -X POST http://localhost:3000/api/public/v1/download \
  -H "Authorization: Bearer na_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.tiktok.com/@user/video/123"}'
```

---

## 🚀 Deploy

**Vercel / Netlify** — set env variables di dashboard, `npm run build`.
Catatan: SQLite butuh disk persisten; untuk serverless mending pakai **PostgreSQL**
(cukup set `DATABASE_URL="postgres://..."` — driver `pg` otomatis dipakai).
File upload & ffmpeg-less conversion tetap jalan karena diproses di browser.

**VPS (rekomendasi buat fitur penuh):**
```bash
npm install && npm run build && npm start     # atau: npm run dev:socket (Next + Socket.IO)
```

---

## 📁 Struktur

```
src/
├── app/
│   ├── page.tsx              # landing
│   ├── chat/ image/ downloader/ media/ photo/ converter/ scraping/ tools/
│   ├── dashboard/ settings/ admin/ login/ register/ pricing/
│   └── api/                  # 25+ route handlers (chat, image, download, scrape, user, admin, public…)
├── components/               # ui kit, landing, chat, layout, providers
├── lib/                      # db, store, ai, downloader, social, search, files, usage, crypto, realtime
└── public/                   # manifest, service worker, icons
server/socket-server.mjs      # opsional: Next + Socket.IO
prisma/schema.prisma          # referensi schema kalau mau migrasi ke Prisma/Postgres
```

---

## ⚠️ Catatan penting

1. **Rotasi API key.** Key yang pernah di-share di tempat publik (chat/grup/commit) harus di-revoke & diganti
   dari dashboard provider-nya. Jangan commit `.env.local`.
2. **Database default SQLite** supaya langsung jalan tanpa setup. Untuk production dengan traffic tinggi,
   pakai PostgreSQL (tinggal ganti `DATABASE_URL`).
3. **Beberapa fitur butuh key pihak ketiga** (Suno, Runway, Pika, ElevenLabs, remove.bg, Replicate).
   Tanpa key, UI-nya tetap jelas ngasih tahu kenapa & apa alternatifnya (nggak error 500 diam-diam).
4. **Downloader** bergantung endpoint publik platform — kalau suatu provider berubah/blokir,
   provider berikutnya otomatis dicoba; kalau semua gagal, muncul pesan yang jelas.
5. Gunakan fitur downloader/scraper sesuai hukum & ToS platform yang berlaku.
