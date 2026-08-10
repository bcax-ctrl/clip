import type { Metadata } from "next";
import { Download, FileText, Info } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { regulasiList } from "@/lib/data";

export const metadata: Metadata = {
  title: "Regulasi & Unduhan",
  description:
    "Kumpulan peraturan perundang-undangan dan formulir terkait penyelenggaraan haji dan umrah.",
};

export default function RegulasiPage() {
  const grouped = regulasiList.reduce<Record<string, typeof regulasiList>>(
    (acc, item) => {
      acc[item.kategori] = acc[item.kategori] ?? [];
      acc[item.kategori].push(item);
      return acc;
    },
    {}
  );

  return (
    <div>
      <PageHeader
        title="Regulasi & Unduhan"
        description="Peraturan perundang-undangan, keputusan, dan formulir terkait penyelenggaraan haji dan umrah."
      />

      <section className="container-page pt-10">
        <div className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/10 p-5 text-foreground">
          <Info className="mt-0.5 size-6 shrink-0 text-accent" aria-hidden="true" />
          <p className="text-base">
            Sejak 2026, kewenangan pengaturan haji dan umrah dialihkan dari
            Kementerian Agama ke Kementerian Haji dan Umrah (UU No. 8/2019 jo.
            UU No. 14/2025). Peraturan Menteri Agama (PMA) yang ditandai
            &ldquo;masa transisi&rdquo; masih berlaku sepanjang belum digantikan
            oleh peraturan baru dari Kementerian Haji dan Umrah.
          </p>
        </div>
      </section>

      <section className="container-page py-12 space-y-10">
        {Object.entries(grouped).map(([kategori, items]) => (
          <div key={kategori}>
            <h2 className="text-2xl font-extrabold">{kategori}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {items.map((item) => (
                <Card key={item.file}>
                  <CardContent className="flex items-start gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                      <FileText className="size-6" aria-hidden="true" />
                    </span>
                    <div className="flex-1">
                      <Badge variant="outline" className="mb-2">
                        {item.nomor} &middot; {item.tahun}
                      </Badge>
                      <p className="text-lg font-bold leading-snug">
                        {item.judul}
                      </p>
                      <Button asChild size="sm" className="mt-3">
                        <a href={item.file} download>
                          <Download className="size-4" aria-hidden="true" />
                          Unduh PDF
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
