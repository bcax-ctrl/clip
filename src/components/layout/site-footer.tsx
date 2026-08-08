import Link from "next/link";
import { AtSign, Clapperboard, Mail, MapPin, Phone, Users } from "lucide-react";

import { site } from "@/lib/data";
import { navItems } from "@/lib/nav";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/60">
      <div className="container-page grid gap-10 py-12 md:grid-cols-3">
        <div>
          <h2 className="text-lg font-extrabold text-primary">
            {site.namaInstansi}
          </h2>
          <p className="mt-1 text-base font-medium">{site.namaKanwil}</p>
          <ul className="mt-4 space-y-3 text-base">
            <li className="flex gap-2">
              <MapPin className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
              <span>{site.alamat}</span>
            </li>
            <li className="flex gap-2">
              <Phone className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <a href={`tel:${site.telepon.replace(/[^0-9+]/g, "")}`} className="hover:underline">
                {site.telepon}
              </a>
            </li>
            <li className="flex gap-2">
              <Mail className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <a href={`mailto:${site.email}`} className="hover:underline break-all">
                {site.email}
              </a>
            </li>
          </ul>
        </div>

        <nav aria-label="Tautan situs">
          <h2 className="text-lg font-extrabold">Tautan Cepat</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-base">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-lg font-extrabold">Kanal Resmi</h2>
          <div className="mt-4 flex gap-3">
            <a
              href={site.sosialMedia.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              aria-label="Instagram"
            >
              <AtSign className="size-5" aria-hidden="true" />
            </a>
            <a
              href={site.sosialMedia.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              aria-label="Facebook"
            >
              <Users className="size-5" aria-hidden="true" />
            </a>
            <a
              href={site.sosialMedia.youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              aria-label="YouTube"
            >
              <Clapperboard className="size-5" aria-hidden="true" />
            </a>
          </div>

          <p className="mt-6 text-base">
            Laporkan pengaduan melalui{" "}
            <a
              href={site.lapor}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline"
            >
              LAPOR!
            </a>{" "}
            atau halaman{" "}
            <Link href="/kontak" className="font-semibold text-primary hover:underline">
              Kontak &amp; Pengaduan
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="border-t border-border py-5">
        <p className="container-page text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {site.namaInstansi}, {site.namaKanwil}.
          Seluruh hak cipta dilindungi.
        </p>
      </div>
    </footer>
  );
}
