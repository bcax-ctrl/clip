import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ComplaintForm } from "@/components/kontak/complaint-form";
import { Card, CardContent } from "@/components/ui/card";
import { site } from "@/lib/data";

export const metadata: Metadata = {
  title: "Kontak & Pengaduan",
  description:
    "Alamat, jam layanan, telepon, email, dan formulir pengaduan Kanwil Kementerian Haji dan Umrah Provinsi Kalimantan Selatan.",
};

export default function KontakPage() {
  const { lat, lng } = site.koordinatPeta;
  const bbox = `${lng - 0.02}%2C${lat - 0.02}%2C${lng + 0.02}%2C${lat + 0.02}`;
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <div>
      <PageHeader
        title="Kontak & Pengaduan"
        description="Hubungi kami melalui saluran resmi di bawah ini."
      />

      <section className="container-page py-12">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardContent className="space-y-5">
                <div className="flex gap-3">
                  <MapPin className="mt-1 size-6 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-lg font-bold">Alamat</p>
                    <p className="text-base text-muted-foreground">
                      {site.alamat}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Clock className="mt-1 size-6 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-lg font-bold">Jam Layanan</p>
                    <ul className="text-base text-muted-foreground">
                      {site.jamLayanan.map((row) => (
                        <li key={row.hari}>
                          {row.hari}: {row.jam}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Phone className="mt-1 size-6 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-lg font-bold">Telepon</p>
                    <a
                      href={`tel:${site.telepon.replace(/[^0-9+]/g, "")}`}
                      className="text-base text-primary hover:underline"
                    >
                      {site.telepon}
                    </a>
                  </div>
                </div>
                <div className="flex gap-3">
                  <MessageCircle className="mt-1 size-6 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-lg font-bold">WhatsApp</p>
                    <a
                      href={`https://wa.me/${site.whatsapp.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base text-primary hover:underline"
                    >
                      {site.whatsapp}
                    </a>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Mail className="mt-1 size-6 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-lg font-bold">Email</p>
                    <a
                      href={`mailto:${site.email}`}
                      className="text-base text-primary hover:underline break-all"
                    >
                      {site.email}
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/40 bg-secondary/60">
              <CardContent>
                <p className="text-lg font-bold">Kanal Pengaduan Resmi</p>
                <p className="mt-2 text-base text-muted-foreground">
                  Untuk pengaduan resmi yang dapat dilacak statusnya, silakan
                  gunakan Layanan Aspirasi dan Pengaduan Online Rakyat
                  (LAPOR!).
                </p>
                <a
                  href={site.lapor}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-lg font-bold text-primary hover:underline"
                >
                  Buka LAPOR! &rarr;
                </a>
              </CardContent>
            </Card>

            <div className="overflow-hidden rounded-xl border border-border">
              <iframe
                title="Peta lokasi kantor"
                src={mapSrc}
                className="h-72 w-full"
                loading="lazy"
              />
            </div>
          </div>

          <Card>
            <CardContent>
              <h2 className="text-2xl font-extrabold">Formulir Pengaduan</h2>
              <p className="mt-2 text-base text-muted-foreground">
                Sampaikan pertanyaan atau pengaduan Anda. Kami akan
                menindaklanjuti secepatnya.
              </p>
              <div className="mt-6">
                <ComplaintForm email={site.email} />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
