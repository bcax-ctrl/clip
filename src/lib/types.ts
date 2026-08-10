export type Kabupaten = {
  id: string;
  nama: string;
};

export type Statistik = {
  tahun: number;
  keterangan: string;
  kuotaProvinsi: number;
  kuotaReguler: number;
  kuotaKhusus: number;
  jemaahBerangkatTahunLalu: number;
  totalDaftarTunggu: number;
  estimasiMasaTungguTahun: number;
  diperbaruiPada: string;
};

export type DaftarTunggu = {
  kabupatenId: string;
  kuotaTahunan: number;
  jumlahDaftarTunggu: number;
  estimasiTungguTahun: number;
};

export type Manasik = {
  angkatan: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  lokasi: string;
  pesertaKabupaten: string[];
};

export type Embarkasi = {
  nama: string;
  bandara: string;
  alamatAsramaHaji: string;
  cakupanWilayah: string;
  keterangan: string;
};

export type Travel = {
  nama: string;
  jenis: "PPIU" | "PIHK";
  kabupatenId: string;
  nomorSK: string;
  masaBerlakuSK: string;
  alamat: string;
  telepon: string;
  status: "aktif" | "kedaluwarsa";
};

export type Regulasi = {
  kategori: string;
  judul: string;
  nomor: string;
  tahun: number;
  file: string;
};

export type FaqTopik = {
  topik: string;
  pertanyaan: { q: string; a: string }[];
};

export type SumberResmi = {
  nama: string;
  url: string;
  keterangan: string;
};

export type EstimasiEntry = {
  nomorPorsi: string;
  nama: string;
  kabupatenId: string;
  tahunPerkiraanBerangkat: number;
  status: string;
};

export type GaleriItem = {
  id: number;
  src: string;
  judul: string;
  kategori: string;
  tanggal: string;
};

export type LayananItem = {
  slug: string;
  judul: string;
  ringkasan: string;
  icon: string;
  syarat: string[];
  alur: { judul: string; deskripsi: string }[];
  biaya: string;
  estimasiWaktu: string;
};

export type SiteConfig = {
  namaInstansi: string;
  namaKanwil: string;
  singkatan: string;
  keteranganKelembagaan: string;
  alamat: string;
  telepon: string;
  whatsapp: string;
  email: string;
  jamLayanan: { hari: string; jam: string }[];
  koordinatPeta: { lat: number; lng: number };
  sosialMedia: {
    instagram: string;
    facebook: string;
    youtube: string;
    website: string;
  };
  lapor: string;
  pengumumanBerjalan: string[];
};

export type Profil = {
  sambutan: {
    namaPejabat: string;
    jabatan: string;
    foto: string;
    isi: string[];
  };
  keteranganTransisi: string;
  visi: string;
  misi: string[];
  tugas: string;
  fungsi: string[];
  strukturOrganisasi: {
    kepala: string;
    seksi: { nama: string; tugasSingkat: string }[];
  };
  sejarah: string[];
};

export type BeritaMeta = {
  slug: string;
  title: string;
  date: string;
  category: string;
  excerpt: string;
  image?: string;
};

export type BeritaPost = BeritaMeta & {
  content: string;
};
