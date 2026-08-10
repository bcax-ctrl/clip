import estimasiJson from "@/data/estimasi-keberangkatan.json";
import type { EstimasiEntry } from "./types";
import { getKabupatenNama } from "./data";

/**
 * Lapisan data mock untuk fitur "Cek Estimasi Keberangkatan". Fungsi di
 * bawah ini murni membaca data lokal dan aman dipakai di Client Component.
 * Titik integrasi ke API resmi ada di
 * src/app/informasi-haji/actions.ts (`cariEstimasiPorsiAction`), bukan di
 * sini — supaya kredensial API tidak pernah masuk ke bundle client.
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
