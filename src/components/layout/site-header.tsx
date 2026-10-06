"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Phone, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { navItems } from "@/lib/nav";
import { site } from "@/lib/data";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="bg-primary text-primary-foreground">
        <div className="container-page flex flex-wrap items-center justify-between gap-2 py-1.5 text-sm">
          <span className="font-medium">{site.namaKanwil}</span>
          <a
            href={`tel:${site.telepon.replace(/[^0-9+]/g, "")}`}
            className="flex items-center gap-1.5 font-medium hover:underline"
          >
            <Phone className="size-4" aria-hidden="true" />
            {site.telepon}
          </a>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Beranda Kanwil Kemenhaj Kalsel">
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-extrabold text-primary-foreground"
            aria-hidden="true"
          >
            KH
          </span>
          <span className="leading-tight">
            <span className="block text-base font-extrabold text-primary sm:text-lg">
              Kanwil Kemenhaj
            </span>
            <span className="block text-xs text-muted-foreground sm:text-sm">
              Provinsi Kalimantan Selatan
            </span>
          </span>
        </Link>

        <nav
          className="hidden items-center gap-0.5 2xl:flex"
          aria-label="Navigasi utama"
        >
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-2.5 py-2 text-sm font-semibold whitespace-nowrap transition-colors hover:bg-secondary hover:text-primary",
                  active ? "bg-secondary text-primary" : "text-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon" className="hidden sm:inline-flex">
            <Link href="/informasi-haji" aria-label="Cek estimasi keberangkatan">
              <Search className="size-5" aria-hidden="true" />
            </Link>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="2xl:hidden" aria-label="Buka menu navigasi">
                <Menu className="size-6" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Menu Navigasi</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1" aria-label="Navigasi mobile">
                {navItems.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  return (
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "rounded-lg px-4 py-3 text-lg font-semibold",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-secondary"
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
