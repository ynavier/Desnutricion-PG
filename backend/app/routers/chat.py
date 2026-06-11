from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel, Field
from datetime import date
import httpx

from app.auth.dependencies import get_current_user
from app.services.chat_asistente import chat_responder, extraer_nombre_paciente
from app.config import settings
from app.database import supabase

router = APIRouter(prefix='/chat', tags=['chat'])

GROQ_WHISPER_URL   = 'https://api.groq.com/openai/v1/audio/transcriptions'
GROQ_WHISPER_MODEL = 'whisper-large-v3-turbo'


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _edad_meses(fecha_nac: str) -> int:
    hoy = date.today()
    fn  = date.fromisoformat(fecha_nac)
    return (hoy.year - fn.year) * 12 + (hoy.month - fn.month)


async def _buscar_pacientes_por_nombre(nombre: str) -> list[dict]:
    """
    Busca pacientes en Supabase por nombre y/o apellidos (ilike).
    Retorna una lista de candidatos con datos básicos y último control.
    """
    partes = nombre.strip().split()
    try:
        # Búsqueda por primer término en nombre
        res = (
            supabase.table('pacientes')
            .select(
                'id, nombre, apellidos, fecha_nac, sexo, municipio_res, '
                'controles(peso_act, talla_act, imc, zscore_pt, clas_nombre, fecha)'
            )
            .ilike('nombre', f'%{partes[0]}%')
            .execute()
        )
        encontrados: list[dict] = list(res.data or [])

        # Si hay más partes, cruzar con apellidos para reducir falsos positivos
        if len(partes) > 1:
            apellido_q = ' '.join(partes[1:])
            res2 = (
                supabase.table('pacientes')
                .select(
                    'id, nombre, apellidos, fecha_nac, sexo, municipio_res, '
                    'controles(peso_act, talla_act, imc, zscore_pt, clas_nombre, fecha)'
                )
                .ilike('apellidos', f'%{apellido_q}%')
                .execute()
            )
            ids_ya = {p['id'] for p in encontrados}
            for p in (res2.data or []):
                if p['id'] not in ids_ya:
                    encontrados.append(p)

        resultado = []
        for p in encontrados:
            controles = sorted(p.pop('controles', []), key=lambda c: c['fecha'], reverse=True)
            ultimo    = controles[0] if controles else None
            em        = _edad_meses(p['fecha_nac'])
            resultado.append({
                'id':                p['id'],
                'nombre':            p['nombre'],
                'apellidos':         p.get('apellidos', ''),
                'edad_meses':        em,
                'sexo':              p.get('sexo'),
                'municipio':         p.get('municipio_res'),
                'estado_nutricional': ultimo.get('clas_nombre') if ultimo else None,
                'peso':              ultimo.get('peso_act')    if ultimo else None,
                'talla':             ultimo.get('talla_act')   if ultimo else None,
                'imc':               ultimo.get('imc')         if ultimo else None,
                'zscore':            ultimo.get('zscore_pt')   if ultimo else None,
            })
        return resultado

    except Exception as e:
        print(f'[CHAT] Error buscando pacientes: {e}', flush=True)
        return []


# ─── Contexto de modelos ML para modo admin ───────────────────────────────────

