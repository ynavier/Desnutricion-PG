"""
Generación de recomendaciones clínicas personalizadas usando Google Gemini.
API key gratuita en: https://aistudio.google.com/apikey  (sin tarjeta)

Si GOOGLE_API_KEY no está configurada, retorna recomendaciones estáticas.
Cache en memoria con TTL de 24h para evitar llamadas repetidas por el mismo paciente.
"""
import json
import time
import hashlib
from app.config import settings

# ── Cache en memoria ──────────────────────────────────────────────────────────
_recs_cache: dict[str, tuple[dict, float]] = {}   # key → (resultado, timestamp)
_CACHE_TTL = 86400.0  # 24 horas en segundos


def _cache_key(datos: dict) -> str:
    """Genera clave de caché: por paciente_id+estado si está disponible, si no por hash completo."""
    paciente_id = datos.get('paciente_id')
    if paciente_id is not None:
        estado = datos.get('estado_nutricional') or datos.get('nivel_alerta') or ''
        zscore = datos.get('zscore') or ''
        raw = f'pac:{paciente_id}:{estado}:{zscore}'
    else:
        raw = json.dumps(datos, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def _cache_get(key: str) -> dict | None:
    entry = _recs_cache.get(key)
    if entry is None:
        return None
    result, ts = entry
    if time.time() - ts > _CACHE_TTL:
        del _recs_cache[key]
        return None
    return result


def _cache_set(key: str, result: dict) -> None:
    _recs_cache[key] = (result, time.time())

# ── Fallback estático por nivel ────────────────────────────────────────────────

_FALLBACK: dict[str, list[str]] = {
    'severe': [
        'Dado el diagnóstico de desnutrición severa, se requiere derivación hospitalaria urgente para iniciar un protocolo de recuperación nutricional intensivo.',
        'Es fundamental realizar una evaluación pediátrica completa en un plazo máximo de 24 horas para estabilizar el estado del paciente.',
        'Se debe notificar de inmediato a la autoridad de salud pública local para activar los mecanismos de apoyo familiar y social.',
        'Iniciar de forma urgente la suplementación terapéutica con RUTF (alimento terapéutico listo para usar) según protocolo nacional.',
    ],
    'moderate': [
        'Se recomienda referencia urgente a nutricionista y pediatra para diseñar un plan de recuperación nutricional personalizado.',
        'Es necesario iniciar de inmediato la suplementación con micronutrientes, incluyendo hierro, zinc y vitamina A, según las guías colombianas.',
        'Se debe coordinar con trabajo social el acceso a programas de apoyo alimentario disponibles en el municipio.',
        'Programar visita domiciliaria en los próximos 15 días para verificar la adherencia al tratamiento y evaluar el entorno familiar.',
    ],
    'mild': [
        'Se recomienda aumentar la frecuencia de los controles nutricionales a una vez al mes para monitorear de cerca la evolución del peso.',
        'Iniciar suplementación con hierro y vitamina A según el esquema establecido por el Ministerio de Salud de Colombia.',
        'Brindar orientación nutricional detallada al cuidador principal sobre preparación de alimentos y porciones adecuadas para la edad.',
        'Monitorear la curva de crecimiento en cada visita y registrar cualquier desviación del patrón esperado.',
    ],
    'risk': [
        'Se recomienda un control mensual para hacer seguimiento oportuno a la tendencia de peso y talla del paciente.',
        'Reforzar la alimentación complementaria adecuada para la edad, con énfasis en alimentos de alta densidad energética y proteica.',
        'Brindar orientación sobre lactancia materna y buenas prácticas de alimentación al cuidador principal.',
        'Monitorear la curva de peso para la edad en cada visita y alertar si se observa una tendencia descendente sostenida.',
    ],
    'adequate': [
        'Mantener los controles rutinarios de crecimiento y desarrollo cada 3 meses para asegurar una vigilancia continua.',
        'Continuar con una dieta balanceada y variada, adecuada para la edad del niño, siguiendo las recomendaciones del ICBF.',
        'Reforzar con el cuidador los hábitos de higiene alimentaria y lavado de manos para prevenir enfermedades gastrointestinales.',
        'El estado nutricional actual se encuentra dentro de los parámetros normales; se felicita al cuidador por el buen manejo.',
    ],
}


def _estado_a_nivel(estado: str | None) -> str:
    n = (estado or '').lower()
    if 'severa'   in n: return 'severe'
    if 'moderada' in n: return 'moderate'
    if 'bajo'     in n: return 'mild'
    if 'normal'   in n: return 'adequate'
    return 'risk'


def _fallback(datos: dict) -> list[str]:
    nivel = datos.get('nivel_alerta') or _estado_a_nivel(datos.get('estado_nutricional'))
    return _FALLBACK.get(nivel, _FALLBACK['risk'])


async def generar_recomendaciones(datos: dict) -> dict:
    """
    Genera recomendaciones clínicas en lenguaje natural usando Gemini 2.0 Flash.
    Revisa caché antes de llamar a la API. Fallback automático si la API falla.
    """
    key = _cache_key(datos)
    cached = _cache_get(key)
    if cached is not None:
        return cached

    if not settings.google_api_key:
        result = {'recomendaciones': _fallback(datos), 'fuente': 'estatica'}
        _cache_set(key, result)
        return result

    try:
        from google import genai

        client = genai.Client(api_key=settings.google_api_key)

        edad_meses = datos.get('edad_meses') or 0
        edad_texto = (
            f"{edad_meses // 12} años {edad_meses % 12} meses"
            if edad_meses else 'edad no especificada'
        )
        sexo_txt = (
            'masculino' if datos.get('sexo') == 'M'
            else 'femenino' if datos.get('sexo') == 'F'
            else 'no especificado'
        )
        zscore   = datos.get('zscore')
        prob     = datos.get('prob_desnutrido')
        factores = datos.get('factores_sociales') or []
        alertas  = datos.get('alertas_activas')  or []

        prompt = (
            "Eres un nutricionista pediátrico experto en Colombia. "
            "Redacta exactamente 4 recomendaciones clínicas para el siguiente caso, "
            "escritas en lenguaje natural como si se las explicaras a un profesional de salud. "
            "Cada recomendación debe ser una oración completa, clara y justificada.\n\n"
            f"- Edad: {edad_texto} ({sexo_txt})\n"
            f"- Estado nutricional: {datos.get('estado_nutricional') or 'no especificado'}\n"
            f"- Z-score P/E: {zscore if zscore is not None else 'no disponible'}\n"
            f"- Probabilidad de desnutrición (modelo ML): "
            f"{f'{round((prob or 0) * 100)}%' if prob is not None else 'no disponible'}\n"
            f"- Factores sociales: {', '.join(factores) if factores else 'ninguno registrado'}\n"
            f"- Alertas activas: {', '.join(alertas) if alertas else 'ninguna'}\n\n"
            "Responde ÚNICAMENTE con un array JSON de 4 strings en español. "
            "Sin texto adicional, sin markdown, solo el array.\n"
            'Ejemplo: ["Dado el estado del paciente, se recomienda...", "Es importante que...", "Se debe coordinar...", "Monitorear..."]'
        )

        response = await client.aio.models.generate_content(
            model='models/gemini-2.5-flash-lite',
            contents=prompt,
        )

        texto = response.text.strip()

        # Limpiar bloques markdown si Gemini los incluye
        if '```' in texto:
            partes = texto.split('```')
            for p in partes:
                p = p.strip()
                if p.startswith('json'):
                    p = p[4:].strip()
                if p.startswith('['):
                    texto = p
                    break

        recs = json.loads(texto)
        if isinstance(recs, list) and len(recs) >= 2:
            result = {'recomendaciones': [str(r) for r in recs[:4]], 'fuente': 'ia'}
            _cache_set(key, result)
            return result

    except Exception as e:
        print(f'[AI-RECS] Error Gemini: {e}', flush=True)

    result = {'recomendaciones': _fallback(datos), 'fuente': 'estatica'}
    _cache_set(key, result)
    return result
