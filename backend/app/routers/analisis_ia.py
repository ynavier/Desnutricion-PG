"""
Análisis IA del dashboard epidemiológico.
Envía las estadísticas actuales a Groq y retorna un análisis en lenguaje
natural con alertas y recomendaciones de acción.
"""
from fastapi import APIRouter, Depends, HTTPException
import httpx

from app.auth.dependencies import require_anl
from app.config import settings
from app.routers.estadisticas import estadisticas   # reutiliza la lógica

router = APIRouter(prefix='/analisis-ia', tags=['analisis-ia'])

GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions'
GROQ_MODEL = 'llama-3.3-70b-versatile'

SYSTEM_PROMPT = """Eres un experto en salud pública y epidemiología nutricional de Colombia.
Recibirás datos estadísticos de un sistema de vigilancia de desnutrición infantil.
Tu tarea es:
1. Escribir un análisis claro y conciso en español (máx 4 párrafos).
2. Identificar las alertas críticas (situaciones que requieren acción urgente).
3. Dar recomendaciones concretas y accionables.

Formato de respuesta JSON:
{
  "resumen": "Párrafo general del estado nutricional.",
  "alertas": [
    {"nivel": "critica"|"moderada"|"leve", "mensaje": "..."}
  ],
  "recomendaciones": ["Acción 1", "Acción 2", "Acción 3"],
  "tendencia": "mejorando"|"estable"|"empeorando"
}

Usa lenguaje técnico pero comprensible. Sé directo y basado en los datos."""


def _formato_datos(stats: dict) -> str:
    lineas = [
        f"DATOS EPIDEMIOLÓGICOS — COLOMBIA",
        f"Total pacientes monitoreados: {stats['total']}",
        f"En riesgo nutricional: {stats['en_riesgo']} ({round(stats['en_riesgo']/max(stats['total'],1)*100,1)}%)",
        f"Tasa de desnutrición (moderada+severa): {stats['tasa_desnutricion']}%",
        f"Municipios monitoreados: {stats['zonas_monitoreadas']}",
        "",
        "DISTRIBUCIÓN POR ESTADO NUTRICIONAL:",
    ]
    for e in stats.get('distribucion_estado', []):
        lineas.append(f"  - {e['estado']}: {e['cantidad']} pacientes")

    lineas.append("\nTENDENCIA ÚLTIMOS MESES:")
    for t in stats.get('tendencia_mensual', [])[-4:]:
        lineas.append(
            f"  {t['mes']}: adecuado={t['adecuado']} | riesgo={t['riesgo']} | "
            f"leve={t['leve']} | moderado={t['moderado']} | severo={t['severo']}"
        )

    lineas.append("\nMUNICIPIOS CON MÁS CASOS:")
    for z in stats.get('zonas_riesgo', [])[:5]:
        lineas.append(f"  - {z['zona']}: {z['casos']} casos (severo={z['severo']}, moderado={z['moderado']})")

    filtros = stats.get('filtros_activos', {})
    if filtros.get('dpto') or filtros.get('municipio'):
        lineas.append(f"\nFILTRO ACTIVO: {filtros}")

    return '\n'.join(lineas)


@router.post('')
async def analizar_dashboard(
    dpto:      str | None = None,
    municipio: str | None = None,
    user: dict = Depends(require_anl),
):
    """Genera un análisis IA de los datos epidemiológicos actuales."""
    if not settings.groq_api_key:
        raise HTTPException(status_code=400, detail='API de IA no configurada.')

    # Obtener estadísticas actuales reutilizando la función directamente
    stats = await estadisticas(dpto=dpto, municipio=municipio, meses=6, _user=user)

    datos_texto = _formato_datos(stats)

    try:
        import json
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                GROQ_URL,
                headers={
                    'Authorization': f'Bearer {settings.groq_api_key}',
                    'Content-Type': 'application/json',
                },
                json={
                    'model':       GROQ_MODEL,
                    'messages': [
                        {'role': 'system', 'content': SYSTEM_PROMPT},
                        {'role': 'user',   'content': datos_texto},
                    ],
                    'temperature':   0.2,
                    'max_tokens':    1024,
                    'response_format': {'type': 'json_object'},
                },
            )

        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail='Error en el servicio de IA.')

        contenido = resp.json()['choices'][0]['message']['content']
        resultado = json.loads(contenido)
        resultado['datos_usados'] = {
            'total':             stats['total'],
            'tasa_desnutricion': stats['tasa_desnutricion'],
            'filtros':           stats.get('filtros_activos'),
        }
        return resultado

    except HTTPException:
        raise
    except Exception as e:
        print(f'[ANALISIS-IA] Error: {e}', flush=True)
        raise HTTPException(status_code=500, detail='Error generando el análisis.')
