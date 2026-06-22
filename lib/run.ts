import { spawn, SpawnOptions } from "node:child_process";

export interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

/**
 * Spawn a process and resolve when it exits. Captures stdout/stderr.
 * `onStderr` lets callers stream progress (ffmpeg writes progress to stderr).
 */
export function run(
  cmd: string,
  args: string[],
  opts: SpawnOptions & {
    onStdout?: (chunk: string) => void;
    onStderr?: (chunk: string) => void;
  } = {}
): Promise<RunResult> {
  const { onStdout, onStderr, ...spawnOpts } = opts;
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { ...spawnOpts });
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (d) => {
      const s = d.toString();
      stdout += s;
      onStdout?.(s);
    });
    child.stderr?.on("data", (d) => {
      const s = d.toString();
      stderr += s;
      onStderr?.(s);
    });
    child.on("error", (err) => {
      // ENOENT => binary not installed.
      reject(
        new Error(
          `Gagal menjalankan "${cmd}". Pastikan terinstall & ada di PATH. (${err.message})`
        )
      );
    });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

/** Resolve a binary name, honoring optional env overrides. */
export function bin(name: "ffmpeg" | "ffprobe" | "whisper" | "yt-dlp"): string {
  const envKey =
    name === "yt-dlp" ? "YTDLP_PATH" : `${name.toUpperCase()}_PATH`;
  return process.env[envKey] || name;
}

/** Probe media duration (seconds) via ffprobe. Returns 0 on failure. */
export async function probeDuration(file: string): Promise<number> {
  try {
    const res = await run(bin("ffprobe"), [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      file,
    ]);
    const d = parseFloat(res.stdout.trim());
    return Number.isFinite(d) ? d : 0;
  } catch {
    return 0;
  }
}
