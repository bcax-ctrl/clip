"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import type { GaleriItem } from "@/lib/types";

export function GalleryGrid({ items }: { items: GaleriItem[] }) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const close = React.useCallback(() => setActiveIndex(null), []);
  const showPrev = React.useCallback(
    () =>
      setActiveIndex((idx) =>
        idx === null ? null : (idx - 1 + items.length) % items.length
      ),
    [items.length]
  );
  const showNext = React.useCallback(
    () =>
      setActiveIndex((idx) => (idx === null ? null : (idx + 1) % items.length)),
    [items.length]
  );

  React.useEffect(() => {
    if (activeIndex === null) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") showPrev();
      if (e.key === "ArrowRight") showNext();
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [activeIndex, close, showPrev, showNext]);

  const active = activeIndex !== null ? items[activeIndex] : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveIndex(idx)}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border text-left focus-visible:outline-none"
          >
            <Image
              src={item.src}
              alt={item.judul}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <span className="absolute inset-x-0 bottom-0 bg-black/60 px-3 py-2 text-sm font-medium text-white">
              {item.judul}
            </span>
          </button>
        ))}
      </div>

      {active ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.judul}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Tutup"
            className="absolute top-4 right-4 flex size-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="size-6" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              showPrev();
            }}
            aria-label="Foto sebelumnya"
            className="absolute left-2 flex size-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-6"
          >
            <ChevronLeft className="size-7" aria-hidden="true" />
          </button>

          <div
            className="relative max-h-[80vh] w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={active.src}
              alt={active.judul}
              width={1000}
              height={750}
              className="mx-auto max-h-[70vh] w-auto rounded-lg object-contain"
            />
            <p className="mt-4 text-center text-lg font-semibold text-white">
              {active.judul}
            </p>
            <p className="text-center text-sm text-white/70">
              {active.kategori} &middot;{" "}
              {new Date(active.tanggal).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              showNext();
            }}
            aria-label="Foto berikutnya"
            className="absolute right-2 flex size-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-6"
          >
            <ChevronRight className="size-7" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </>
  );
}
