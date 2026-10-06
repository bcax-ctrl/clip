import kabupatenJson from "@/data/kabupaten.json";
import statistikJson from "@/data/statistik.json";
import daftarTungguJson from "@/data/daftar-tunggu.json";
import manasikJson from "@/data/manasik.json";
import embarkasiJson from "@/data/embarkasi.json";
import travelJson from "@/data/travel.json";
import regulasiJson from "@/data/regulasi.json";
import faqJson from "@/data/faq.json";
import galeriJson from "@/data/galeri.json";
import layananJson from "@/data/layanan.json";
import siteJson from "@/data/site.json";
import profilJson from "@/data/profil.json";
import sumberResmiJson from "@/data/sumber-resmi.json";

import type {
  Kabupaten,
  Statistik,
  DaftarTunggu,
  Manasik,
  Embarkasi,
  Travel,
  Regulasi,
  FaqTopik,
  GaleriItem,
  LayananItem,
  SiteConfig,
  Profil,
  SumberResmi,
} from "./types";

export const kabupatenList: Kabupaten[] = kabupatenJson;
export const statistik: Statistik = statistikJson;
export const daftarTunggu: DaftarTunggu[] = daftarTungguJson;
export const manasikList: Manasik[] = manasikJson;
export const embarkasi: Embarkasi = embarkasiJson;
export const travelList: Travel[] = travelJson as Travel[];
export const regulasiList: Regulasi[] = regulasiJson;
export const faqList: FaqTopik[] = faqJson;
export const galeriList: GaleriItem[] = galeriJson;
export const layananList: LayananItem[] = layananJson;
export const site: SiteConfig = siteJson;
export const profil: Profil = profilJson;
export const sumberResmiList: SumberResmi[] = sumberResmiJson;

export function getKabupatenNama(id: string): string {
  return kabupatenList.find((k) => k.id === id)?.nama ?? id;
}

export function getLayananBySlug(slug: string): LayananItem | undefined {
  return layananList.find((l) => l.slug === slug);
}

export function getDaftarTungguGabungan() {
  return daftarTunggu.map((row) => ({
    ...row,
    namaKabupaten: getKabupatenNama(row.kabupatenId),
  }));
}

export function getTravelGabungan() {
  return travelList.map((row) => ({
    ...row,
    namaKabupaten: getKabupatenNama(row.kabupatenId),
  }));
}

export function getManasikGabungan() {
  return manasikList.map((row) => ({
    ...row,
    namaKabupatenPeserta: row.pesertaKabupaten.map(getKabupatenNama),
  }));
}
