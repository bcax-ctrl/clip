import UploadZone from '@/components/UploadZone';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
          Turn long videos into{' '}
          <span className="text-amber">viral clips</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-white/60">
          ClipMine auto-transcribes your video, uses AI to find the most
          engaging moments, and renders short clips with TikTok-style burned-in
          subtitles.
        </p>
      </div>

      <UploadZone />

      <div className="mt-12 grid grid-cols-3 gap-4 text-center">
        {[
          { n: '1', t: 'Transcribe', d: 'Whisper turns speech into timestamps' },
          { n: '2', t: 'Analyze', d: 'Claude finds the viral moments' },
          { n: '3', t: 'Clip', d: 'FFmpeg renders 9:16 captioned clips' },
        ].map((s) => (
          <div key={s.n} className="card p-4">
            <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-amber/15 text-sm font-bold text-amber">
              {s.n}
            </div>
            <p className="text-sm font-semibold">{s.t}</p>
            <p className="mt-1 text-xs text-white/50">{s.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
