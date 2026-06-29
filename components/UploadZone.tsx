'use client'

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function UploadZone() {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const maxMB = 2000

  function validateFile(f: File): string {
    const allowed = ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/avi', 'video/webm']
    if (!allowed.includes(f.type) && !f.name.match(/\.(mp4|mov|mkv|avi|webm)$/i)) {
      return 'Please upload a video file (MP4, MOV, MKV, AVI, or WEBM)'
    }
    if (f.size > maxMB * 1024 * 1024) {
      return `File too large. Maximum size is ${maxMB}MB`
    }
    return ''
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) selectFile(dropped)
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) selectFile(selected)
  }

  function selectFile(f: File) {
    const err = validateFile(f)
    if (err) { setError(err); return }
    setError('')
    setFile(f)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError('')

    try {
      const fd = new FormData()
      fd.append('video', file)

      const res = await fetch('/api/jobs', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Upload failed')

      router.push(`/jobs/${data.jobId}`)
    } catch (err: unknown) {
      const error = err as Error
      setError(error.message)
      setUploading(false)
    }
  }

  function formatSize(bytes: number): string {
    if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    return `${(bytes / 1024).toFixed(0)} KB`
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-amber-400 bg-amber-400/5'
            : file
            ? 'border-green-500/50 bg-green-500/5'
            : 'border-white/20 bg-[#141414] hover:border-amber-400/50 hover:bg-amber-400/5'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*,.mp4,.mov,.mkv,.avi,.webm"
          className="hidden"
          onChange={handleFileChange}
        />

        {!file ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <svg className="w-16 h-16 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-semibold text-white/80">Drop your video here</p>
              <p className="text-sm text-white/40 mt-1">or click to browse</p>
            </div>
            <p className="text-xs text-white/30">MP4, MOV, MKV, AVI, WEBM · Up to {maxMB/1000}GB</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-center">
              <svg className="w-12 h-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-white">{file.name}</p>
              <p className="text-sm text-white/50">{formatSize(file.size)}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null) }}
              className="text-xs text-white/40 hover:text-white/60 underline"
            >
              Remove file
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {file && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="mt-6 w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 disabled:cursor-not-allowed text-black font-bold text-lg rounded-xl transition-colors"
        >
          {uploading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Uploading...
            </span>
          ) : (
            'Generate Clips'
          )}
        </button>
      )}
    </div>
  )
}
