import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { TravelDirectory } from "@/components/direktori-travel/travel-directory";
import { getTravelGabungan, kabupatenList } from "@/lib/data";

export const metadata: Metadata = {
  title: "Direktori Travel",
  description:
    "Daftar PPIU dan PIHK berizin di Kalimantan Selatan. Periksa legalitas travel sebelum melakukan pembayaran.",
};

export default function DirektoriTravelPage() {
  const data = getTravelGabungan();

  return (
    <div>
      <PageHeader
        title="Direktori Travel PPIU & PIHK"
        description="Daftar penyelenggara perjalanan umrah (PPIU) dan penyelenggara ibadah haji khusus (PIHK) berizin di Kalimantan Selatan."
      />
      <section className="container-page py-12">
        <TravelDirectory data={data} kabupatenList={kabupatenList} />
      </section>
    </div>
  );
}
