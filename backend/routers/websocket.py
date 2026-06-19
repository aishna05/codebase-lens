"""
Live transcription WebSocket endpoint.
Client sends raw audio chunks (binary frames); server streams partial transcripts back.
Protocol:
  Client → Server : binary audio frames (PCM/webm chunks)
  Server → Client : JSON {"type": "transcript", "text": "...", "is_final": bool, "timestamp": float}
  Server → Client : JSON {"type": "error", "message": "..."}
  Server → Client : JSON {"type": "status", "message": "..."}
"""
import json
import asyncio
import io
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from openai import AsyncOpenAI

from ..config import get_settings
from ..services.auth_service import decode_token

router = APIRouter(tags=["websocket"])
settings = get_settings()
openai_client = AsyncOpenAI(api_key=settings.openai_api_key)

CHUNK_DURATION_SECONDS = 5  # buffer audio for N seconds before sending to Whisper
SAMPLE_RATE = 16000
BYTES_PER_SAMPLE = 2  # 16-bit PCM
BUFFER_SIZE = CHUNK_DURATION_SECONDS * SAMPLE_RATE * BYTES_PER_SAMPLE


@router.websocket("/ws/transcribe/{meeting_id}")
async def live_transcribe(
    websocket: WebSocket,
    meeting_id: int,
    token: str = Query(...),
):
    # Authenticate via query param token (WebSocket can't send headers easily)
    try:
        user_id = decode_token(token)
    except Exception:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await websocket.accept()
    await _send_json(websocket, {"type": "status", "message": "Connected. Send audio chunks."})

    audio_buffer = bytearray()
    elapsed = 0.0

    try:
        while True:
            data = await websocket.receive_bytes()
            audio_buffer.extend(data)

            if len(audio_buffer) >= BUFFER_SIZE:
                chunk = bytes(audio_buffer)
                audio_buffer.clear()

                try:
                    result = await _transcribe_chunk(chunk, elapsed)
                    elapsed += CHUNK_DURATION_SECONDS
                    await _send_json(websocket, {
                        "type": "transcript",
                        "text": result,
                        "is_final": True,
                        "timestamp": elapsed,
                    })
                except Exception as e:
                    await _send_json(websocket, {"type": "error", "message": str(e)})

    except WebSocketDisconnect:
        pass


async def _transcribe_chunk(audio_bytes: bytes, offset_seconds: float) -> str:
    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = "chunk.webm"

    response = await openai_client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
        response_format="text",
    )
    return response.strip()


async def _send_json(ws: WebSocket, data: dict):
    await ws.send_text(json.dumps(data))
