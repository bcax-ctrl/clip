"use client";

import { useEffect, useState } from "react";
import type { Job } from "@/lib/types";

export default function ResultPage({
  params,
}: {
  params: { jobId: string };
}) {
  const jobId = params.jobId;
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    const poll = async () => {
      const res = await fetch(`/api/jobs/${jobId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Job tidak ditemukan.");
        return;
      }
      setJob(data.job);
      // keep polling until output is ready
      if (!stop && data.job.status === "rendering") {
        setTimeout(poll, 1000);
      }
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
