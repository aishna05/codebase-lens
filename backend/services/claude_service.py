import json
import anthropic
from ..config import get_settings
from ..models.report import ItemType, Severity

settings = get_settings()
claude = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

SYSTEM_PROMPT = """You are Meeting Ghost — a ruthlessly honest, private coaching AI.

You receive a meeting transcript (with speaker turns and timestamps) and ONE participant's private brief containing their goals, relationships, and context. Nobody else sees this brief.

Your job: Generate a personalized Ghost Report identifying moments this person could have done better.

Identify these types of moments:
- MISSED_DEFENSE: Someone challenged, dismissed, or contradicted them — and they had data/arguments to push back but didn't
- UNCLAIMED_IDEA: They proposed an idea (in the meeting or prior context) that someone else restated and received credit for — they said nothing
- MISSED_OPPORTUNITY: A pivotal moment where they could have shaped the outcome, asked a key question, or closed a decision — but let it pass
- POWER_DYNAMIC: Patterns of being talked over, cut off, ignored, or deferring inappropriately to authority
- POSITIVE_MOMENT: Something they did well (max 1-2 per report — be selective, not encouraging)

Rules:
- Be specific and direct. Reference exact quotes from the transcript.
- Every finding needs a timestamp.
- Every finding needs a concrete "what you could have said" rewrite.
- Severity: RED = significant impact on outcomes or reputation. YELLOW = worth correcting. GREEN = minor polish.
- Do not fabricate events not in the transcript.
- Do not be vague. "You could have spoken up more" is useless. Quote the moment.

Return a JSON object with this exact schema:
{
  "summary": "2-3 sentence overall assessment of their performance",
  "items": [
    {
      "item_type": "missed_defense|unclaimed_idea|missed_opportunity|power_dynamic|positive_moment",
      "severity": "red|yellow|green",
      "timestamp_seconds": 554.0,
      "timestamp_label": "9:14",
      "title": "Short title (< 8 words)",
      "description": "What happened. Be specific. Quote the transcript.",
      "suggested_response": "The exact words they could have said.",
      "context_quote": "The quote from the transcript that triggered this finding"
    }
  ]
}"""


async def generate_ghost_report(
    transcript_turns: list[dict],
    brief: dict,
    participant_name: str,
) -> dict:
    """
    Call Claude to generate a Ghost Report.
    transcript_turns: [{speaker_name, start_time, content}, ...]
    brief: {role, goals, relationships, stakes, ammunition, ideas}
    """
    # Format transcript for Claude
    transcript_text = "\n".join(
        f"[{_format_ts(t['start_time'])}] {t['speaker_name'] or t['speaker_label']}: {t['content']}"
        for t in transcript_turns
    )

    brief_text = f"""PARTICIPANT: {participant_name}
ROLE IN THIS MEETING: {brief.get('role', 'Not specified')}
GOALS: {brief.get('goals', 'Not specified')}
RELATIONSHIPS WITH ATTENDEES: {brief.get('relationships') or 'Not specified'}
WHAT IS AT STAKE: {brief.get('stakes') or 'Not specified'}
DATA/ARGUMENTS THEY HAD AVAILABLE: {brief.get('ammunition') or 'Not specified'}
IDEAS THEY WANTED TO PROPOSE: {brief.get('ideas') or 'Not specified'}"""

    user_message = f"""PRIVATE BRIEF (only visible to {participant_name}):
{brief_text}

---

MEETING TRANSCRIPT:
{transcript_text}

---

Generate the Ghost Report for {participant_name}. Return only valid JSON."""

    response = await claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    raw = response.content[0].text.strip()

    # Extract JSON from markdown code blocks if needed
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    return json.loads(raw)


def _format_ts(seconds: float) -> str:
    s = int(seconds)
    m, sec = divmod(s, 60)
    h, m = divmod(m, 60)
    if h:
        return f"{h}:{m:02d}:{sec:02d}"
    return f"{m}:{sec:02d}"
