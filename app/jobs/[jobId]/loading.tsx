export default function JobLoading() {
  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A]">
      {/* Header skeleton */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-[#141414] flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="h-6 w-24 rounded bg-white/10 animate-pulse" />
          <div className="h-4 w-40 rounded bg-white/5 animate-pulse" />
        </div>
        <div className="h-6 w-20 rounded-full bg-white/10 animate-pulse" />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar skeleton */}
        <div className="w-[280px] flex-shrink-0 bg-[#141414] border-r border-white/10 flex flex-col">
          <div className="px-4 py-4 border-b border-white/10">
            <div className="h-4 w-32 rounded bg-white/10 animate-pulse" />
          </div>
          <div className="p-2 space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3 p-2 rounded-xl bg-white/5 animate-pulse">
                <div className="w-16 h-24 rounded-lg bg-white/10 flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 w-full rounded bg-white/10" />
                  <div className="h-4 w-3/4 rounded bg-white/10" />
                  <div className="h-5 w-12 rounded bg-white/5" />
                  <div className="h-3 w-full rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main area skeleton */}
        <main className="flex-1 bg-black flex items-center justify-center">
          <div className="w-[280px] h-[498px] rounded-xl bg-white/5 animate-pulse" />
        </main>
      </div>
    </div>
  )
}
