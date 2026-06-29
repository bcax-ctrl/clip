'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const MAX_MB = Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || 2000);
const ACCEPTED = ['.mp4', '.mov', '.mkv'];

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function UploadZone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [filePath, setFilePath] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = useCallback((f: File): string => {
    const ext = '.' + (f.name.split('.').pop() || '').toLowerCase();
    if (!ACCEPTED.includes(ext)) {
      return `Unsupported format. Use ${ACCEPTED.join(', ')}.`;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      return `File too large (${formatBytes(f.size)}). Max is ${MAX_MB} MB.`;
    }
    return '';
  }, []);

  const onFiles = useCallback(
    (files: FileList | null) => {
      setError('');
      if (!files || files.length === 0) return;
      const f = files[0];
      const err = validate(f);
      if (err) {
        setError(err);
        return;
      }
      setFile(f);
      setFilePath('');
    },
    [validate]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      onFiles(e.dataTransfer.files);
    },
    [onFiles]
  );

  const submit = useCallback(async () => {
    setError('');
    if (!file && !filePath.trim()) {
      setError('Choose a file or paste a local path.');
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      if (file) form.append('file', file);
      else form.append('filePath', filePath.trim());

      const res = await fetch('/api/jobs', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed.');
      router.push(`/jobs/${data.jobId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
      setSubmitting(false);
    }
  }, [file, filePath, router]);

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-8 py-16 text-center transition ${
          dragging
            ? 'border-amber bg-amber/5'
            : 'border-white/15 bg-surface hover:border-amber/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber/10 text-3xl">
          ⬆
        </div>
        {file ? (
          <div>
            <p className="text-lg font-semibold text-white">{file.name}</p>
            <p className="mt-1 text-sm text-white/50">{formatBytes(file.size)}</p>
          </div>
        ) : (
          <div>
            <p className="text-lg font-semibold text-white">
              Drag &amp; drop your video here
            </p>
            <p className="mt-1 text-sm text-white/50">
              MP4, MOV, or MKV · up to {MAX_MB} MB
            </p>
          </div>
        )}
      </div>

      <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-widest text-white/30">
        <span className="h-px flex-1 bg-white/10" />
        or paste a local path
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <input
        type="text"
        value={filePath}
        onChange={(e) => {
          setFilePath(e.target.value);
          setFile(null);
        }}
        placeholder="/Users/you/Movies/podcast.mp4"
        className="w-full rounded-lg border border-white/10 bg-surface px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-amber/60"
      />

      {error && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={submitting}
        className="btn-amber mt-5 w-full py-3 text-base"
      >
        {submitting ? 'Uploading…' : 'Generate Clips'}
      </button>
    </div>
  );
}
