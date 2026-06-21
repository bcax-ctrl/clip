"use client";

import { useEffect, useRef, useState } from "react";
import type { MusicCategory } from "@/lib/types";

interface Track {
  category: MusicCategory;
  file: string;
  url: string;
}
type Library = Record<string, Track[]>;

export interface MusicValue {
  category: MusicCategory;
  file: string;
}

export default function MusicPicker({
  value,
  onChange,
}: {
  value: MusicValue | null;
  onChange: (v: MusicValue | null) => void;
}) {
  const [categories, setCategories] = useState<MusicCategory[]>([]);
  const [library, setLibrary] = useState<Library>({});
  const [active, setActive] = useState<MusicCategory | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/music")
      .then((r) => r.json())
      .then((d) => {
        setCategories(d.categories ?? []);
        setLibrary(d.library ?? {});
        setActive((d.categories ?? [])[0] ?? null);
      })
      .catch(() => {});
    return () => {
      if (stopTimer.current) clearTimeout(stopTimer.current);
      audioRef.current?.pause();
    };
  }, []);

  // 5-second preview
  const preview = (url: string) => {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    if (!audioRef.current) audioRef.current = new Audio();
    const a = audioRef.current;
    a.src = url;
    a.currentTime = 0;
    a.volume = 0.8;
    a.play().catch(() => {});
    stopTimer.current = setTimeout(() => a.pause(), 5000);
  };

  const tracks = active ? library[active] ?? [] : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
              active === c
                ? "bg-brand text-white"
                : "bg-ink-600 text-zinc-300 hover:bg-ink-500"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {tracks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-ink-500 px-3 py-4 text-center text-xs text-zinc-500">
          Belum ada track di kategori ini. Taruh file .mp3 royalty-free ke{" "}
          <code className="text-zinc-400">public/music/{active}</code>.
        </p>
      ) : (
        <div className="grid max-h-52 gap-1.5 overflow-y-auto pr-1">
          {tracks.map((t) => {
            const selected =
              value?.category === t.category && value?.file === t.file;
            return (
              <div
                key={t.file}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                  selected
                    ? "border-brand bg-brand/10"
                    : "border-ink-500 bg-ink-700"
                }`}
              >
                <button
                  className="min-w-0 flex-1 truncate text-left text-sm"
                  onClick={() =>
                    onChange(
                      selected ? null : { category: t.category, file: t.file }
                    )
                  }
                >
                  {selected ? "🎵 " : ""}
                  {t.file}
                </button>
                <button
                  className="ml-2 rounded-md bg-ink-500 px-2 py-1 text-xs hover:bg-ink-400"
                  onClick={() => preview(t.url)}
                  title="Preview 5 detik"
                >
                  ▶ 5s
                </button>
              </div>
            );
          })}
        </div>
      )}

      {value && (
        <button
          className="text-xs text-zinc-400 underline hover:text-zinc-200"
          onClick={() => onChange(null)}
        >
          Hapus pilihan musik
        </button>
      )}
    </div>
  );
}
