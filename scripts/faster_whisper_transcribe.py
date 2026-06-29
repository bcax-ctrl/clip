#!/usr/bin/env python3
"""
Transcribe a media file with faster-whisper (CTranslate2 backend) and write
the segments as JSON to stdout in ClipMine's format: [{start, end, text}, ...].

Usage:
  python faster_whisper_transcribe.py <input_path> [model] [language]

Env / args:
  model     Whisper model size (tiny|base|small|medium|large-v3). Default: tiny
  language  Force language code (e.g. en, id) to skip auto-detection. Optional.

faster-whisper is typically 4x faster than openai-whisper on CPU and uses
int8 quantization by default here for maximum speed.
"""
import sys
import json


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "missing input path"}), file=sys.stderr)
        return 2

    input_path = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] else "tiny"
    language = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] else None

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print(
            json.dumps({"error": "faster-whisper not installed. Run: pip install faster-whisper"}),
            file=sys.stderr,
        )
        return 3

    # int8 on CPU is the fastest config; threads default to all cores.
    model = WhisperModel(model_size, device="cpu", compute_type="int8")

    segments, _info = model.transcribe(
        input_path,
        language=language,
        vad_filter=True,  # skip silence -> faster, cleaner segments
        beam_size=1,      # greedy decoding -> faster
    )

    out = [
        {"start": float(s.start), "end": float(s.end), "text": s.text.strip()}
        for s in segments
    ]
    print(json.dumps(out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
