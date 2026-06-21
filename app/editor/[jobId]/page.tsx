"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import VideoPreview from "@/components/VideoPreview";
import StylePicker from "@/components/StylePicker";
import SubtitleEditor from "@/components/SubtitleEditor";
import MusicPicker, { MusicValue } from "@/components/MusicPicker";
import { showNotification, notifyEnabledPref } from "@/lib/notify";
import type {
  Job,
  Transcript,
  SubtitleStyleId,
  RenderOptions,
} from "@/lib/types";

type WhisperModel = "tiny" | "base" | "small";

export default function EditorPage({
  params,
}: {
  params: { jobId: string };
}) {
  const jobId = params.jobId;
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Phase 2
  const [model, setModel] = useState<WhisperModel>("base");
  const [transcribing, setTranscribing] = useState(false);
  const [style, setStyle] = useState<SubtitleStyleId>("karaoke");
  const [editingText, setEditingText] = useState(false);

  // Phase 3
  const [music, setMusic] = useState<MusicValue | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [duck, setDuck] = useState(true);

  // Clip selection (trim)
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const currentTimeRef = useRef(0);

  // Phase 4
  const [cropOffset, setCropOffset] = useState(0);
  const [hookText, setHookText] = useState("");
  const [hookDuration, setHookDuration] = useState(3);

  // Render
  const [rendering, setRendering] = useState(false);
  const [percent, setPercent] = useState(0);
  const [renderMsg, setRenderMsg] = useState("");

  const loadJob = useCallback(async () => {
    const res = await fetch(`/api/jobs/${jobId}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Job tidak ditemukan.");
      return;
    }
    setJob(data.job);
    if (data.job.hasTranscript && !transcript) {
      const tr = await fetch(`/api/transcript/${jobId}`).then((r) => r.json());
      if (tr.transcript) setTranscript(tr.transcript);
    }
  }, [jobId, transcript]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  // Seed clip duration from the job once it's known.
  useEffect(() => {
    if (job?.durationSec && duration === 0) {
      applyDuration(job.durationSec);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.durationSec]);

  // Adopt a freshly discovered duration (job probe or <video> metadata).
  const applyDuration = (d: number) => {
    if (!d || !Number.isFinite(d)) return;
    setDuration((prev) => (d > prev ? d : prev));
    setTrimEnd((prev) => (prev <= 0 ? d : prev));
  };

  const runTranscribe = async () => {
    setError(null);
    setTranscribing(true);
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, model }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transkripsi gagal.");
      setTranscript(data.transcript);
      setJob(data.job);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transkripsi gagal.");
    } finally {
      setTranscribing(false);
    }
  };

  const saveTranscript = async (t: Transcript) => {
    setError(null);
    const res = await fetch(`/api/transcript/${jobId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: t }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Gagal menyimpan subtitle.");
      throw new Error("save failed");
    }
  };

  const startRender = async () => {
    setError(null);
    setRendering(true);
    setPercent(0);
    setRenderMsg("Menyiapkan render…");

    const trimmed =
      duration > 0 &&
      trimEnd > trimStart &&
      (trimStart > 0.05 || trimEnd < duration - 0.05);

    const options: RenderOptions = {
      subtitleStyle: transcript ? style : "none",
      crop: { aspect: "9:16", offsetX: cropOffset },
      hook: { text: hookText, durationSec: hookDuration },
      music: music
        ? { ...music, volume: musicVolume, duck }
        : undefined,
      trim: trimmed ? { start: trimStart, end: trimEnd } : undefined,
    };

    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, options }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Render gagal dimulai.");
      subscribeProgress();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Render gagal.");
      setRendering(false);
    }
  };

  const subscribeProgress = () => {
    const es = new EventSource(`/api/render/progress/${jobId}`);
    es.onmessage = (ev) => {
      try {
        const { status, progress } = JSON.parse(ev.data);
        if (progress) {
          setPercent(progress.percent ?? 0);
          setRenderMsg(
            `Rendering… ${progress.percent ?? 0}%${
              progress.speed ? ` (${progress.speed})` : ""
            }`
          );
        }
        if (status === "error" || progress?.error) {
          es.close();
          setRendering(false);
          setError(progress?.error || "Render gagal. Cek render.log.");
          return;
        }
        if (status === "done" || progress?.done) {
          es.close();
          setPercent(100);
          setRendering(false);
          if (notifyEnabledPref()) {
            showNotification("Clip kamu udah jadi! 🎬", {
              body: "Tap untuk lihat & download hasilnya.",
              data: { url: `/result/${jobId}` },
            } as NotificationOptions);
          }
          router.push(`/result/${jobId}`);
        }
      } catch {
        /* ignore malformed frame */
      }
    };
    es.onerror = () => {
      es.close();
      setRendering(false);
    };
  };

  if (error && !job) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        {error}
      </div>
    );
  }
  if (!job) {
    return <div className="text-sm text-zinc-400">Memuat job…</div>;
  }

  const videoSrc = `/api/media/${jobId}/source`;

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      {/* LEFT: preview */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <VideoPreview
          src={videoSrc}
          transcript={transcript}
          style={style}
          cropOffset={cropOffset}
          hookText={hookText}
          hookDuration={hookDuration}
          clipStart={trimStart}
          clipEnd={trimEnd}
          onTime={(t) => (currentTimeRef.current = t)}
          onDuration={applyDuration}
        />
      </div>

      {/* RIGHT: controls */}
      <div className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Phase 2: transcription + style */}
        <Section step={1} title="Subtitle">
          {!transcript ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400">
                Buat subtitle word-level otomatis pakai Whisper.
              </p>
              <div className="flex items-center gap-2">
                <span className="label">Model</span>
                <select
                  className="input max-w-[140px]"
                  value={model}
                  onChange={(e) => setModel(e.target.value as WhisperModel)}
                  disabled={transcribing}
                >
                  <option value="tiny">tiny (cepat)</option>
                  <option value="base">base</option>
                  <option value="small">small (akurat)</option>
                </select>
                <button
                  className="btn-primary"
                  onClick={runTranscribe}
                  disabled={transcribing}
                >
                  {transcribing ? "Transkripsi…" : "Buat subtitle"}
                </button>
              </div>
              {transcribing && (
                <p className="text-xs text-zinc-500">
                  Whisper lagi jalan (bisa beberapa menit untuk video panjang)…
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-emerald-400">
                  ✓ {transcript.words.length} kata ditranskrip
                  {transcript.language ? ` (${transcript.language})` : ""}
                </p>
                <button
                  onClick={() => setEditingText((v) => !v)}
                  className="text-xs font-semibold text-zinc-300 underline hover:text-white"
                >
                  {editingText ? "Tutup editor" : "✏️ Edit teks"}
                </button>
              </div>

              {editingText && (
                <SubtitleEditor
                  transcript={transcript}
                  rangeStart={trimStart}
                  rangeEnd={
                    trimEnd > 0
                      ? trimEnd
                      : duration > 0
                      ? duration
                      : Number.MAX_SAFE_INTEGER
                  }
                  onChange={setTranscript}
                  onSave={saveTranscript}
                />
              )}

              <div className="label">Pilih style</div>
              <StylePicker value={style} onChange={setStyle} />
            </div>
          )}
        </Section>

        {/* Clip selection (trim) */}
        <Section step={2} title="Pilih Clip (Trim)">
          {duration > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">
                  {fmtTime(trimStart)} – {fmtTime(trimEnd)}
                </span>
                <span className="rounded-md bg-brand/15 px-2 py-0.5 text-xs font-semibold text-brand">
                  durasi {fmtTime(Math.max(0, trimEnd - trimStart))}
                </span>
              </div>

              <Slider
                label={`Mulai: ${fmtTime(trimStart)}`}
                min={0}
                max={duration}
                step={0.1}
                value={trimStart}
                onChange={(v) => setTrimStart(Math.min(v, trimEnd - 0.5))}
              />
              <Slider
                label={`Selesai: ${fmtTime(trimEnd)}`}
                min={0}
                max={duration}
                step={0.1}
                value={trimEnd}
                onChange={(v) => setTrimEnd(Math.max(v, trimStart + 0.5))}
              />

              <div className="flex flex-wrap gap-2">
                <button
                  className="btn-ghost px-3 py-1.5 text-xs"
                  onClick={() =>
                    setTrimStart(
                      Math.min(currentTimeRef.current, trimEnd - 0.5)
                    )
                  }
                >
                  ⏱ Set awal = posisi video
                </button>
                <button
                  className="btn-ghost px-3 py-1.5 text-xs"
                  onClick={() =>
                    setTrimEnd(
                      Math.max(currentTimeRef.current, trimStart + 0.5)
                    )
                  }
                >
                  ⏱ Set akhir = posisi video
                </button>
                <button
                  className="px-3 py-1.5 text-xs text-zinc-400 underline hover:text-zinc-200"
                  onClick={() => {
                    setTrimStart(0);
                    setTrimEnd(duration);
                  }}
                >
                  Reset (full)
                </button>
              </div>
              <p className="text-xs text-zinc-500">
                Putar video ke momen viral, lalu pakai tombol di atas untuk
                tandai awal/akhir. Subtitle & musik otomatis ngikut potongan.
              </p>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">
              Durasi video belum kebaca. Putar/seek videonya sebentar untuk
              memuat metadata.
            </p>
          )}
        </Section>

        {/* Phase 3: music */}
        <Section step={3} title="Background Music">
          <MusicPicker value={music} onChange={setMusic} />
          {music && (
            <div className="mt-3 space-y-3 border-t border-ink-500 pt-3">
              <Slider
                label={`Volume musik: ${Math.round(musicVolume * 100)}%`}
                min={0}
                max={1}
                step={0.05}
                value={musicVolume}
                onChange={setMusicVolume}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={duck}
                  onChange={(e) => setDuck(e.target.checked)}
                  className="h-4 w-4 accent-brand"
                />
                Auto-ducking (musik mengecil saat ada suara)
              </label>
            </div>
          )}
        </Section>

        {/* Phase 4: crop */}
        <Section step={4} title="Crop 9:16">
          <Slider
            label={`Geser fokus crop: ${
              cropOffset === 0
                ? "tengah"
                : cropOffset < 0
                ? `kiri ${Math.round(-cropOffset * 100)}%`
                : `kanan ${Math.round(cropOffset * 100)}%`
            }`}
            min={-1}
            max={1}
            step={0.05}
            value={cropOffset}
            onChange={setCropOffset}
          />
          <p className="mt-1 text-xs text-zinc-500">
            Default center-crop. Geser kalau subjek tidak di tengah frame.
          </p>
        </Section>

        {/* Phase 4: hook */}
        <Section step={5} title="Hook Text (3 detik pertama)">
          <input
            className="input"
            placeholder="cth: TUNGGU SAMPAI AKHIR 😱"
            value={hookText}
            onChange={(e) => setHookText(e.target.value)}
            maxLength={80}
          />
          <div className="mt-3">
            <Slider
              label={`Durasi hook: ${hookDuration.toFixed(1)} dtk`}
              min={1}
              max={6}
              step={0.5}
              value={hookDuration}
              onChange={setHookDuration}
            />
          </div>
        </Section>

        {/* Render */}
        <Section step={6} title="Render Final (1080×1920)">
          {rendering ? (
            <div className="space-y-2">
              <div className="h-3 w-full overflow-hidden rounded-full bg-ink-500">
                <div
                  className="h-full bg-brand transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-xs text-zinc-400">{renderMsg}</p>
            </div>
          ) : (
            <button className="btn-primary w-full py-3" onClick={startRender}>
              🚀 Render clip
            </button>
          )}
        </Section>
      </div>
    </div>
  );
}

function fmtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function Section({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/20 text-xs text-brand">
          {step}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-zinc-300">{label}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-brand"
      />
    </div>
  );
}
