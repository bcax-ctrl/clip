"use client";

import { useState } from "react";
import type { ClipSpec, ClipSuggestion } from "@/lib/types";

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface Props {
  jobId: string;
  hasTranscript: boolean;
  clips: ClipSpec[];
  currentTrim: { start: number; end: number };
  rendering: boolean;
  onAdd: (spec: ClipSpec) => void;
  onRemove: (id: string) => void;
  onPreview: (start: number, end: number) => void;
  onRenderAll: () => void;
}

export default function ClipsPanel({
  jobId,
  hasTranscript,
  clips,
  currentTrim,
  rendering,
  onAdd,
  onRemove,
  onPreview,
  onRenderAll,
}: Props) {
  const [suggestions, setSuggestions] = useState<ClipSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestErr, setSuggestErr] = useState<string | null>(null);

  const newId = () =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const loadSuggestions = async () => {
    setLoading(true);
    setSuggestErr(null);
    try {
      const res = await fetch(`/api/suggest/${jobId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menganalisa.");
      setSuggestions(data.suggestions ?? []);
      if ((data.suggestions ?? []).length === 0) {
        setSuggestErr("Belum nemu momen menonjol. Coba pilih manual.");
      }
    } catch (e) {
      setSuggestErr(e instanceof Error ? e.message : "Gagal menganalisa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Auto-suggest */}
      {hasTranscript && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="label">Auto-suggest momen</span>
            <button
              className="btn-ghost px-3 py-1.5 text-xs"
              onClick={loadSuggestions}
              disabled={loading}
            >
              {loading ? "Menganalisa…" : "✨ Cari highlight"}
            </button>
          </div>
          {suggestErr && (
            <p className="text-xs text-zinc-500">{suggestErr}</p>
          )}
          {suggestions.length > 0 && (
            <div className="space-y-1.5">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-ink-500 bg-ink-700 p-2.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-accent">
                      {fmt(s.start)} – {fmt(s.end)} · {fmt(s.end - s.start)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        className="rounded bg-ink-500 px-2 py-1 hover:bg-ink-400"
                        onClick={() => onPreview(s.start, s.end)}
                      >
                        Preview
                      </button>
                      <button
                        className="rounded bg-brand px-2 py-1 font-semibold text-white hover:bg-brand-glow"
                        onClick={() =>
                          onAdd({
                            id: newId(),
                            start: s.start,
                            end: s.end,
                            label: s.preview.slice(0, 40),
                          })
                        }
                      >
                        + Tambah
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-400">
                    “{s.preview}…”
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add current trim */}
      <button
        className="btn-ghost w-full text-sm"
        onClick={() =>
          onAdd({
            id: newId(),
            start: currentTrim.start,
            end: currentTrim.end,
          })
        }
      >
        + Tambah clip dari trim sekarang ({fmt(currentTrim.start)}–
        {fmt(currentTrim.end)})
      </button>

      {/* Queue */}
      <div className="space-y-2">
        <div className="label">
          Antrian clip {clips.length > 0 ? `(${clips.length})` : ""}
        </div>
        {clips.length === 0 ? (
          <p className="rounded-lg border border-dashed border-ink-500 px-3 py-3 text-center text-xs text-zinc-500">
            Belum ada clip. Tambah dari suggestion atau dari trim manual.
          </p>
        ) : (
          <div className="space-y-1.5">
            {clips.map((c, i) => (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded-lg border border-ink-500 bg-ink-700 px-3 py-2"
              >
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand/20 text-[10px] font-bold text-brand">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold">
                    {fmt(c.start)} – {fmt(c.end)} · {fmt(c.end - c.start)}
                  </div>
                  {c.label && (
                    <div className="truncate text-[11px] text-zinc-500">
                      {c.label}
                    </div>
                  )}
                </div>
                <button
                  className="text-xs text-zinc-500 hover:text-accent"
                  onClick={() => onPreview(c.start, c.end)}
                >
                  ▶
                </button>
                <button
                  className="text-xs text-zinc-500 hover:text-red-400"
                  onClick={() => onRemove(c.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        className="btn-primary w-full py-3"
        onClick={onRenderAll}
        disabled={rendering || clips.length === 0}
      >
        🚀 Render semua clip ({clips.length})
      </button>
      <p className="text-center text-xs text-zinc-500">
        Style, musik, crop & hook diterapkan ke semua clip. Render berurutan.
      </p>
    </div>
  );
}
