"""
Análisis de reportes con Google Gemini.
Rotación de modelos para distribuir rate limits.
Fallback estático automático si la API falla o no está configurada.

Estructura de respuesta enriquecida:
  objetivo       — propósito del informe (1 oración)
  resumen        — síntesis de hallazgos (2-3 oraciones)
  hallazgos      — lista de 4-5 hallazgos clave
  discusion      — interpretación y contexto (1-2 oraciones)
  conclusiones   — lista de 2-3 conclusiones clínicas
  recomendaciones — lista de 4 recomendaciones accionables
  fuente         — 'ia' | 'estatica'
  modelo_usado   — nombre del modelo Gemini usado
"""
import json
import itertools
from app.config import settings

# ── Modelos en rotación round-robin ───────────────────────────────────────────
_MODELS = [
    'gemini-2.5-flash-lite-preview-06-17',
    'gemini-2.0-flash',
    'gemini-1.5-flash-latest',
]
_model_cycle = itertools.cycle(_MODELS)


def _next_model() -> str:
    return next(_model_cycle)


# ── Fallbacks estáticos por tipo ──────────────────────────────────────────────

_FALLBACKS: dict[str, dict] = {
    'nutricional': {
        'objetivo': (
            'Evaluar el estado nutricional de la población infantil bajo vigilancia, '
            'identificar distribuciones por clasificación nutricional, zona geográfica '
            'y tendencias temporales, orientando intervenciones preventivas conforme a los estándares OMS.'
        ),
        'resumen': (
            'El análisis nutricional del período evaluado revela la distribución del estado '
            'nutricional en la población infantil vigilada. Se observan patrones que requieren '
            'atención diferenciada por zona geográfica y establecimiento de salud. '
            'La tendencia mensual indica variaciones que deben considerarse en la planificación operativa.'
        ),
        'hallazgos': [
            'La desnutrición moderada y severa representa un desafío prioritario para la intervención clínica.',
            'Las zonas rurales presentan mayor concentración de casos de riesgo nutricional.',
            'La tendencia mensual muestra variaciones estacionales relevantes para la planificación.',
            'El z-score promedio refleja el estado general de la cohorte vigilada en el período.',
            'La distribución entre área urbana y rural evidencia brechas en el acceso a atención nutricional.',
        ],
        'discusion': (
            'Los hallazgos son consistentes con la literatura nacional sobre desnutrición infantil en '
            'Colombia. La concentración de casos en zonas rurales refleja barreras estructurales de acceso '
            'a servicios de salud y seguridad alimentaria que deben abordarse desde la política pública.'
        ),
        'conclusiones': [
            'Se identifican municipios y zonas geográficas con alta concentración de casos que requieren priorización de recursos.',
            'La cobertura de controles periódicos es insuficiente en los grupos de mayor riesgo nutricional.',
            'Las tendencias temporales sugieren la necesidad de intervenciones estacionales diferenciadas.',
        ],
        'recomendaciones': [
            'Intensificar visitas domiciliarias en las zonas con mayor prevalencia de desnutrición moderada y severa.',
            'Implementar suplementación preventiva con micronutrientes en los grupos de mayor riesgo identificados.',
            'Articular con programas sociales de apoyo alimentario para familias en situación de vulnerabilidad.',
            'Aumentar la frecuencia de controles en pacientes con z-score por debajo de -1 DE según tablas OMS.',
        ],
        'fuente': 'estatica',
        'modelo_usado': 'fallback',
    },
    'epidemiologico': {
        'objetivo': (
            'Analizar la distribución epidemiológica de la desnutrición infantil en el área de vigilancia, '
            'identificar municipios con mayor carga de enfermedad y detectar tendencias temporales '
            'que permitan la activación oportuna de alertas de salud pública.'
        ),
        'resumen': (
            'El análisis epidemiológico revela la distribución geográfica y temporal de los casos '
            'de desnutrición infantil en el área de vigilancia. Se identifican municipios con mayor '
            'carga de enfermedad y patrones demográficos que requieren intervención prioritaria.'
        ),
        'hallazgos': [
            'Existen municipios con tasas de incidencia significativamente superiores al promedio regional.',
            'La distribución por edad muestra mayor vulnerabilidad en menores de 24 meses.',
            'Los patrones por sexo no muestran diferencias estadísticamente significativas en la mayoría de indicadores.',
            'La tendencia temporal de controles requiere monitoreo continuo para detectar brotes emergentes.',
            'La probabilidad promedio de desnutrición es consistente con los indicadores nacionales del período.',
        ],
        'discusion': (
            'La concentración epidemiológica en determinados municipios refleja condiciones socioeconómicas '
            'y barreras de acceso a servicios de salud estructuralmente diferenciadas. '
            'Los datos son coherentes con los reportes del SIVIGILA para el período evaluado.'
        ),
        'conclusiones': [
            'Se identifican municipios prioritarios que concentran la mayor carga epidemiológica de desnutrición.',
            'El grupo etario de 0 a 24 meses requiere estrategias de vigilancia reforzadas y activas.',
            'La tendencia temporal permite anticipar picos de incidencia con suficiente margen para intervención.',
        ],
        'recomendaciones': [
            'Focalizar recursos y equipos de salud en los municipios de mayor carga epidemiológica identificados.',
            'Desarrollar estrategias de detección temprana especialmente para el grupo de 0 a 24 meses.',
            'Establecer salas de situación municipales para monitoreo en tiempo real con alertas automáticas.',
            'Coordinar con SIVIGILA la notificación oportuna de casos según el protocolo nacional vigente.',
        ],
        'fuente': 'estatica',
        'modelo_usado': 'fallback',
    },
    'pacientes': {
        'objetivo': (
            'Documentar el estado actual del seguimiento nutricional de la población bajo vigilancia, '
            'identificar brechas en la cobertura de controles y priorizar la intervención '
            'en pacientes con mayor riesgo de desnutrición activa.'
        ),
        'resumen': (
            'El análisis de la cohorte de pacientes evidencia el estado actual del seguimiento '
            'en la población bajo vigilancia nutricional. Se identifican pacientes sin seguimiento '
            'en el período que requieren acciones de búsqueda activa e intervención prioritaria.'
        ),
        'hallazgos': [
            'Un porcentaje relevante de pacientes no ha tenido controles registrados en el período evaluado.',
            'Los casos de desnutrición activa requieren seguimiento prioritario y coordinación interinstitucional.',
            'La distribución por establecimiento refleja la cobertura territorial del programa de vigilancia.',
            'Los pacientes más jóvenes presentan mayor variabilidad en el estado nutricional.',
            'La tasa de seguimiento es heterogénea entre establecimientos y municipios.',
        ],
        'discusion': (
            'Las brechas en la cobertura de controles reflejan barreras de acceso tanto geográficas '
            'como operativas en el sistema de vigilancia. La identificación de pacientes sin seguimiento '
            'es crítica para prevenir la progresión de la desnutrición a estadios más severos.'
        ),
        'conclusiones': [
            'La cobertura de seguimiento es insuficiente para garantizar la detección oportuna de cambios en el estado nutricional.',
            'Los establecimientos con mayor tasa de inasistencia requieren evaluación de barreras operativas específicas.',
            'Los pacientes con desnutrición activa constituyen la prioridad inmediata de intervención clínica.',
        ],
        'recomendaciones': [
            'Activar búsqueda activa de pacientes sin seguimiento registrado en el período evaluado.',
            'Priorizar controles presenciales para pacientes con diagnóstico de desnutrición activa.',
            'Reforzar la comunicación con cuidadores sobre la importancia de los controles periódicos.',
            'Evaluar y documentar las barreras de acceso en establecimientos con mayor proporción de inasistencia.',
        ],
        'fuente': 'estatica',
        'modelo_usado': 'fallback',
    },
    'modelo': {
        'objetivo': (
            'Evaluar el desempeño del modelo de Machine Learning activo para la predicción del estado '
            'nutricional infantil, comparar con versiones históricas y formular recomendaciones '
            'para la mejora continua del sistema predictivo.'
        ),
        'resumen': (
            'El modelo de machine learning activo muestra un desempeño evaluado en las métricas '
            'estándar de clasificación. El análisis histórico permite comparar la evolución del '
            'rendimiento predictivo a través de las versiones entrenadas del sistema.'
        ),
        'hallazgos': [
            'Las métricas de precisión y recall reflejan la capacidad del modelo para identificar casos de riesgo.',
            'El área bajo la curva ROC indica el poder discriminatorio del clasificador activo.',
            'La evolución histórica del accuracy muestra la tendencia de mejora del sistema predictivo.',
            'El número de predicciones realizadas valida la adopción del modelo en la práctica clínica.',
            'Las métricas de F1-Score balancean adecuadamente la sensibilidad y especificidad del clasificador.',
        ],
        'discusion': (
            'El desempeño del modelo es coherente con los estándares esperados para sistemas de vigilancia '
            'nutricional predictiva. Un ROC-AUC superior a 0.85 se considera óptimo para este tipo de aplicaciones. '
            'La evolución histórica del accuracy indica una mejora progresiva del sistema con el reentrenamiento periódico.'
        ),
        'conclusiones': [
            'El modelo activo cumple con los criterios mínimos de rendimiento para su uso en vigilancia clínica.',
            'La evolución histórica del accuracy muestra una tendencia positiva de mejora con cada ciclo de reentrenamiento.',
            'La adopción del modelo en la práctica clínica valida su utilidad para la detección temprana de riesgo nutricional.',
        ],
        'recomendaciones': [
            'Continuar el monitoreo periódico del rendimiento del modelo con datos nuevos acumulados.',
            'Planificar reentrenamiento cuando se acumulen suficientes datos del período reciente (≥ 6 meses).',
            'Comparar predicciones del modelo con diagnósticos clínicos confirmados para calibración continua.',
            'Documentar los casos donde el modelo difiere del diagnóstico clínico para mejora iterativa del sistema.',
        ],
        'fuente': 'estatica',
        'modelo_usado': 'fallback',
    },
}


