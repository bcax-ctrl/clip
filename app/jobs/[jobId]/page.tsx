'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Job, Clip } from '@/lib/types'
import ClipSidebar from '@/components/ClipSidebar'
import VideoPlayer from '@/components/VideoPlayer'
import StatusProgress from '@/components/StatusProgress'
import Link from 'next/link'

export default function JobPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const [job, setJob] = useState<Job | null>(null)
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null)
  const [error, setError] = useState('')
  const [showDownloadTip, setShowDownloadTip] = useState(false)
  const tipRef = useRef<HTMLDivElement>(null)

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`)
      if (!res.ok) throw new Error('Job not found')
      const data = await res.json()
      setJob(data)
      if (data.clips?.length > 0 && !selectedClip) {
        setSelectedClip(data.clips[0])
      }
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message)
    }
  }, [jobId, selectedClip])

  useEffect(() => {
    fetchJob()
    const interval = setInterval(() => {
      if (job?.status !== 'done' && job?.status !== 'error') {
        fetchJob()
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [fetchJob, job?.status])

  // Set dynamic page title
  useEffect(() => {
    if (!job) return
    if (job.status === 'done') {
      document.title = `Results: ${job.fileName} — ClipMine`
    } else {
      document.title = 'Processing — ClipMine'
    }
    return () => { document.title = 'ClipMine' }
  }, [job])

  // Close tooltip on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tipRef.current && !tipRef.current.contains(e.target as Node)) {
        setShowDownloadTip(false)
      }
    }
    if (showDownloadTip) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showDownloadTip])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400">{error}</p>
          <Link href="/" className="text-amber-400 hover:underline text-sm">Go back home</Link>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/50">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading job...
        </div>
      </div>
    )
  }

  const isProcessing = job.status !== 'done' && job.status !== 'error'

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A]">
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-[#141414] flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-black">
            Clip<span className="text-amber-400">Mine</span>
          </Link>
          <div className="text-xs text-white/40 max-w-xs truncate hidden sm:block">{job.fileName}</div>
        </div>
        <div className="flex items-center gap-3">
          {job.status === 'done' && job.clips?.length > 0 && (
            <div className="relative" ref={tipRef}>
              <button
                onClick={() => setShowDownloadTip((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium rounded-lg transition-colors border border-amber-500/30"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download All
              </button>
              {showDownloadTip && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-[#1E1E1E] border border-white/10 rounded-xl p-3 shadow-xl z-50 text-xs text-white/70 leading-relaxed">
                  Right-click each clip and choose <span className="text-white font-medium">Save As</span>, or use the <span className="text-amber-400 font-medium">Download</span> button on each clip card.
                </div>
              )}
            </div>
          )}
          <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium ${
            job.status === 'done' ? 'bg-green-500/20 text-green-400' :
            job.status === 'error' ? 'bg-red-500/20 text-red-400' :
            'bg-amber-500/20 text-amber-400'
          }`}>
            {job.status === 'error' ? 'Error' : job.status === 'done' ? 'Complete' : 'Processing'}
          </span>
        </div>
      </header>

      {isProcessing && (
        <div className="px-8 py-6 border-b border-white/10 bg-[#0D0D0D]">
          <StatusProgress
            status={job.status}
            progress={job.progress}
            progressStep={job.progressStep}
            error={job.error}
          />
        </div>
      )}

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        <ClipSidebar
          clips={job.clips}
          activeClipId={selectedClip?.id || null}
          jobId={jobId}
          onSelect={setSelectedClip}
          isProcessing={isProcessing}
        />

        <main className="flex-1 overflow-hidden min-h-0">
          {selectedClip ? (
            <VideoPlayer
              clip={selectedClip}
              transcript={job.transcript || []}
              jobId={jobId}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-8 gap-4">
              {isProcessing ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <svg className="animate-spin w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-white/80">{job.progressStep}</p>
                    <p className="text-sm text-white/40 mt-1">Clips will appear in the sidebar as they are generated</p>
                  </div>
                </>
              ) : job.status === 'error' ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-red-400">Processing Error</p>
                    <p className="text-sm text-white/40 mt-1">{job.error}</p>
                  </div>
                </>
              ) : (
                <p className="text-white/40">Select a clip from the sidebar</p>
              )}
            </div>
          )}
        </main>

        {selectedClip && (
          <aside className="hidden md:block w-72 flex-shrink-0 border-l border-white/10 bg-[#141414] overflow-y-auto p-4 space-y-4">
            <div>
              <h3 className="text-xs text-white/40 uppercase tracking-wider mb-2">Clip Info</h3>
              <h2 className="font-bold text-white leading-snug">{selectedClip.title}</h2>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Viral Score</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${selectedClip.score * 10}%` }}
                    />
                  </div>
                  <span className="text-amber-400 font-bold text-sm">{selectedClip.score}/10</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Duration</span>
                <span className="text-white/80">{Math.round(selectedClip.duration)}s</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Timestamp</span>
                <span className="text-white/80">{selectedClip.start.toFixed(0)}s – {selectedClip.end.toFixed(0)}s</span>
              </div>
            </div>

            {selectedClip.hook && (
              <div>
                <h3 className="text-xs text-white/40 uppercase tracking-wider mb-2">Hook</h3>
                <p className="text-sm text-white/70 italic leading-relaxed">"{selectedClip.hook}"</p>
              </div>
            )}

            {selectedClip.reason && (
              <div>
                <h3 className="text-xs text-white/40 uppercase tracking-wider mb-2">Why it works</h3>
                <p className="text-sm text-white/60 leading-relaxed">{selectedClip.reason}</p>
              </div>
            )}

            <div className="pt-2">
              <Link
                href={`/compare/${jobId}/${selectedClip.id}`}
                className="block w-full text-center py-2.5 bg-white/10 hover:bg-white/15 text-white/80 text-sm font-medium rounded-xl transition-colors"
              >
                Before / After View
              </Link>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
