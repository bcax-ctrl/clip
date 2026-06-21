import fs from "node:fs";
import path from "node:path";
import { RenderOptions, RenderProgress } from "./types";
import { bin, run, probeDuration } from "./run";
import { jobDir, jobFile, FILES, FONTS_DIR, MUSIC_DIR } from "./paths";

const OUT_W = 1080;
const OUT_H = 1920;

/** Make a path usable inside an ffmpeg filtergraph regardless of OS. */
function filterPath(abs: string, cwd: string): string {
  const rel = path.relative(cwd, abs).split(path.sep).join("/");
  return rel;
}

interface BuiltCommand {
  args: string[];
  totalDuration: number;
}

/** Build the full ffmpeg argument list for a job's final render. */
export async function buildRenderArgs(
  jobId: string,
  opts: RenderOptions
): Promise<BuiltCommand> {
  const dir = jobDir(jobId);
  const source = jobFile(jobId, FILES.source);

  const srcDuration = await probeDuration(source);
  const trim = opts.trim;
  const totalDuration =
    trim && trim.end > trim.start
      ? trim.end - trim.start
      : srcDuration || 0;

  const args: string[] = ["-y"];

  // ---- input 0: source (with optional trim) ----
  if (trim && trim.end > trim.start) {
    args.push("-ss", String(trim.start), "-to", String(trim.end));
  }
  args.push("-i", FILES.source);

  // ---- input 1: music (looped) ----
  const hasMusic =
    !!opts.music && !!opts.music.file && opts.music.category !== undefined;
  let musicAbs = "";
  if (hasMusic && opts.music) {
    musicAbs = path.join(MUSIC_DIR, opts.music.category, opts.music.file);
    if (fs.existsSync(musicAbs)) {
      args.push("-stream_loop", "-1", "-i", filterPath(musicAbs, dir));
    }
  }
  const musicReady = hasMusic && musicAbs && fs.existsSync(musicAbs);

  // ---- video filter chain ----
  const frac = (opts.crop.offsetX + 1) / 2; // 0..1
  const vparts: string[] = [
    `scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=increase`,
    `crop=${OUT_W}:${OUT_H}:x='(in_w-${OUT_W})*${frac.toFixed(4)}':y=(in_h-${OUT_H})/2`,
    "setsar=1",
  ];

  if (opts.subtitleStyle && opts.subtitleStyle !== "none") {
    const fontsRel = filterPath(FONTS_DIR, dir);
    vparts.push(`subtitles=${FILES.subtitle}:fontsdir=${fontsRel}`);
  }

  const hookText = opts.hook?.text?.trim();
  if (hookText) {
    fs.writeFileSync(jobFile(jobId, "hook.txt"), hookText, "utf8");
    const dur = Math.max(0.5, opts.hook.durationSec || 3);
    const fontFile = pickFontFile();
    const fontArg = fontFile
      ? `fontfile=${filterPath(fontFile, dir)}:`
      : "font=Sans:";
    vparts.push(
      `drawtext=textfile=hook.txt:${fontArg}fontcolor=white:fontsize=84:` +
        `box=1:boxcolor=black@0.55:boxborderw=26:line_spacing=14:` +
        `x=(w-text_w)/2:y=h*0.16:` +
        `enable='lt(t,${dur})':alpha='if(lt(t,0.4),t/0.4,1)'`
    );
  }

  const filters: string[] = [`[0:v]${vparts.join(",")}[vout]`];

  // ---- audio filter graph ----
  let audioMap = "0:a?";
  if (musicReady && opts.music) {
    const vol = Math.min(Math.max(opts.music.volume, 0), 1);
    if (opts.music.duck) {
      // Duck music under speech via sidechaincompress keyed by the voice.
      filters.push(
        `[0:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[sc][spo]`,
        `[1:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=${vol.toFixed(2)}[mus]`,
        `[mus][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350:makeup=1[duck]`,
        `[duck][spo]amix=inputs=2:duration=shortest:dropout_transition=0:normalize=0[aout]`
      );
    } else {
      filters.push(
        `[1:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=${vol.toFixed(2)}[mus]`,
        `[0:a][mus]amix=inputs=2:duration=shortest:dropout_transition=0:normalize=0[aout]`
      );
    }
    audioMap = "[aout]";
  }

  args.push("-filter_complex", filters.join(";"));
  args.push("-map", "[vout]");
  args.push("-map", audioMap);

  // ---- encode + output ----
  args.push(
    "-r",
    "30",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    "-shortest",
    "-progress",
    "pipe:1",
    "-nostats",
    FILES.output
  );

  return { args, totalDuration };
}