def _formatear_metricas_modelos() -> str:
    """
    Consulta modelos_ml y retorna un resumen legible para el LLM.
    Incluye métricas de modelo_A (con IMC) y modelo_B (sin IMC) de cada entrenamiento.
    """
    try:
        res = (
            supabase.table('modelos_ml')
            .select('id, nombre, tipo, created_at, version, metricas, activo')
            .order('created_at', desc=True)
            .limit(10)
            .execute()
        )
        modelos = res.data or []
    except Exception as e:
        print(f'[CHAT-ADM] Error consultando modelos: {e}', flush=True)
        return ''

    if not modelos:
        return 'No hay modelos entrenados registrados en el sistema.'

    tipo_labels = {
        'rf': 'Random Forest',
        'gb': 'Gradient Boosting',
        'hgb': 'HistGradientBoosting',
        'lr': 'Logistic Regression',
    }

    def pct(v):
        if v is None:
            return 'N/D'
        return f'{round(float(v) * 100, 1)}%'

    lineas = ['MODELOS ML ENTRENADOS EN EL SISTEMA (del más reciente al más antiguo):']
    for m in modelos:
        met = m.get('metricas') or {}
        nombre = m.get('nombre') or f'Modelo #{m["id"]}'
        tipo = tipo_labels.get(m.get('tipo', ''), m.get('tipo', 'Desconocido'))
        activo = '★ ACTIVO (en producción)' if m.get('activo') else ''
        fecha = (m.get('version') or m.get('created_at') or '')[:16]

        lineas.append(f'\n--- {nombre} ({tipo}) {activo}')
        lineas.append(f'  Fecha: {fecha}')
        lineas.append(f'  Muestras entrenamiento: {met.get("n_muestras", "N/D")} | Test: {met.get("test_size", "N/D")}%')

        for sub_key, sub_label in [('modelo_A', 'Modelo A (con IMC)'), ('modelo_B', 'Modelo B (sin IMC)')]:
            sub = met.get(sub_key) or {}
            if sub:
                lineas.append(f'  {sub_label}:')
                lineas.append(f'    Score Clínico: {pct(sub.get("score_clinico"))}')
                lineas.append(f'    Recall Crítico (clases 1+2): {pct(sub.get("recall_critico"))}')
                lineas.append(f'    Recall Desnut. Severa (clase 1): {pct(sub.get("recall_clase_1"))}')
                lineas.append(f'    Recall Desnut. Moderada (clase 2): {pct(sub.get("recall_clase_2"))}')
                lineas.append(f'    Accuracy: {pct(sub.get("accuracy"))}')
                lineas.append(f'    F1 Macro: {pct(sub.get("f1_macro"))}')
                lineas.append(f'    F1 Weighted: {pct(sub.get("f1_weighted"))}')

    lineas.append('\nCRITERIO DE SELECCIÓN: El mejor modelo es el que tiene mayor Score Clínico. '
                  'Un buen modelo debe tener Score Clínico ≥ 80% y Recall Crítico ≥ 80% para '
                  'garantizar que no se pierden casos de desnutrición severa o moderada.')
    return '\n'.join(lineas)


# ─── Chat texto ───────────────────────────────────────────────────────────────

class ChatMensaje(BaseModel):
    mensaje: str = Field(..., min_length=1, max_length=2000)
    historial: list[dict] | None = Field(default=None, max_length=20)
    contexto_paciente: dict | None = None
    modo: str | None = None  # 'admin' para habilitar contexto de modelos ML
    contexto_sistema: str | None = Field(default=None, max_length=4000)  # contexto adicional (ej. datos del dashboard ANL)


class ChatRespuesta(BaseModel):
    respuesta: str
    fuente: str  # 'ia' | 'fallback'


@router.post('')
async def enviar_mensaje(
    body: ChatMensaje,
    _user: dict = Depends(get_current_user),
):
    """
    Envía un mensaje al asistente clínico NIVI.
    Si no hay contexto_paciente, intenta detectar el nombre del paciente en el mensaje:
      - 0 coincidencias → procede normalmente (sin contexto)
      - 1 coincidencia  → inyecta contexto automáticamente
      - 2+ coincidencias → retorna respuesta de desambiguación con las tarjetas de paciente
    """
    ctx = body.contexto_paciente

    # ── Detección automática de nombre si no hay contexto ─────────────────────
    if ctx is None:
        nombre_detectado = await extraer_nombre_paciente(body.mensaje)
        if nombre_detectado:
            print(f'[CHAT] Nombre detectado: "{nombre_detectado}"', flush=True)
            candidatos = await _buscar_pacientes_por_nombre(nombre_detectado)

            if len(candidatos) == 1:
                # Único match → auto-inyectar contexto
                p   = candidatos[0]
                ctx = {
                    'nombre':            f"{p['nombre']} {p['apellidos']}".strip(),
                    'edad_meses':        p['edad_meses'],
                    'sexo':              p.get('sexo'),
                    'estado_nutricional': p.get('estado_nutricional'),
                    'peso':              p.get('peso'),
                    'talla':             p.get('talla'),
                    'imc':               p.get('imc'),
                    'zscore':            p.get('zscore'),
                }
                print(f'[CHAT] Paciente auto-seleccionado: {ctx["nombre"]}', flush=True)

            elif len(candidatos) > 1:
                # Múltiples coincidencias → desambiguación
                print(f'[CHAT] Desambiguación: {len(candidatos)} candidatos para "{nombre_detectado}"', flush=True)
                return {
                    'tipo':              'disambiguacion',
                    'pregunta_original': body.mensaje,
                    'pacientes':         candidatos,
                }

    contexto_sistema = body.contexto_sistema
    if body.modo == 'admin':
        contexto_sistema = _formatear_metricas_modelos()

    resultado = await chat_responder(
        mensaje=body.mensaje,
        historial=body.historial,
        contexto_paciente=ctx,
        contexto_sistema=contexto_sistema,
    )
    return resultado


# ─── Transcripción de audio (Groq Whisper) ────────────────────────────────────

class TranscripcionRespuesta(BaseModel):
    texto: str


@router.post('/transcribir', response_model=TranscripcionRespuesta)
async def transcribir_audio(
    audio: UploadFile = File(...),
    _user: dict = Depends(get_current_user),
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
