'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Clip, LAYER_LABELS } from '@/lib/types'
import BeforeAfterPlayer from '@/components/BeforeAfterPlayer'
import Link from 'next/link'

export default function ComparePage() {
  const { jobId, clipId } = useParams<{ jobId: string; clipId: string }>()
  const [clip, setClip] = useState<Clip | null>(null)
  const [layers, setLayers] = useState<Record<string, string>>({})
  const [mode, setMode] = useState<'split' | 'swipe'>('split')
  const [selectedLayer, setSelectedLayer] = useState('v11_final')
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [jobRes, layersRes] = await Promise.all([
          fetch(`/api/jobs/${jobId}`),
          fetch(`/api/clips/${jobId}/${clipId}/layers`),
        ])
        if (!jobRes.ok) throw new Error('Job not found')
        const jobData = await jobRes.json()
        const clipData = jobData.clips?.find((c: Clip) => c.id === clipId)
        if (!clipData) throw new Error('Clip not found')
        setClip(clipData)

        if (layersRes.ok) {
          const layerData = await layersRes.json()
          setLayers(layerData)
          if (layerData.v11_final) setSelectedLayer('v11_final')
          else {
            const firstKey = Object.keys(layerData)[0]
            if (firstKey) setSelectedLayer(firstKey)
          }
        }
      } catch (err: unknown) {
        const e = err as Error
        setError(e.message)
      }
    }
    load()
  }, [jobId, clipId])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-red-400">{error}</p>
          <Link href="/" className="text-amber-400 hover:underline text-sm">Home</Link>
        </div>
      </div>
    )
  }

  if (!clip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-white/50">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      </div>
    )
  }

  const rawSrc = `/api/clips/${jobId}/${clipId}?layer=v1_raw`
  const processedSrc = layers[selectedLayer] || `/api/clips/${jobId}/${clipId}?layer=${selectedLayer}`

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A]">
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-[#141414] flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-black">
            Clip<span className="text-amber-400">Mine</span>
          </Link>
          <span className="text-white/30">/</span>
          <Link href={`/jobs/${jobId}`} className="text-sm text-white/50 hover:text-white/80 transition-colors">
            Back to Results
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40">View Mode:</span>
          <div className="flex bg-white/10 rounded-lg p-0.5">
            {(['split', 'swipe'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  mode === m ? 'bg-amber-500 text-black' : 'text-white/60 hover:text-white'
                }`}
              >
                {m === 'split' ? 'Split View' : 'Swipe View'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-6">
        <div className="h-full flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div>
              <h1 className="text-lg font-bold text-white">{clip.title}</h1>
              <p className="text-sm text-white/40 mt-0.5">
                {clip.duration.toFixed(0)}s · Viral Score {clip.score}/10 · {clip.start.toFixed(0)}s–{clip.end.toFixed(0)}s
              </p>
            </div>
          </div>

          <div className="flex-1">
            <BeforeAfterPlayer
              rawSrc={rawSrc}
              processedSrc={processedSrc}
              mode={mode}
              jobId={jobId}
              clipId={clipId}
              availableLayers={layers}
              selectedLayer={selectedLayer}
              onLayerChange={setSelectedLayer}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
