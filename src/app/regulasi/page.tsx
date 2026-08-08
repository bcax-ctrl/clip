import type { Metadata } from "next";
import { Download, FileText } from "lucide-react";

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
