import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { GalleryGrid } from "@/components/galeri/gallery-grid";
import { galeriList } from "@/lib/data";

export const metadata: Metadata = {
  title: "Galeri",
  description: "Dokumentasi kegiatan Kanwil Kementerian Haji dan Umrah Provinsi Kalimantan Selatan.",
};

export default function GaleriPage() {
  return (
    <div>
      <PageHeader
        title="Galeri Kegiatan"
        description="Dokumentasi kegiatan pemberangkatan, manasik, dan pelayanan haji di Kalimantan Selatan. Klik foto untuk memperbesar."
      />
      <section className="container-page py-12">
        <GalleryGrid items={galeriList} />
      </section>
    </div>
  );
}
