// Whisper CLI wrapper.
//
// Runs the local `whisper` command on a video file and parses the JSON output
// into transcript segments. If Whisper is not installed, a clear, actionable
// error is thrown so the UI can surface install instructions.

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import type { TranscriptSegment } from './types';

export class WhisperNotInstalledError extends Error {
  constructor() {
    super('Install Whisper: pip install openai-whisper');
    this.name = 'WhisperNotInstalledError';
  }
}

async function commandExists(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = spawn(process.platform === 'win32' ? 'where' : 'which', [cmd]);
    probe.on('error', () => resolve(false));
    probe.on('close', (code) => resolve(code === 0));
  });
}

/**
 * Transcribe a video/audio file with Whisper.
 *
 * @param inputPath  Absolute path to the media file.
 * @param outputDir  Directory where transcript.json will be written.
 * @param model      Whisper model name (tiny | base | small | medium).
 * @param onProgress Optional callback receiving raw stderr lines from Whisper.
 */
export async function transcribe(
  inputPath: string,
  outputDir: string,
  model: string = process.env.WHISPER_MODEL || 'base',
  onProgress?: (line: string) => void
): Promise<TranscriptSegment[]> {
  if (!(await commandExists('whisper'))) {
    throw new WhisperNotInstalledError();
  }

  await fs.mkdir(outputDir, { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const args = [
      inputPath,
      '--model',
      model,
      '--output_format',
      'json',
      '--output_dir',
      outputDir,
    ];
    const proc = spawn('whisper', args);

    proc.stderr.on('data', (chunk: Buffer) => {
      const line = chunk.toString();
      onProgress?.(line.trim());
    });
    proc.stdout.on('data', (chunk: Buffer) => {
      onProgress?.(chunk.toString().trim());
    });

    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Whisper exited with code ${code}`));
    });
  });

  return readWhisperOutput(inputPath, outputDir);
}

/** Locate and parse the JSON file Whisper produced. */
export async function readWhisperOutput(
  inputPath: string,
  outputDir: string
): Promise<TranscriptSegment[]> {
  const base = path.basename(inputPath, path.extname(inputPath));
  const jsonPath = path.join(outputDir, `${base}.json`);

  let raw: string;
  try {
    raw = await fs.readFile(jsonPath, 'utf-8');
  } catch {
    // Fall back to the first .json file in the directory.
    const files = await fs.readdir(outputDir);
    const jsonFile = files.find((f) => f.endsWith('.json'));
    if (!jsonFile) {
      throw new Error('Whisper did not produce a transcript JSON file.');
    }
    raw = await fs.readFile(path.join(outputDir, jsonFile), 'utf-8');
  }

  const parsed = JSON.parse(raw) as {
    segments?: Array<{ start: number; end: number; text: string }>;
  };

  const segments: TranscriptSegment[] = (parsed.segments || []).map((s) => ({
    start: Number(s.start) || 0,
    end: Number(s.end) || 0,
    text: (s.text || '').trim(),
  }));

  return segments;
}

/** Persist transcript segments to transcript.json in the given directory. */
export async function saveTranscript(
  outputDir: string,
  segments: TranscriptSegment[]
): Promise<string> {
  await fs.mkdir(outputDir, { recursive: true });
  const outPath = path.join(outputDir, 'transcript.json');
  await fs.writeFile(outPath, JSON.stringify(segments, null, 2), 'utf-8');
  return outPath;
}
