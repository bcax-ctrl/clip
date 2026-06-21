# 🎬 ClipForge — Auto Video Clipper

Tool **lokal & gratis** untuk content clipper (TikTok / Shorts). Ubah video
panjang (podcast / streaming) jadi clip vertikal siap-post: **auto subtitle
word-level**, **background music + auto-ducking**, **crop 9:16**, dan **hook
text** — semua dibakar (burn-in) lewat FFmpeg. Bisa di-install sebagai **PWA**
di HP.

Semua processing jalan di komputer kamu. **Tidak ada API berbayar wajib.**

```
Upload / YouTube  →  Whisper (subtitle)  →  Pilih style + musik + crop + hook  →  FFmpeg render  →  Download
```

---

## ✨ Fitur

| Fase | Fitur |
|------|-------|
| 1 | Drag-drop upload (mp4/mov/webm/mkv) atau paste link YouTube (yt-dlp). Job system berbasis JSON. |
| 2 | Transkripsi Whisper word-level → generate `.ass`. 3 style: **Karaoke Bold**, **Clean Caption**, **Hormozi Style**. **Edit teks subtitle** inline (koreksi typo Whisper / hapus kata) sebelum render. Live preview di player. |
| 3 | Background music per kategori (energetic/chill/dramatic/funny), preview 5 detik, **auto-ducking** (`sidechaincompress`), slider volume. |
| 4 | **Trim / pilih segmen clip** dari video panjang (tandai awal/akhir dari posisi player, preview nge-loop di range), crop 16:9 → 9:16 dengan slider geser fokus, hook text (drawtext + fade-in), render gabungan 1080×1920, progress bar real-time (SSE). |
| 5 | PWA (manifest + service worker + "Add to Home Screen"), Notification API ("Clip kamu udah jadi! 🎬"). |
| 6 | **Auto-suggest momen** (deteksi highlight dari transkrip: densitas bicara + jeda natural + cue ?/!/angka) & **Multi-clip** (antri banyak segmen → render berurutan → galeri hasil, download per-clip). |

---

## 🧩 Prasyarat (WAJIB install dulu)

ClipForge memanggil tiga tool eksternal via `child_process`. Pastikan ketiganya
ada di **PATH**:

| Tool | Fungsi | Wajib? |
|------|--------|--------|
| **FFmpeg** (+ ffprobe) | render video, mixing audio | ✅ Wajib |
| **Whisper** (openai-whisper) | transkripsi + word timestamp | ✅ Wajib untuk subtitle |
| **yt-dlp** | download video dari link YouTube | ⬜ Opsional |

### Windows

```powershell
# Pakai winget (paling gampang)
winget install Gyan.FFmpeg
winget install yt-dlp.yt-dlp
winget install Python.Python.3.11

# Whisper (butuh Python + pip)
pip install -U openai-whisper
```

> Alternatif FFmpeg: download dari https://www.gyan.dev/ffmpeg/builds/ lalu
> tambahkan folder `bin` ke Environment Variables → Path.

### macOS (Homebrew)

```bash
brew install ffmpeg yt-dlp python
pip3 install -U openai-whisper
```

### Linux (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install -y ffmpeg python3-pip
pip3 install -U openai-whisper yt-dlp
```

### Cek instalasi

```bash
ffmpeg -version
ffprobe -version
whisper --help
yt-dlp --version
```

> Whisper pertama kali dijalankan akan **download model** (`base` ≈ 140MB).
> GPU NVIDIA + PyTorch CUDA akan jauh lebih cepat, tapi CPU juga jalan.

#### Override path binary (opsional)

Kalau binary tidak di PATH, set env var sebelum `npm run dev`:

```bash
FFMPEG_PATH=/path/ffmpeg FFPROBE_PATH=/path/ffprobe \
WHISPER_PATH=/path/whisper YTDLP_PATH=/path/yt-dlp npm run dev
```

---

## 🚀 Menjalankan ClipForge

```bash
npm install
npm run dev          # http://localhost:3000
# atau production:
npm run build && npm run start
```

Buka http://localhost:3000.

**Shortcut editor:** `Spasi` play/pause · `I` tandai awal clip · `O` tandai
akhir clip. Job lama bisa dihapus (beserta file-nya) dari daftar "Job terbaru"
di home (tombol ✕).

### Tambahkan musik & font (sekali setup)

- **Musik** → taruh file `.mp3` royalty-free ke `public/music/<kategori>/`.
  Lihat `public/music/README.md` (sumber: YouTube Audio Library, Pixabay Music).
- **Font** (biar subtitle cakep) → taruh `Montserrat-Black.ttf` &
  `Poppins-ExtraBold.ttf` ke `public/fonts/`. Lihat `public/fonts/README.md`.

> Musik & font **tidak ikut di-commit** (gitignored) supaya kamu tidak
> menyebar file berhak cipta.

---

## 🗂️ Struktur Project

```
app/
  page.tsx                      # Home: upload / YouTube / recent jobs / notif
  editor/[jobId]/page.tsx       # Editor: subtitle, musik, crop, hook, render
  result/[jobId]/page.tsx       # Hasil: preview + download
  api/
    upload/        youtube/     # Fase 1: terima video / download yt-dlp
    transcribe/    transcript/  # Fase 2: jalankan whisper, baca transcript
    subtitle/                   # Fase 2: generate .ass
    music/                      # Fase 3: list track
    media/[jobId]/[file]/       # serve source/output (HTTP range)
    render/  render/progress/   # Fase 4: render + progress SSE
    jobs/                       # status job
