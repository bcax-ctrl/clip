# ClipMine ⛏

An AI video clipper web app — similar to Opus Clip. Drop in a long-form video
and ClipMine will:

1. **Transcribe** it with OpenAI Whisper
2. **Analyze** the transcript with Claude to find the most viral / engaging moments
3. **Clip** each moment into a vertical 9:16 short with TikTok-style burned-in subtitles
4. Let you compare **Before / After** with an 11-layer FFmpeg processing stack

Built with Next.js 14 (App Router), Tailwind CSS, FFmpeg, and the Anthropic API.

## Features

- 🎬 Drag-and-drop upload (MP4 / MOV / MKV up to 2 GB) or paste a local file path
- 📝 Whisper transcription with timestamped segments
- 🤖 Claude-powered viral moment detection (5–8 clips), with equal-chunk fallback
- ✂️ FFmpeg clip generation: 9:16 reframe, color grade, vignette, grain, burned subtitles
- 🖥️ Opus-Clip-style results workspace: clip sidebar, vertical player, DOM subtitle preview
- 🎨 Two caption styles (yellow / red-white CapCut style), toggleable
- 🔀 Before/After viewer with **Split** and **Swipe** modes and an 11-layer selector

## Tech Stack

| Layer            | Tool                                   |
| ---------------- | -------------------------------------- |
| Frontend         | Next.js 14 (App Router) + Tailwind CSS |
| Backend          | Next.js API Routes                     |
| Transcription    | OpenAI Whisper (local CLI)             |
| Clip detection   | Anthropic Claude (`@anthropic-ai/sdk`) |
| Video processing | FFmpeg (`fluent-ffmpeg`)               |
| Queue            | In-memory job queue + status polling   |

## Getting Started

1. **Clone and install:**

   ```bash
   npm install
   ```

2. **Install FFmpeg:**

   ```bash
   brew install ffmpeg        # macOS
   sudo apt install ffmpeg    # Linux
   ```

3. **Install Whisper:**

   ```bash
   pip install openai-whisper
   ```

4. **Configure environment:**

   ```bash
   cp .env.local.example .env.local
   # then add your ANTHROPIC_API_KEY
   ```

5. **Run:**

   ```bash
   npm run dev
   ```

6. Open <http://localhost:3000>

## Environment Variables

| Variable            | Default           | Description                             |
| ------------------- | ----------------- | --------------------------------------- |
| `ANTHROPIC_API_KEY` | —                 | Required for AI clip detection          |
| `ANTHROPIC_MODEL`   | `claude-opus-4-8` | Claude model used for detection         |
| `WHISPER_MODEL`     | `base`            | `tiny` \| `base` \| `small` \| `medium` |
| `UPLOAD_DIR`        | `/tmp/clipmine`   | Root dir for uploads/transcripts/clips  |
| `MAX_FILE_SIZE_MB`  | `2000`            | Client-side upload guard                |

> If `ANTHROPIC_API_KEY` is missing or the API call fails, ClipMine falls back
> to splitting the video into equal ~60-second clips so the pipeline still works.

## How It Works

```
POST /api/jobs                     → create job, save upload, start pipeline
GET  /api/jobs/[jobId]             → poll { status, progress, clips[] }
GET  /api/clips/[jobId]/[clipId]   → stream a clip (?layer=, ?thumb=1, ?download=1)
GET  /api/clips/[jobId]/[clipId]/layers?generate=1
                                   → lazily render + list the 11-layer stack
```

### Pipeline

```
queued → transcribing → analyzing → clipping → done
```

- **Transcribe** — `whisper input.mp4 --model base --output_format json`
- **Analyze** — full transcript → Claude → JSON array of `{ title, start, end, hook, score, reason }`
- **Clip** — per clip: thumbnail + final V11 export (9:16, graded, captioned)

### 11-Layer Stack (Before/After)

Mirrors a Premiere Pro timeline, generated on demand for the compare view:

```
V1  Raw cut            V7  + Film dust
V2  Base 9:16 footage  V8  + Cinematic grain
V4  + Bottom vignette  V9  + Color grade 1
V5  + Full vignette    V10 + Color grade 2 (cinematic)
V6  + Light leak       V11 Final (+ burned subtitles)
```

## Project Structure

```
app/
  page.tsx                              # Upload page
  jobs/[jobId]/page.tsx                 # Results workspace
  compare/[jobId]/[clipId]/page.tsx     # Before/After viewer
  api/jobs/route.ts                     # POST create / GET list
  api/jobs/[jobId]/route.ts             # GET status
  api/clips/[jobId]/[clipId]/route.ts   # GET stream clip
  api/clips/[jobId]/[clipId]/layers/route.ts  # GET layer stack
lib/
  types.ts  jobQueue.ts  whisper.ts  claude.ts  ffmpeg.ts  ffmpegLayers.ts  processor.ts
components/
  UploadZone  ClipSidebar  VideoPlayer  SubtitleOverlay  StatusProgress  BeforeAfterPlayer
```

## Error Handling

- **Whisper missing** → "Install Whisper: `pip install openai-whisper`"
- **FFmpeg missing** → "Install FFmpeg: `brew install ffmpeg`"
- **Claude fails** → fallback to equal 60-second chunks
- **File too large** → client-side validation before upload

## Notes

- This is an MVP: the job queue is in-memory, so restarting the dev server
  clears job state (generated files on disk remain under `UPLOAD_DIR`).
- Whisper and FFmpeg run as local subprocesses; make sure both are on your `PATH`.