# ── Prompts por tipo ──────────────────────────────────────────────────────────

def _build_prompt(tipo: str, kpis: dict, distribucion: dict | list | None) -> str:
    context_json = json.dumps(
        {'kpis': kpis, 'distribucion': distribucion or {}},
        ensure_ascii=False,
        default=str,
    )

    base = (
        "Eres un epidemiólogo y nutricionista pediátrico experto en Colombia y sistemas de salud pública. "
        "Analiza los siguientes datos de un sistema de vigilancia nutricional infantil "
        "y genera un informe clínico estructurado, formal y accionable.\n\n"
        f"DATOS DEL REPORTE ({tipo.upper()}):\n{context_json}\n\n"
    )

    instrucciones = {
        'nutricional': (
            "Genera un análisis formal del estado nutricional de la población infantil vigilada. "
            "Identifica patrones críticos, grupos de riesgo y tendencias temporales. "
            "El objetivo del informe es orientar intervenciones preventivas y de recuperación nutricional."
        ),
        'epidemiologico': (
            "Genera un análisis epidemiológico formal de la distribución y tendencia de la desnutrición. "
            "Identifica municipios prioritarios, grupos etarios vulnerables y alertas epidemiológicas."
        ),
        'pacientes': (
            "Genera un análisis clínico formal del seguimiento de pacientes en el período. "
            "Identifica brechas en la cobertura, prioridades de intervención y oportunidades de mejora operativa."
        ),
        'modelo': (
            "Genera un análisis técnico formal del desempeño del modelo predictivo de machine learning. "
            "Evalúa las métricas, compara la evolución histórica e identifica áreas de mejora del sistema predictivo."
        ),
    }

    return (
        base
        + instrucciones.get(tipo, instrucciones['nutricional'])
        + "\n\n"
        "Responde ÚNICAMENTE con un objeto JSON con esta estructura exacta (sin markdown, sin texto adicional):\n"
        '{\n'
        '  "objetivo": "una oración sobre el objetivo del informe (máx. 40 palabras)",\n'
        '  "resumen": "párrafo de 2-3 oraciones resumiendo los hallazgos principales",\n'
        '  "hallazgos": ["hallazgo 1", "hallazgo 2", "hallazgo 3", "hallazgo 4", "hallazgo 5"],\n'
        '  "discusion": "párrafo de 1-2 oraciones de interpretación y contexto epidemiológico",\n'
        '  "conclusiones": ["conclusión clínica 1", "conclusión clínica 2", "conclusión clínica 3"],\n'
        '  "recomendaciones": ["recomendacion 1", "recomendacion 2", "recomendacion 3", "recomendacion 4"]\n'
        '}'
    )


