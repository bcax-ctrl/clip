"use client";

import type { FilterLook } from "@/lib/types";

const LOOKS: { id: FilterLook; label: string; swatch: string }[] = [
  { id: "none", label: "Asli", swatch: "linear-gradient(135deg,#555,#888)" },
  { id: "vivid", label: "Vivid", swatch: "linear-gradient(135deg,#ff6a00,#ff007a)" },
  { id: "warm", label: "Warm", swatch: "linear-gradient(135deg,#ff9a3d,#ff5e62)" },
  { id: "cool", label: "Cool", swatch: "linear-gradient(135deg,#36d1dc,#5b86e5)" },
  { id: "mono", label: "B&W", swatch: "linear-gradient(135deg,#bbb,#333)" },
];

interface Props {
  look: FilterLook;
  onLook: (l: FilterLook) => void;
  progressBar: boolean;
  onProgressBar: (v: boolean) => void;
  ctaOn: boolean;
  onCtaOn: (v: boolean) => void;
  ctaText: string;
  onCtaText: (v: string) => void;
}

export default function EffectsPanel({
  look,
  onLook,
  progressBar,
  onProgressBar,
  ctaOn,
  onCtaOn,
  ctaText,
  onCtaText,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Color grade */}
      <div>
        <div className="label mb-2">Color grade</div>
        <div className="flex flex-wrap gap-2">
          {LOOKS.map((l) => (
            <button
              key={l.id}
              onClick={() => onLook(l.id)}
              className={`flex flex-col items-center gap-1 rounded-lg border p-1.5 transition ${
                look === l.id
                  ? "border-brand bg-brand/10"
                  : "border-ink-500 hover:border-ink-400"
              }`}
            >
              <span
                className="h-8 w-12 rounded"
                style={{ background: l.swatch }}
              />
              <span className="text-[11px] font-semibold">{l.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Retention progress bar */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={progressBar}
          onChange={(e) => onProgressBar(e.target.checked)}
          className="h-4 w-4 accent-brand"
        />
        Retention bar (bar progres di bawah — bikin orang nonton sampai habis)
      </label>

      {/* End CTA */}
      <div className="space-y-2 border-t border-ink-500 pt-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={ctaOn}
            onChange={(e) => onCtaOn(e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          End CTA (muncul di detik-detik terakhir)
        </label>
        {ctaOn && (
          <input
            className="input"
            value={ctaText}
            onChange={(e) => onCtaText(e.target.value)}
            placeholder="Follow for more 🔥"
            maxLength={60}
          />
        )}
      </div>
    </div>
  );
}
