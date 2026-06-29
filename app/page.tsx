import UploadZone from '@/components/UploadZone'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-medium mb-2">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
            AI-Powered Video Clipper
          </div>
          <h1 className="text-5xl font-black tracking-tight">
            Clip<span className="text-amber-400">Mine</span>
          </h1>
          <p className="text-white/50 text-lg max-w-md mx-auto">
            Upload a long-form video. Get viral short clips with subtitles — automatically.
          </p>
        </div>

        <UploadZone />

        <div className="grid grid-cols-3 gap-4 pt-4">
          {[
            { icon: '🎙️', label: 'Auto Transcription', desc: 'Powered by OpenAI Whisper' },
            { icon: '🤖', label: 'AI Clip Detection', desc: 'Claude finds viral moments' },
            { icon: '🎬', label: 'Subtitle Burn-in', desc: 'TikTok-style captions' },
          ].map((feature) => (
            <div key={feature.label} className="bg-[#141414] rounded-xl p-4 text-center space-y-1 border border-white/5">
              <div className="text-2xl">{feature.icon}</div>
              <p className="text-sm font-semibold text-white/80">{feature.label}</p>
              <p className="text-xs text-white/40">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
