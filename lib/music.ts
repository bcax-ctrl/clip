import fs from "node:fs";
import path from "node:path";
import { MUSIC_DIR } from "./paths";
import { MusicCategory } from "./types";

export const MUSIC_CATEGORIES: MusicCategory[] = [
  "energetic",
  "chill",
  "dramatic",
  "funny",
];

const AUDIO_RE = /\.(mp3|m4a|wav|ogg)$/i;

export interface MusicTrack {
  category: MusicCategory;
  file: string;
  /** public URL to stream/preview. */
  url: string;
}

export interface MusicLibrary {
  [category: string]: MusicTrack[];
}

/** Scan /public/music/<category> for user-supplied royalty-free tracks. */
export function listMusic(): MusicLibrary {
  const lib: MusicLibrary = {};
  for (const cat of MUSIC_CATEGORIES) {
    lib[cat] = [];
    const dir = path.join(MUSIC_DIR, cat);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!AUDIO_RE.test(file)) continue;
      lib[cat].push({
        category: cat,
        file,
        url: `/music/${cat}/${encodeURIComponent(file)}`,
      });
    }
  }
  return lib;
}
