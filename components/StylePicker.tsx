"use client";

import { STYLE_PRESETS } from "@/lib/ass";
import type { SubtitleStyleId } from "@/lib/types";

export default function StylePicker({
  value,
  onChange,
}: {
  value: SubtitleStyleId;
  onChange: (v: SubtitleStyleId) => void;
}) {
  return (
    <div className="grid gap-2">
      {STYLE_PRESETS.map((p) => {
        const selected = value === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              selected
                ? "border-brand bg-brand/10"
                : "border-ink-500 bg-ink-700 hover:border-ink-400"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">{p.label}</span>
              {selected && <span className="text-xs text-brand">✓ dipilih</span>}
            </div>
            <p className="mt-0.5 text-xs text-zinc-400">{p.description}</p>
          </button>
        );
      })}
      <button
        onClick={() => onChange("none")}
        className={`rounded-xl border px-4 py-2 text-left text-xs ${
          value === "none"
            ? "border-brand bg-brand/10 text-brand"
            : "border-ink-500 bg-ink-700 text-zinc-400 hover:border-ink-400"
        }`}
      >
        Tanpa subtitle
      </button>
    </div>
  );
}
