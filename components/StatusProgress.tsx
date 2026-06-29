'use client'

import { JobStatus } from '@/lib/types'

const STEPS: { key: JobStatus; label: string }[] = [
  { key: 'queued', label: 'Queued' },
  { key: 'transcribing', label: 'Transcribing' },
  { key: 'analyzing', label: 'Analyzing' },
  { key: 'clipping', label: 'Clipping' },
  { key: 'done', label: 'Done' },
]

const ORDER: JobStatus[] = ['queued', 'transcribing', 'analyzing', 'clipping', 'done']

interface Props {
  status: JobStatus
  progress: number
  progressStep: string
  error?: string
}

export default function StatusProgress({ status, progress, progressStep, error }: Props) {
  const currentIdx = ORDER.indexOf(status)

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => {
          const stepIdx = ORDER.indexOf(step.key)
          const isComplete = stepIdx < currentIdx || status === 'done'
          const isCurrent = step.key === status
          const isPending = stepIdx > currentIdx

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isComplete ? 'bg-amber-500 text-black' :
                  isCurrent ? 'bg-amber-500/30 border-2 border-amber-500 text-amber-400' :
                  'bg-white/10 text-white/30'
                }`}>
                  {isComplete ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span className={`text-xs whitespace-nowrap ${
                  isComplete || isCurrent ? 'text-white/70' : 'text-white/30'
                }`}>{step.label}</span>
              </div>

              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-4 transition-all ${
                  stepIdx < currentIdx ? 'bg-amber-500' : 'bg-white/10'
                }`} />
              )}
            </div>
          )
        })}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className={`font-medium ${error ? 'text-red-400' : 'text-amber-400'}`}>
            {error ? 'Error' : progressStep}
          </span>
          <span className="text-white/40">{progress}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${error ? 'bg-red-500' : 'bg-amber-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}
