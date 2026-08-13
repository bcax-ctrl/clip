# Situs Kanwil Kementerian Haji dan Umrah Provinsi Kalimantan Selatan

Situs resmi Kantor Wilayah Kementerian Haji dan Umrah (Kemenhaj) Provinsi
Kalimantan Selatan. Dibangun dengan fokus pada pengguna mayoritas mobile dan
lansia: teks besar, kontras tinggi, navigasi sederhana, dan halaman ringan.

> **Konteks kelembagaan**: Mulai 2026, penyelenggaraan haji dan umrah
> dialihkan dari Kementerian Agama ke Kementerian Haji dan Umrah yang berdiri
> sendiri (UU No. 8/2019 sebagaimana diubah dengan UU No. 14/2025). Situs ini
> merepresentasikan Kanwil Kemenhaj Provinsi Kalimantan Selatan — kelanjutan
> dari eks Bidang PHU Kanwil Kemenag Kalsel. Lihat `src/data/site.json` field
> `keteranganKelembagaan` dan halaman **Profil** untuk detailnya.

## Stack

- **Next.js (App Router)** + TypeScript
- **Tailwind CSS v4** + komponen bergaya shadcn/ui (Radix UI primitives,
  ditulis manual di `src/components/ui`)
- **MDX** untuk konten Berita & Pengumuman (folder `content/berita`), tanpa
  database
- Data lain (statistik, layanan, direktori travel, dll.) sebagai file
  **JSON** di `src/data`, diakses lewat lapisan tipe di `src/lib`
- Target deploy: **Vercel**

## Menjalankan di Lokal

Prasyarat: Node.js 20+ dan npm.

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

Perintah lain:

```bash
npm run build   # build produksi
npm run start   # jalankan hasil build (port 3000, atau: npm run start -- -p 4000)
npm run lint    # ESLint
```

## Deploy ke Vercel

