/**
 * Titik konfigurasi untuk integrasi ke sistem resmi (mis. Siskohat atau API
 * internal Kementerian Haji dan Umrah). Server-side only — jangan diimpor
 * dari Client Component, karena akan memuat HAJI_API_KEY.
 *
 * Selama env var di bawah belum diisi, seluruh layanan otomatis memakai
 * data mock lokal (aman, tidak ada perilaku yang berubah). Lihat README
 * bagian "Integrasi ke Sistem Resmi" untuk cara mengisinya.
 */
export const hajiApiConfig = {
  baseUrl: process.env.HAJI_API_BASE_URL ?? "",
  apiKey: process.env.HAJI_API_KEY ?? "",
};

export const hasLiveHajiApi = Boolean(
  hajiApiConfig.baseUrl && hajiApiConfig.apiKey
);
