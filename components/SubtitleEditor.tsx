"use client";

import { useMemo, useState } from "react";
import type { Transcript } from "@/lib/types";
import { reconcileTranscript } from "@/lib/captions";

interface IndexedWord {
  idx: number; // index into transcript.words
  text: string;
  start: number;
}

interface Props {
  transcript: Transcript;
  /** only show words inside this range (the trimmed clip). */
  rangeStart: number;
  rangeEnd: number;
  onChange: (t: Transcript) => void;
  onSave: (t: Transcript) => Promise<void>;
}

/** Inline editor for fixing Whisper typos before render. */
export default function SubtitleEditor({
  transcript,
  rangeStart,
  rangeEnd,
  onChange,
  onSave,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Words within the clip range, grouped into readable lines by pauses.
  const lines = useMemo(() => {
    const inRange: IndexedWord[] = [];
    transcript.words.forEach((w, idx) => {
      if (w.end > rangeStart && w.start < rangeEnd) {
        inRange.push({ idx, text: w.text, start: w.start });
      }
    });
    const out: IndexedWord[][] = [];
    let cur: IndexedWord[] = [];
    let prevEnd = -1;
    for (const w of inRange) {
      if (cur.length >= 8 || (prevEnd >= 0 && w.start - prevEnd > 0.7)) {
        out.push(cur);
        cur = [];
      }
      cur.push(w);
      prevEnd = transcript.words[w.idx].end;
    }
    if (cur.length) out.push(cur);
    return out;
  }, [transcript, rangeStart, rangeEnd]);

  const mutate = (mut: (words: Transcript["words"]) => Transcript["words"]) => {
    const words = mut(transcript.words.map((w) => ({ ...w })));
    onChange(reconcileTranscript({ ...transcript, words }));
    setSaved(false);
  };

  const editWord = (idx: number, text: string) =>
    mutate((words) => {
      words[idx] = { ...words[idx], text };
      return words;
    });

  const deleteWord = (idx: number) =>
    mutate((words) => words.filter((_, i) => i !== idx));

  const save = async () => {
    setSaving(true);
    try {
      const reconciled = reconcileTranscript(transcript);
      await onSave(reconciled);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (lines.length === 0) {
    return (
      <p className="text-xs text-zinc-500">
        Tidak ada kata dalam rentang clip ini.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-ink-500 bg-ink-800 p-3">
        {lines.map((line, li) => (
          <div key={li} className="flex flex-wrap items-center gap-1">
            {line.map((w) => (
              <span key={w.idx} className="group relative inline-flex items-center">
                <input
                  value={w.text}
                  onChange={(e) => editWord(w.idx, e.target.value)}
                  style={{
                    width: `${Math.max(2, w.text.length + 1)}ch`,
                  }}
                  className="rounded border border-transparent bg-ink-600 px-1 py-0.5 text-sm text-zinc-100 outline-none focus:border-brand"
                  spellCheck={false}
                />
                <button
                  onClick={() => deleteWord(w.idx)}
                  title="Hapus kata"
                  className="ml-0.5 hidden text-xs text-zinc-500 hover:text-red-400 group-hover:inline"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Menyimpan…" : "Simpan perubahan"}
        </button>
        {saved && <span className="text-xs text-emerald-400">✓ tersimpan</span>}
        <span className="text-xs text-zinc-500">
          Klik kata untuk koreksi, hover lalu ✕ untuk hapus.
        </span>
      </div>
    </div>
  );
}
