from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel, Field
import httpx

from app.auth.dependencies import get_current_user
from app.services.chat_asistente import chat_responder
from app.config import settings

router = APIRouter(prefix='/chat', tags=['chat'])

GROQ_WHISPER_URL   = 'https://api.groq.com/openai/v1/audio/transcriptions'
GROQ_WHISPER_MODEL = 'whisper-large-v3-turbo'   # rápido + multilenguaje


# ─── Chat texto ──────────────────────────────────────────────────────────────

class ChatMensaje(BaseModel):
    mensaje: str = Field(..., min_length=1, max_length=2000)
    historial: list[dict] | None = Field(default=None, max_length=20)
    contexto_paciente: dict | None = None


class ChatRespuesta(BaseModel):
    respuesta: str
    fuente: str  # 'ia' | 'fallback'


@router.post('', response_model=ChatRespuesta)
async def enviar_mensaje(
    body: ChatMensaje,
    _user: dict = Depends(get_current_user),
):
    """Envía un mensaje al asistente clínico de nutrición infantil."""
    resultado = await chat_responder(
        mensaje=body.mensaje,
        historial=body.historial,
        contexto_paciente=body.contexto_paciente,
    )
    return resultado


# ─── Transcripción de audio (Groq Whisper) ───────────────────────────────────

class TranscripcionRespuesta(BaseModel):
    texto: str


@router.post('/transcribir', response_model=TranscripcionRespuesta)
async def transcribir_audio(
    audio: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """
    Recibe un archivo de audio (webm / mp3 / wav) y retorna
    la transcripción usando Groq Whisper.
    """
    if not settings.groq_api_key:
        raise HTTPException(status_code=400, detail='Transcripción no configurada.')

    contenido = await audio.read()
    if len(contenido) > 25 * 1024 * 1024:          # límite Groq: 25 MB
        raise HTTPException(status_code=413, detail='El audio supera el límite de 25 MB.')
    if len(contenido) < 1000:                       # clip demasiado corto
        raise HTTPException(status_code=422, detail='El audio es demasiado corto.')

    nombre   = audio.filename or 'audio.webm'
    mimetype = audio.content_type or 'audio/webm'

    try:
        async with httpx.AsyncClient(timeout=40.0) as client:
            resp = await client.post(
                GROQ_WHISPER_URL,
                headers={'Authorization': f'Bearer {settings.groq_api_key}'},
                files={'file': (nombre, contenido, mimetype)},
                data={
                    'model':           GROQ_WHISPER_MODEL,
                    'language':        'es',
                    'response_format': 'text',
                },
            )

        if resp.status_code != 200:
            print(f'[WHISPER] Error {resp.status_code}: {resp.text[:200]}', flush=True)
            raise HTTPException(status_code=502, detail='Error en el servicio de transcripción.')

        return {'texto': resp.text.strip()}

    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail='Tiempo de espera agotado.')
    except Exception as e:
        print(f'[WHISPER] Error inesperado: {e}', flush=True)
        raise HTTPException(status_code=500, detail='Error inesperado en la transcripción.')
