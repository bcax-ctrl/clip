"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NotificationToggle from "@/components/NotificationToggle";
import type { Job } from "@/lib/types";

function fmtDuration(sec?: number): string {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function HomePage() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs ?? []))
      .catch(() => {});
  }, []);

  const deleteJob = useCallback(async (id: string) => {
    if (!confirm("Hapus job ini beserta video & hasilnya?")) return;
    setJobs((prev) => prev.filter((j) => j.id !== id));
    await fetch(`/api/jobs/${id}`, { method: "DELETE" }).catch(() => {});
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setBusy("Mengupload video…");
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload gagal.");
        router.push(`/editor/${data.job.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload gagal.");
        setBusy(null);
      }
    },
    [router]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const submitUrl = useCallback(async () => {
    if (!url.trim()) return;
    setError(null);
    setBusy("Download dari YouTube (yt-dlp)…");
    try {
      const res = await fetch("/api/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Download gagal.");
      router.push(`/editor/${data.job.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download gagal.");
      setBusy(null);
    }
  }, [url, router]);

  return (
    <main className="space-y-8">
      <section className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Ubah video panjang jadi <span className="text-brand">clip viral</span>
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-400">
          Upload podcast/streaming kamu, ClipForge auto-bikin subtitle, tambah
          musik, crop 9:16, dan render siap-post ke Shorts/TikTok.
        </p>
      </section>

      {/* Dropzone */}
      <section
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`card flex cursor-pointer flex-col items-center justify-center gap-3 px-6 py-14 text-center transition ${
          dragging ? "border-brand bg-ink-600" : "hover:border-ink-400"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/x-m4v,video/webm,.mkv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <div className="text-4xl">📥</div>
        <div className="text-base font-semibold">
          {busy ? busy : "Drop video di sini, atau klik untuk pilih"}
        </div>
        <div className="text-xs text-zinc-500">MP4 / MOV / WEBM / MKV</div>
      </section>

      {/* YouTube link */}
      <section className="card p-5">
        <div className="label mb-2">Atau tempel link YouTube</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="input flex-1"
            placeholder="https://youtube.com/watch?v=…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitUrl()}
          />
          <button
            className="btn-primary"
            onClick={submitUrl}
            disabled={!url.trim() || !!busy}
          >
            Ambil video
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Butuh <code className="text-zinc-400">yt-dlp</code> terinstall. Hanya
          untuk konten yang kamu punya izinnya.
        </p>
      </section>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Settings: notifications */}
      <section>
        <NotificationToggle />
      </section>

      {/* Recent jobs */}
      {jobs.length > 0 && (
        <section className="space-y-3">
          <div className="label">Job terbaru</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {jobs.slice(0, 8).map((j) => (
              <div
                key={j.id}
                className="card flex items-center gap-2 px-4 py-3 hover:border-ink-400"
              >
                <a
                  href={
                    j.status === "done" ? `/result/${j.id}` : `/editor/${j.id}`
                  }
                  className="flex min-w-0 flex-1 items-center justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {j.sourceName}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {fmtDuration(j.durationSec)}
                    </div>
                  </div>
                  <StatusBadge status={j.status} />
                </a>
                <button
                  onClick={() => deleteJob(j.id)}
                  title="Hapus job"
                  className="flex-shrink-0 rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-ink-500 hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: Job["status"] }) {
  const map: Record<Job["status"], string> = {
    uploaded: "bg-ink-400 text-zinc-200",
    transcribing: "bg-amber-500/20 text-amber-300",
    transcribed: "bg-sky-500/20 text-sky-300",
    rendering: "bg-amber-500/20 text-amber-300",
    done: "bg-emerald-500/20 text-emerald-300",
    error: "bg-red-500/20 text-red-300",
  };
  return (
    <span
      className={`ml-3 flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${map[status]}`}
    >
      {status}
    </span>
  );
}
