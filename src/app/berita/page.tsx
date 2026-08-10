import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { BeritaList } from "@/components/berita/berita-list";
import { getAllBerita, getBeritaCategories } from "@/lib/berita";

export const metadata: Metadata = {
  title: "Berita & Pengumuman",
  description:
    "Berita, pengumuman, dan kegiatan terbaru Kanwil Kementerian Haji dan Umrah Provinsi Kalimantan Selatan.",
};

export default function BeritaPage() {
  const items = getAllBerita();
  const categories = getBeritaCategories();

  return (
    <div>
      <PageHeader
        title="Berita & Pengumuman"
        description="Informasi terbaru seputar penyelenggaraan haji dan umrah di Kalimantan Selatan."
      />
      <section className="container-page py-12">
        <BeritaList items={items} categories={categories} />
      </section>
    </div>
  );
}
