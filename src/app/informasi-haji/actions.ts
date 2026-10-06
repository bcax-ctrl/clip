"use server";

import { cariEstimasiPorsiSync, type HasilEstimasi } from "@/lib/estimasi";
import { hajiApiConfig, hasLiveHajiApi } from "@/lib/integration-config";

/**
 * Titik integrasi resmi untuk "Cek Estimasi Keberangkatan".
 *
 * Selama HAJI_API_BASE_URL/HAJI_API_KEY belum diisi (lihat
 * src/lib/integration-config.ts), fungsi ini otomatis memakai data mock
 * lokal — perilaku situs tidak berubah. Setelah tim IT mengisi kredensial
 * resmi di environment variable, permintaan akan diteruskan ke API asli
 * tanpa perlu mengubah komponen UI (src/components/informasi-haji/
 * estimasi-checker.tsx) sama sekali.
 */
export async function cariEstimasiPorsiAction(
  nomorPorsi: string
): Promise<HasilEstimasi> {
  if (hasLiveHajiApi) {
    try {
      const res = await fetch(
        `${hajiApiConfig.baseUrl}/estimasi-keberangkatan/${encodeURIComponent(nomorPorsi)}`,
        {
          headers: { Authorization: `Bearer ${hajiApiConfig.apiKey}` },
          cache: "no-store",
        }
      );

      if (res.ok) {
        return (await res.json()) as HasilEstimasi;
      }

      console.error(
        `Haji API merespons status ${res.status}, fallback ke data mock.`
      );
    } catch (err) {
      console.error("Gagal menghubungi Haji API, fallback ke data mock:", err);
    }
  }

  return cariEstimasiPorsiSync(nomorPorsi);
}
