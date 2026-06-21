import fs from "node:fs";
import path from "node:path";
import { bin, run } from "./run";
import { jobDir, jobFile, FILES } from "./paths";
import { parseWhisperFile } from "./whisper";
import { Transcript } from "./types";

export type WhisperModel = "tiny" | "base" | "small" | "medium";

/**
 * Run whisper on the job's source video to produce word-level timestamps,
 * then normalize the JSON into our Transcript shape.
 *
 * Equivalent CLI:
 *   whisper source.mp4 --model base --word_timestamps True \
 *           --output_format json --output_dir .
 */
export async function transcribeJob(
  jobId: string,
  model: WhisperModel = "base",
  language?: string
): Promise<Transcript> {
  const dir = jobDir(jobId);
  const args = [
    FILES.source,
    "--model",
    model,
    "--word_timestamps",
    "True",
    "--output_format",
    "json",
    "--output_dir",
    ".",
  ];
  if (language) args.push("--language", language);

  const res = await run(bin("whisper"), args, { cwd: dir });
  if (res.code !== 0) {
    throw new Error(
      `whisper exit ${res.code}. ${res.stderr.slice(-500)}`
    );
  }

  // whisper writes <basename>.json (source.json) into output_dir.
  const produced = path.join(dir, "source.json");
  if (!fs.existsSync(produced)) {
    throw new Error("whisper selesai tapi file JSON tidak ditemukan.");
  }
  // Keep a copy of the raw output, then write our normalized transcript.
  fs.copyFileSync(produced, jobFile(jobId, FILES.transcriptRaw));
  const transcript = parseWhisperFile(produced);
  fs.writeFileSync(
    jobFile(jobId, FILES.transcript),
    JSON.stringify(transcript, null, 2),
    "utf8"
  );
  return transcript;
}

export function readTranscript(jobId: string): Transcript | null {
  try {
    return JSON.parse(
      fs.readFileSync(jobFile(jobId, FILES.transcript), "utf8")
    ) as Transcript;
  } catch {
    return null;
  }
}
