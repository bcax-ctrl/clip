import { bin, run, probeDuration } from "./run";
import { jobDir, jobFile, FILES } from "./paths";

/** Basic sanity check for a YouTube-ish URL. */
export function isLikelyVideoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Download a video to /jobs/<id>/source.mp4 using yt-dlp.
 * Forces an mp4 (h264/aac) muxed output for downstream ffmpeg/whisper.
 */
export async function downloadYoutube(
  jobId: string,
  url: string
): Promise<number> {
  const dir = jobDir(jobId);
  const args = [
    "-f",
    "bv*[ext=mp4][height<=1080]+ba[ext=m4a]/b[ext=mp4]/b",
    "--merge-output-format",
    "mp4",
    "--no-playlist",
    "-o",
    FILES.source,
    url,
  ];
  const res = await run(bin("yt-dlp"), args, { cwd: dir });
  if (res.code !== 0) {
    throw new Error(`yt-dlp exit ${res.code}. ${res.stderr.slice(-500)}`);
  }
  return probeDuration(jobFile(jobId, FILES.source));
}
