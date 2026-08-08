import estimasiJson from "@/data/estimasi-keberangkatan.json";
import type { EstimasiEntry } from "./types";
import { getKabupatenNama } from "./data";

/**
 * Lapisan data terpisah untuk fitur "Cek Estimasi Keberangkatan".
 * Saat ini memakai mock data JSON. Untuk produksi, ganti implementasi
 * `cariEstimasiPorsi` agar memanggil API resmi (mis. Siskohat) tanpa
 * mengubah kontrak fungsi ini.
 */

const DATA: EstimasiEntry[] = estimasiJson.data;
export const ESTIMASI_KETERANGAN = estimasiJson.keterangan;

export const NOMOR_PORSI_REGEX = /^\d{10}$/;

export function validasiNomorPorsi(nomorPorsi: string): boolean {
  return NOMOR_PORSI_REGEX.test(nomorPorsi.trim());
}

export type HasilEstimasi = {
  ditemukan: boolean;
  data?: EstimasiEntry & { namaKabupaten: string };
};

export function cariEstimasiPorsiSync(nomorPorsi: string): HasilEstimasi {
  const nomor = nomorPorsi.trim();
  const found = DATA.find((entry) => entry.nomorPorsi === nomor);

  if (!found) {
    return { ditemukan: false };
  }

  return {
    ditemukan: true,
    data: { ...found, namaKabupaten: getKabupatenNama(found.kabupatenId) },
  };
}

export async function cariEstimasiPorsi(
  nomorPorsi: string
): Promise<HasilEstimasi> {
  return cariEstimasiPorsiSync(nomorPorsi);
}