# ── Función principal ─────────────────────────────────────────────────────────

async def analizar_reporte(
    tipo: str,
    kpis: dict,
    distribucion: dict | list | None = None,
) -> dict:
    """
    Genera análisis de IA para un reporte.
    Rota entre modelos Gemini para distribuir rate limits.
    Fallback automático a respuesta estática si falla.
    """
    fallback = _FALLBACKS.get(tipo, _FALLBACKS['nutricional'])

    if not settings.google_api_key:
        return fallback

    modelo = _next_model()

    try:
        from google import genai

        client = genai.Client(api_key=settings.google_api_key)
        prompt = _build_prompt(tipo, kpis, distribucion)

        response = await client.aio.models.generate_content(
            model=f'models/{modelo}',
            contents=prompt,
        )

        texto = (response.text or '').strip()

        # Limpiar bloque markdown si existe
        if '```' in texto:
            partes = texto.split('```')
            for p in partes:
                p = p.strip()
                if p.startswith('json'):
                    p = p[4:].strip()
                if p.startswith('{'):
                    texto = p
                    break

        data = json.loads(texto)

        resumen         = data.get('resumen', '')
        hallazgos       = data.get('hallazgos', [])
        recomendaciones = data.get('recomendaciones', [])
        objetivo        = data.get('objetivo', '')
        discusion       = data.get('discusion', '')
        conclusiones    = data.get('conclusiones', [])

        if (
            isinstance(resumen, str) and resumen
            and isinstance(hallazgos, list) and len(hallazgos) >= 2
            and isinstance(recomendaciones, list) and len(recomendaciones) >= 2
        ):
            return {
                'objetivo':       str(objetivo) if objetivo else fallback.get('objetivo', ''),
                'resumen':        resumen,
                'hallazgos':      [str(h) for h in hallazgos[:6]],
                'discusion':      str(discusion) if discusion else fallback.get('discusion', ''),
                'conclusiones':   [str(c) for c in conclusiones[:4]] if conclusiones else fallback.get('conclusiones', []),
                'recomendaciones': [str(r) for r in recomendaciones[:6]],
                'fuente':         'ia',
                'modelo_usado':   modelo,
            }

    except Exception as e:
        print(f'[AI-REPORTES] Error con modelo {modelo}: {e}', flush=True)

    return fallback
