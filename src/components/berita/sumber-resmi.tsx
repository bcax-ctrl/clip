import { ExternalLink, Zap } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { SumberResmi } from "@/lib/types";

export function SumberResmiSection({ items }: { items: SumberResmi[] }) {
  return (
    <div className="rounded-xl border border-accent/30 bg-accent/10 p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Zap className="size-6 shrink-0 text-accent" aria-hidden="true" />
        <h2 className="text-xl font-extrabold">
          Berita Tercepat: Kanal Resmi Nasional
        </h2>
      </div>
      <p className="mt-2 text-base text-muted-foreground">
        Situs ini memuat berita dan pengumuman yang dikurasi untuk Kalimantan
        Selatan. Untuk berita haji dan umrah terbaru secara nasional dan
        tercepat, pantau langsung kanal resmi Kementerian Haji dan Umrah RI
        berikut.
      </p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.url}>
            <Card className="h-full p-4">
              <CardContent className="p-0">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 text-base font-bold text-primary hover:underline"
                >
                  {item.nama}
                  <ExternalLink
                    className="mt-1 size-4 shrink-0"
                    aria-hidden="true"
                  />
                </a>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.keterangan}
                </p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