/** Find a usable font file in /public/fonts for drawtext (best effort). */
function pickFontFile(): string | null {
  try {
    const preferred = ["Montserrat", "Poppins"];
    const files = fs.existsSync(FONTS_DIR) ? fs.readdirSync(FONTS_DIR) : [];
    const fonts = files.filter((f) => /\.(ttf|otf)$/i.test(f));
    if (!fonts.length) return null;
    for (const p of preferred) {
      const hit = fonts.find((f) => f.toLowerCase().includes(p.toLowerCase()));
      if (hit) return path.join(FONTS_DIR, hit);
    }
    return path.join(FONTS_DIR, fonts[0]);
  } catch {
    return null;
  }
}

function writeProgress(jobId: string, p: RenderProgress): void {
  try {
    fs.writeFileSync(jobFile(jobId, FILES.progress), JSON.stringify(p), "utf8");
  } catch {
    /* ignore */
  }
}

export function readProgress(jobId: string): RenderProgress | null {
  try {
    return JSON.parse(
      fs.readFileSync(jobFile(jobId, FILES.progress), "utf8")
    ) as RenderProgress;
  } catch {
    return null;
  }
}

/** Parse ffmpeg `-progress` key=value stream and emit progress updates. */
function makeProgressParser(
  total: number,
  onUpdate: (p: RenderProgress) => void
) {
  let buf = "";
  let outTimeSec = 0;
  let speed: string | undefined;
  return (chunk: string) => {
    buf += chunk;
    let idx: number;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq);
      const val = line.slice(eq + 1);
      if (key === "out_time_us" || key === "out_time_ms") {
        const us = parseInt(val, 10);
        if (Number.isFinite(us)) {
          // out_time_ms in ffmpeg is actually microseconds historically;
          // out_time_us is unambiguous. Both treated as microseconds here.
          outTimeSec = us / 1_000_000;
        }
      } else if (key === "speed") {
        speed = val.trim();
      } else if (key === "progress") {
        const percent =
          total > 0 ? Math.min(100, (outTimeSec / total) * 100) : 0;
        onUpdate({
          percent: Math.round(percent),
          outTimeSec,
          speed,
          done: val.trim() === "end",
        });
      }
    }
  };
}

/**
 * Run the final render. Streams progress to progress.json so the SSE/polling
 * endpoint can relay it to the browser. Resolves to the output path on success.
 */
export async function renderJob(
  jobId: string,
  opts: RenderOptions,
  onProgress?: (p: RenderProgress) => void
): Promise<string> {
  const dir = jobDir(jobId);
  const { args, totalDuration } = await buildRenderArgs(jobId, opts);

  writeProgress(jobId, { percent: 0, outTimeSec: 0, done: false });

  const logStream = fs.createWriteStream(jobFile(jobId, FILES.renderLog), {
    flags: "w",
  });
  logStream.write(`ffmpeg ${args.join(" ")}\n\n`);

  const parse = makeProgressParser(totalDuration, (p) => {
    writeProgress(jobId, p);
    onProgress?.(p);
  });

  const res = await run(bin("ffmpeg"), args, {
    cwd: dir,
    onStdout: parse,
    onStderr: (s) => logStream.write(s),
  });
  logStream.end();

  if (res.code !== 0) {
    const err: RenderProgress = {
      percent: 0,
      outTimeSec: 0,
      done: true,
      error: `ffmpeg exit ${res.code}. Lihat render.log untuk detail.`,
    };
    writeProgress(jobId, err);
    throw new Error(err.error);
  }

  writeProgress(jobId, {
    percent: 100,
    outTimeSec: totalDuration,
    done: true,
  });
  return jobFile(jobId, FILES.output);
}