1. Push repo ini ke GitHub/GitLab/Bitbucket.
2. Import project di [vercel.com/new](https://vercel.com/new), pilih repo ini.
3. Framework preset otomatis terdeteksi sebagai Next.js — tidak perlu
   konfigurasi tambahan (tidak ada environment variable wajib untuk build
   dasar).
4. Klik **Deploy**.

Setiap push ke branch utama akan otomatis membuat deployment baru.

## Menambah Berita / Pengumuman

Konten berita & pengumuman adalah file **MDX** di folder `content/berita/`.
Tidak perlu database atau CMS — cukup tambah file baru.

1. Buat file baru, misalnya `content/berita/judul-berita-anda.mdx`.
2. Isi dengan format berikut (frontmatter di antara `---`):

   ```mdx
   ---
   title: "Judul Berita"
   date: "2026-02-01"
   category: "Berita"
   excerpt: "Ringkasan singkat 1-2 kalimat yang tampil di daftar berita."
   image: "/galeri/kegiatan-01.svg"
   ---

   Isi berita di sini, mendukung format Markdown biasa: **tebal**,
   *miring*, `## Sub judul`, daftar, dan tautan.
   ```

3. `category` bebas diisi apa saja (mis. "Berita", "Pengumuman", "Kegiatan")
   — halaman Berita & Pengumuman otomatis membuat filter kategori dari nilai
   yang dipakai.
4. `image` opsional. Simpan gambar di folder `public/` (mis. `public/berita/`)
   lalu rujuk dengan path yang diawali `/`.
5. Nama file (tanpa `.mdx`) menjadi slug URL: `/berita/judul-berita-anda`.
6. Simpan file — di mode `npm run dev` halaman akan otomatis memuat berita
   baru tanpa perlu restart server.

Tidak ada langkah build tambahan; berita baru otomatis muncul di halaman
Beranda (3 terbaru) dan halaman Berita & Pengumuman.

## Mengganti Data (Mock → Data Resmi)

Semua data non-konten (statistik, layanan, direktori travel, dll.) berada di
`src/data/*.json`. Edit file JSON tersebut langsung — tidak perlu mengubah
kode komponen. Tipe data ada di `src/lib/types.ts` dan diakses melalui
`src/lib/data.ts`.

| File | Digunakan di | Keterangan |
|---|---|---|
| `src/data/site.json` | Header, footer, kontak, pengumuman berjalan | Alamat, telepon, email, sosial media, jam layanan — **email, sosial media, dan website saat ini contoh**, verifikasi kanal resmi Kanwil Kemenhaj Kalsel sebelum publish |
| `src/data/statistik.json` | Beranda, Informasi Haji | Kuota, jemaah berangkat, total daftar tunggu |
| `src/data/daftar-tunggu.json` | Informasi Haji | Kuota & daftar tunggu per kabupaten/kota |
| `src/data/kabupaten.json` | Semua halaman yang mereferensi kab/kota | Daftar 13 kabupaten/kota se-Kalsel |
| `src/data/manasik.json` | Informasi Haji | Jadwal manasik per gelombang |
| `src/data/embarkasi.json` | Informasi Haji | Info Embarkasi Banjarmasin |
| `src/data/travel.json` | Direktori Travel | **Data contoh** — ganti dengan data PPIU/PIHK resmi & terverifikasi sebelum publish |
| `src/data/regulasi.json` + `public/regulasi/*.pdf` | Regulasi & Unduhan | Ganti file PDF placeholder dengan dokumen resmi, sesuaikan entri JSON |
| `src/data/faq.json` | FAQ | Kelompok pertanyaan per topik |
| `src/data/galeri.json` + `public/galeri/*` | Galeri | Ganti gambar SVG placeholder dengan foto kegiatan asli (format JPG/PNG/WebP juga didukung) |
| `src/data/layanan.json` | Layanan | Syarat, alur, biaya, estimasi waktu per layanan |
| `src/data/profil.json` | Profil | Sambutan Kepala Kanwil, visi misi, struktur organisasi, sejarah — **struktur bidang di bawah Kanwil masih estimasi**, verifikasi setelah Peraturan Menteri Haji dan Umrah tentang Organisasi dan Tata Kerja Kanwil resmi berlaku |
| `src/data/estimasi-keberangkatan.json` | Fitur Cek Estimasi Keberangkatan | Lihat bagian khusus di bawah |

> ⚠️ **Penting sebelum go-live**: data pada `travel.json`, `regulasi.json`,
> `profil.json` (nama pejabat), dan `estimasi-keberangkatan.json` saat ini
> berisi **data contoh/placeholder** yang ditandai jelas (misalnya diberi
> label "(Contoh)"). Wajib diganti dengan data resmi dan terverifikasi
> sebelum situs digunakan untuk publik, khususnya data legalitas travel
> yang menyangkut keamanan masyarakat.

### Fitur Cek Estimasi Keberangkatan

Fitur ini punya lapisan data terpisah agar mudah diganti ke sumber data
nyata (mis. integrasi API Siskohat) tanpa mengubah komponen UI:

- **Data mock**: `src/data/estimasi-keberangkatan.json`
- **Lapisan akses data mock**: `src/lib/estimasi.ts` — fungsi
  `cariEstimasiPorsiSync(nomorPorsi)` dan `validasiNomorPorsi(nomorPorsi)`
- **Titik integrasi API resmi**: `src/app/informasi-haji/actions.ts` — lihat
  bagian "Integrasi ke Sistem Resmi" di bawah.

## Integrasi ke Sistem Resmi (untuk Tim IT)

⚠️ Situs ini **tidak** memiliki koneksi nyata ke sistem internal
Kementerian Haji dan Umrah (Siskohat, dsb.) — itu sistem tertutup yang
hanya bisa diakses oleh instansi resmi dengan kredensial resmi. Yang
sudah disiapkan di sini hanyalah *lapisan integrasi*, agar tim IT yang
punya akses resmi tinggal memasang kredensial tanpa perlu menulis ulang
komponen UI.

Cara mengaktifkan:

1. Salin `.env.example` menjadi `.env.local`.
2. Isi `HAJI_API_BASE_URL` dan `HAJI_API_KEY` dengan kredensial resmi.
3. Selesai — `src/app/informasi-haji/actions.ts`
   (`cariEstimasiPorsiAction`) otomatis akan memanggil API resmi tersebut
   alih-alih data mock. Bila API gagal merespons, fungsi ini otomatis
   *fallback* ke data mock lokal agar situs tidak rusak.

Selama kedua env var itu kosong (default), seluruh fitur tetap memakai
data mock lokal seperti biasa — tidak ada perilaku yang berubah.

Pola yang sama (config di `src/lib/integration-config.ts` + Server Action
di folder `src/app/<halaman>/actions.ts`) bisa direplikasi untuk
menyambungkan data lain ke sumber resmi saat tersedia, misalnya daftar
tunggu (`src/data/daftar-tunggu.json`) atau verifikasi legalitas travel
(`src/data/travel.json`). Untuk transaksi resmi lain (pendaftaran,
pelunasan, dll.), arahkan pengguna ke portal nasional resmi di
[haji.go.id/layanan](https://haji.go.id/layanan) — situs ini adalah
kanal informasi Kanwil Kalsel, bukan pengganti sistem transaksi resmi.

## Struktur Folder Ringkas

```
content/berita/        MDX berita & pengumuman
public/                Aset statis (gambar galeri, PDF regulasi, dll.)
src/app/                Routing App Router (satu folder = satu halaman)
src/components/         Komponen UI, termasuk src/components/ui (shadcn-style)
src/data/                Sumber data JSON yang mudah diedit
src/lib/                 Tipe data & fungsi akses data/konten
```

## Serah Terima Kepemilikan

Panduan singkat untuk memindahkan proyek ini ke pemilik/akun baru.

1. **Pindahkan repository GitHub.**
   - Cara paling bersih: pemilik lama membuka **Settings → General → Danger
     Zone → Transfer ownership** di repo GitHub ini dan memasukkan
     username/organisasi tujuan. Riwayat commit, issue, dan PR ikut
     berpindah.
   - Alternatif lebih cepat: undang akun baru sebagai **collaborator**
     dengan akses **Admin** (Settings → Collaborators), lalu akun baru
     melakukan transfer ownership sendiri dari sisi mereka kapan pun siap.
2. **Environment variables.** Situs ini **tidak menyimpan secret apa pun di
   dalam repo** — file `.env.example` di root hanya berisi nama variabel
   dengan nilai kosong (lihat bagian "Integrasi ke Sistem Resmi" di atas).
   Jika di kemudian hari sudah ada kredensial API resmi (`HAJI_API_BASE_URL`,
   `HAJI_API_KEY`), isi lewat **Vercel Project Settings → Environment
   Variables** (bukan file yang di-commit ke Git), atau file `.env.local` di
   mesin lokal yang sudah otomatis di-ignore oleh `.gitignore`. Jangan pernah
   mengirim isi `.env` lewat chat atau email biasa — pakai password manager
   bersama (mis. 1Password/Bitwarden) atau fitur "Environment Variables" di
   dashboard Vercel yang sudah terenkripsi.
3. **Pindahkan deployment Vercel.** Di dashboard Vercel: **Project Settings →
   Transfer** untuk memindahkan proyek ke tim/akun lain, atau hubungkan ulang
   repo yang sudah dipindah ownership-nya ke akun Vercel baru mengikuti
   langkah "Deploy ke Vercel" di atas.
4. **Domain kustom** (jika ada) ikut dipindahkan lewat pengaturan domain di
   Vercel Project Settings, atau diarahkan ulang (DNS) ke deployment baru.
5. **Verifikasi setelah pindah**: jalankan `npm install && npm run build`
   dari clone baru untuk memastikan tidak ada yang rusak, lalu cek daftar di
   bagian "Mengganti Data" di atas — pastikan pemilik baru tahu data mana
   yang masih placeholder dan perlu diisi data resmi sebelum publik.

## Aksesibilitas & Performa

- Ukuran teks dasar 18px, kontras warna tinggi, target sentuh besar
  (tombol minimal 44px), fokus keyboard terlihat jelas.
- Tanpa dependensi font eksternal (memakai font sistem) agar halaman ringan
  dan tetap tampil cepat di koneksi lambat.
- Navigasi mobile disederhanakan lewat menu hamburger (drawer) dengan
  target tap besar.
