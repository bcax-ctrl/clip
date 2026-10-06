import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { BeritaList } from "@/components/berita/berita-list";
import { SumberResmiSection } from "@/components/berita/sumber-resmi";
import { getAllBerita, getBeritaCategories } from "@/lib/berita";
import { sumberResmiList } from "@/lib/data";

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
      <section className="container-page pt-10">
        <SumberResmiSection items={sumberResmiList} />
      </section>

      <section className="container-page py-12">
        <h2 className="mb-6 text-2xl font-extrabold sm:text-3xl">
          Berita &amp; Pengumuman Kanwil Kalsel
        </h2>
        <BeritaList items={items} categories={categories} />
      </section>
    </div>
  );
}
