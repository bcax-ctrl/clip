"use client";

import { useEffect, useRef, useState } from "react";
import { notifyEnabledPref, showNotification } from "@/lib/notify";
import type { Job } from "@/lib/types";

export default function ResultPage({
  params,
}: {
  params: { jobId: string };
}) {
  const jobId = params.jobId;
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const notified = useRef(false);

  useEffect(() => {
    let stop = false;
    const poll = async () => {
      const res = await fetch(`/api/jobs/${jobId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Job tidak ditemukan.");
        return;
      }
      const j: Job = data.job;
      setJob(j);

      if (
        !notified.current &&
        j.status === "done" &&
        notifyEnabledPref()
      ) {
        notified.current = true;
        const n = j.clips?.length
          ? `${j.clips.filter((c) => c.status === "done").length} clip siap 🎬`
          : "Clip kamu udah jadi! 🎬";
        showNotification(n, { body: "Tap untuk lihat & download." });
      }

      if (!stop && j.status === "rendering") setTimeout(poll, 1000);
    };
    poll();
    return () => {
      stop = true;
    };
  }, [jobId]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        {error}
      </div>
    );
  }
  if (!job) return <div className="text-sm text-zinc-400">Memuat…</div>;

  // ---- Multi-clip batch result ----
  if (job.clips && job.clips.length > 0) {
    const doneCount = job.clips.filter((c) => c.status === "done").length;
    return (
      <div className="space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold">
            {job.status === "rendering"
              ? "Merender clip…"
              : `${doneCount} clip siap 🎬`}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {doneCount}/{job.clips.length} selesai
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {job.clips.map((c, i) => (
            <div key={c.id} className="card p-3">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold">Clip {i + 1}</span>
                <span className="text-zinc-500">
                  {fmt(c.start)}–{fmt(c.end)}
                </span>
              </div>

              {c.status === "done" && c.outputFile ? (
                <>
                  <div className="aspect-[9/16] overflow-hidden rounded-lg bg-black">
                    <video
                      src={`/api/media/${jobId}/${c.outputFile}`}
                      controls
                      playsInline
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <a
                    href={`/api/media/${jobId}/${c.outputFile}`}
                    download={`clip-${i + 1}.mp4`}
                    className="btn-primary mt-2 w-full py-2 text-xs"
                  >
                    ⬇ Download
                  </a>
                </>
              ) : c.status === "error" ? (
                <div className="flex aspect-[9/16] items-center justify-center rounded-lg bg-red-500/10 p-3 text-center text-xs text-red-300">
                  {c.error || "Render gagal"}
                </div>
              ) : (
                <div className="flex aspect-[9/16] flex-col items-center justify-center gap-2 rounded-lg bg-ink-800">
                  <div className="h-2 w-3/4 overflow-hidden rounded-full bg-ink-500">
                    <div
                      className="h-full bg-brand transition-all"
                      style={{ width: `${c.percent ?? 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-400">
                    {c.status === "rendering"
                      ? `${c.percent ?? 0}%`
                      : "menunggu…"}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-2">
          <a href={`/editor/${jobId}`} className="btn-ghost">
            Edit ulang
          </a>
          <a href="/" className="btn-ghost">
            Buat baru
          </a>
        </div>
      </div>
    );
  }

  // ---- Single output result ----
  const outSrc = `/api/media/${jobId}/output`;
  const ready = job.status === "done" && job.hasOutput;

  return (
    <div className="mx-auto max-w-md space-y-5 text-center">
      <h1 className="text-2xl font-extrabold">
        {ready ? "Clip kamu udah jadi! 🎬" : "Status render"}
      </h1>

      {ready ? (
        <>
          <div className="mx-auto aspect-[9/16] w-full max-w-[320px] overflow-hidden rounded-2xl border border-ink-500 bg-black shadow-glow">
            <video
              src={outSrc}
              controls
              playsInline
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex flex-col gap-2">
            <a
              href={outSrc}
              download={`clipforge-${jobId}.mp4`}
              className="btn-primary w-full py-3"
            >
              ⬇ Download MP4
            </a>
            <a href={`/editor/${jobId}`} className="btn-ghost w-full">
              Edit ulang
            </a>
            <a href="/" className="text-xs text-zinc-400 hover:text-zinc-200">
              Buat clip baru
            </a>
          </div>
        </>
      ) : job.status === "error" ? (
        <div className="space-y-3">
          <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {job.error || "Render gagal."}
          </p>
          <a href={`/editor/${jobId}`} className="btn-ghost">
            Kembali ke editor
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="h-3 w-full overflow-hidden rounded-full bg-ink-500">
            <div
              className="h-full bg-brand transition-all"
              style={{ width: `${job.progress?.percent ?? 0}%` }}
            />
          </div>
          <p className="text-sm text-zinc-400">
            Lagi rendering… {job.progress?.percent ?? 0}%
          </p>
        </div>
      )}
    </div>
  );
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
