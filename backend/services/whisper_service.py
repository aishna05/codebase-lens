import re
from openai import AsyncOpenAI
from ..config import get_settings

settings = get_settings()
client = AsyncOpenAI(api_key=settings.openai_api_key)


async def transcribe_audio(file_bytes: bytes, filename: str) -> dict:
    """Send audio bytes to Whisper API, return transcript with word-level timestamps."""
    import io
    audio_file = io.BytesIO(file_bytes)
    audio_file.name = filename

    response = await client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
        response_format="verbose_json",
        timestamp_granularities=["segment"],
    )

    segments = []
    for seg in response.segments:
        segments.append({
            "start": seg.start,
            "end": seg.end,
            "text": seg.text.strip(),
        })

    return {
        "text": response.text,
        "duration": response.duration,
        "segments": segments,
    }


def parse_pasted_transcript(text: str) -> list[dict]:
    """
    Parse a pasted transcript into speaker turns.
    Supports common formats:
      [00:01:23] Speaker Name: text
      Speaker Name (00:01:23): text
      SPEAKER_00 [0:01]: text
    Returns list of {speaker_label, start_time, content}
    """
    turns = []

    # Pattern 1: [HH:MM:SS] Name: text  or  [MM:SS] Name: text
    pattern1 = re.compile(
        r'\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([^:]+?):\s*(.+)', re.MULTILINE
    )
    # Pattern 2: Name [HH:MM:SS]: text  or  Name (HH:MM:SS): text
    pattern2 = re.compile(
        r'^([^:\[\(]+?)\s*[\[\(](\d{1,2}:\d{2}(?::\d{2})?)[\]\)]\s*:\s*(.+)',
        re.MULTILINE,
    )
    # Pattern 3: SPEAKER_XX: text (no timestamp)
    pattern3 = re.compile(r'^(SPEAKER_\d+|[A-Z][^:\n]{1,40}):\s*(.+)', re.MULTILINE)

    def ts_to_seconds(ts: str) -> float:
        parts = ts.split(":")
        parts = [float(p) for p in parts]
        if len(parts) == 3:
            return parts[0] * 3600 + parts[1] * 60 + parts[2]
        return parts[0] * 60 + parts[1]

    matches1 = list(pattern1.finditer(text))
    matches2 = list(pattern2.finditer(text))

    if matches1:
        for m in matches1:
            turns.append({
                "speaker_label": m.group(2).strip(),
                "start_time": ts_to_seconds(m.group(1)),
                "content": m.group(3).strip(),
            })
    elif matches2:
        for m in matches2:
            turns.append({
                "speaker_label": m.group(1).strip(),
                "start_time": ts_to_seconds(m.group(2)),
                "content": m.group(3).strip(),
            })
    else:
        # Fallback: parse speaker blocks with no timestamps, assign sequential offsets
        offset = 0.0
        for m in pattern3.finditer(text):
            turns.append({
                "speaker_label": m.group(1).strip(),
                "start_time": offset,
                "content": m.group(2).strip(),
            })
            offset += 30.0  # approximate 30s per turn

    return turns