lib/
  jobs.ts  paths.ts  types.ts   # job system + storage
  whisper.ts  transcribe.ts     # parse word timestamps
  ass.ts  captions.ts           # generator .ass + preview overlay
  ffmpeg.ts  run.ts             # build & jalankan render command
  music.ts  youtube.ts  notify.ts
components/                      # VideoPreview, StylePicker, MusicPicker, dll
public/
  music/  fonts/  icons/        # aset (musik/font kamu sendiri)
  manifest.json  sw.js          # PWA
jobs/                           # storage render sementara (gitignored)
```

---

## 🔧 Cara kerja render (FFmpeg)

Satu command FFmpeg menggabungkan semua:

0. **Trim clip** — input-seeking `-ss start -to end` untuk ambil segmen viral
   saja. Timestamp subtitle otomatis di-rebase ke 0 (`clipTranscript`) supaya
   subtitle tetap sinkron setelah dipotong.
1. **Crop 9:16** — `scale=...:force_original_aspect_ratio=increase,crop=1080:1920`
   dengan offset X dari slider.
2. **Burn subtitle** — filter `subtitles=subtitle.ass` (libass, animasi per-kata).
3. **Mix musik** — musik di-loop (`-stream_loop -1`), di-duck di bawah suara via
   `sidechaincompress`, lalu `amix` dengan audio asli.
4. **Hook text** — `drawtext` dengan fade-in di 3 detik pertama.
5. Output `1080×1920` H.264/AAC, `+faststart`. Progress dibaca dari
   `-progress pipe:1` dan dialirkan ke browser via **SSE**.

Tiap job punya folder `jobs/<id>/` berisi `source.mp4`, `transcript.json`,
`subtitle.ass`, `output.mp4`, `render.log`, dan `job.json` (status).

### Multi-clip & auto-suggest

- **Auto-suggest** (`/api/suggest`) menganalisa `transcript.json` murni
  (tanpa ML): geser jendela sepanjang target durasi, snap ke jeda alami, skor
  dari densitas kata + cue `?`/`!`/angka, ambil top non-overlap.
- **Multi-clip** (`/api/render-clips`) merender tiap segmen berurutan ke
  `output-1.mp4`, `output-2.mp4`, … dengan `subtitle-<n>.ass` masing-masing.
  Style/musik/crop/hook global; tiap clip punya trim sendiri. Galeri hasil di
  halaman result dengan progress per-clip + download per-clip.

---

## ❓ Troubleshooting

- **`Gagal menjalankan "ffmpeg" ... ENOENT`** → binary belum di PATH. Cek
  `ffmpeg -version`, atau set `FFMPEG_PATH`.
- **Subtitle font-nya beda/jelek** → taruh `.ttf` ke `public/fonts/` (lihat
  README di sana). libass butuh fontnya tersedia.
- **Render error** → buka `jobs/<id>/render.log` untuk pesan FFmpeg lengkap.
- **Whisper lambat** → pakai model `tiny`/`base`, atau pasang PyTorch CUDA.
- **Notifikasi tidak muncul** → aktifkan toggle di home & izinkan permission
  browser. Di iOS, notifikasi web hanya jalan setelah app di-"Add to Home Screen".

---

## ⚖️ Catatan

Untuk pemakaian pribadi. Download YouTube hanya untuk konten yang kamu punya
izinnya. Gunakan musik royalty-free agar clip tidak kena mute/claim.
