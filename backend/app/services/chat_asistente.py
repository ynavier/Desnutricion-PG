"""
Chat IA Asistente — Nutrición Infantil
Usa Groq (Llama 3.3 70B) para responder preguntas clínicas sobre
nutrición infantil. Separado de Google Gemini (recomendaciones clínicas).

API Key gratuita en: https://console.groq.com
"""
import httpx
from app.config import settings

GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
GROQ_MODEL = 'llama-3.3-70b-versatile'

SYSTEM_PROMPT = (
    "Eres NIVI, una asistente especializada en nutrición infantil y vigilancia "
    "epidemiológica para menores de 5 años en Colombia.\n\n"

    "OPERAS EN DOS MODOS según el contexto:\n\n"

    "MODO CLÍNICO — cuando el profesional pregunta sobre un paciente específico:\n"
    "- Quien te habla es un profesional de salud (médico, enfermero/a, nutricionista).\n"
    "- El niño mencionado es un PACIENTE. Usa 'el paciente', 'la paciente', nunca "
    "'su hijo/a'.\n"
    "- Habla de colega a colega: directo, técnico, sin condescendencia.\n"
    "- Orienta sobre criterios diagnósticos y clasificación nutricional (OMS, MSPS).\n"
    "- Referencia guías colombianas (ICBF, MinSalud/MSPS, OPS/OMS) cuando aplique.\n"
    "- Si hay datos del paciente (peso, talla, z-score), úsalos para personalizar.\n"
    "- Señala criterios de hospitalización cuando aplique según protocolos colombianos.\n\n"

    "MODO EPIDEMIOLÓGICO — cuando recibes datos del dashboard de vigilancia:\n"
    "- Analiza tendencias, tasas y distribuciones con enfoque de salud pública.\n"
    "- Identifica alertas críticas (zonas de alta prevalencia, grupos vulnerables).\n"
    "- Sugiere intervenciones concretas y planes de acción priorizados.\n"
    "- Contextualiza los datos con la situación nutricional de Colombia y la región Caribe.\n"
    "- Relaciona los hallazgos con determinantes sociales (estrato, área rural/urbana, "
    "seguimiento de crecimiento y desarrollo).\n"
    "- Responde preguntas sobre los datos mostrando siempre razonamiento epidemiológico.\n"
    "- NUNCA inventes cifras; trabaja solo con los datos que te proporcionen.\n\n"

    "REGLAS GENERALES:\n"
    "1. Responde SIEMPRE en español.\n"
    "2. Sé conciso y estructurado. Usa listas con viñetas para recomendaciones.\n"
    "3. No emitas diagnósticos definitivos individuales.\n"
    "4. Para temas fuera de nutrición y salud infantil, indica brevemente tu especialidad.\n"
    "5. Omite expresiones de lástima — el profesional necesita información accionable."
)

MAX_HISTORY = 20  # Máximo de mensajes en el historial


async def extraer_nombre_paciente(mensaje: str) -> str | None:
    """
    Usa Groq para detectar si el mensaje menciona un paciente por nombre.
    Retorna el nombre completo (ej: 'María García') o None si no hay ninguno.
    Llama con max_tokens=20 para que sea rápido y económico.
    """
    if not settings.groq_api_key:
        return None
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                GROQ_URL,
                headers={
                    'Authorization': f'Bearer {settings.groq_api_key}',
                    'Content-Type': 'application/json',
                },
                json={
                    'model': GROQ_MODEL,
                    'messages': [
                        {
                            'role': 'system',
                            'content': (
                                'Eres un extractor de nombres. Tu única tarea es identificar el nombre '
                                'propio de un paciente específico en el mensaje clínico. '
                                'Responde EXCLUSIVAMENTE con el nombre completo (ej: "María García") '
                                'o con la palabra exacta NINGUNO si no hay nombre de paciente. '
                                'No incluyas artículos (el/la), títulos, cargo ni explicaciones.'
                            ),
                        },
                        {'role': 'user', 'content': mensaje[:500]},
                    ],
                    'temperature': 0.0,
                    'max_tokens': 20,
                },
            )
        if resp.status_code == 200:
            texto = resp.json()['choices'][0]['message']['content'].strip()
            return None if texto.upper().startswith('NINGUNO') else texto
    except Exception as e:
        print(f'[CHAT-IA] Error en extracción de nombre: {e}', flush=True)
    return None


async def chat_responder(
    mensaje: str,
    historial: list[dict] | None = None,
    contexto_paciente: dict | None = None,
) -> dict:
    """
    Envía un mensaje al asistente y retorna la respuesta.
    
    Args:
        mensaje: Pregunta del usuario
        historial: Lista de mensajes previos [{"role": "user"|"assistant", "content": "..."}]
        contexto_paciente: Datos opcionales del paciente para contextualizar
    
    Returns:
        {"respuesta": str, "fuente": "ia"|"fallback"}
    """
    if not settings.groq_api_key:
        return {
            'respuesta': (
                'El asistente de IA no está configurado. '
                'Contacta al administrador para habilitar la API de Groq.'
            ),
            'fuente': 'fallback',
        }

    # Construir mensajes
    messages = [{'role': 'system', 'content': SYSTEM_PROMPT}]

    # Agregar contexto del paciente si existe
    if contexto_paciente:
        ctx_parts = []
        if contexto_paciente.get('nombre'):
            ctx_parts.append(f"Paciente: {contexto_paciente['nombre']}")
        if contexto_paciente.get('edad_meses') is not None:
            em = contexto_paciente['edad_meses']
            ctx_parts.append(f"Edad: {em // 12} años {em % 12} meses")
        if contexto_paciente.get('sexo'):
            ctx_parts.append(f"Sexo: {'Masculino' if contexto_paciente['sexo'] == 'M' else 'Femenino'}")
        if contexto_paciente.get('estado_nutricional'):
            ctx_parts.append(f"Estado nutricional: {contexto_paciente['estado_nutricional']}")
        if contexto_paciente.get('peso'):
            ctx_parts.append(f"Peso: {contexto_paciente['peso']} kg")
        if contexto_paciente.get('talla'):
            ctx_parts.append(f"Talla: {contexto_paciente['talla']} cm")
        if contexto_paciente.get('imc'):
            ctx_parts.append(f"IMC: {contexto_paciente['imc']}")
        if contexto_paciente.get('zscore'):
            ctx_parts.append(f"Z-score P/E: {contexto_paciente['zscore']}")

        if ctx_parts:
            messages.append({
                'role': 'system',
                'content': (
                    'CONTEXTO DEL PACIENTE ACTUAL (usa estos datos para '
                    'personalizar tus respuestas):\n' + '\n'.join(f'- {p}' for p in ctx_parts)
                ),
            })

    # Agregar historial (limitado)
    if historial:
        for msg in historial[-MAX_HISTORY:]:
            if msg.get('role') in ('user', 'assistant') and msg.get('content'):
                messages.append({
                    'role': msg['role'],
                    'content': msg['content'][:2000],  # Limitar largo por mensaje
                })

    # Agregar mensaje actual
    messages.append({'role': 'user', 'content': mensaje[:2000]})

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                GROQ_URL,
                headers={
                    'Authorization': f'Bearer {settings.groq_api_key}',
                    'Content-Type': 'application/json',
                },
                json={
                    'model': GROQ_MODEL,
                    'messages': messages,
                    'temperature': 0.3,
                    'max_tokens': 1024,
                    'top_p': 0.9,
                },
            )

            if resp.status_code != 200:
                print(f'[CHAT-IA] Error Groq HTTP {resp.status_code}: {resp.text[:200]}', flush=True)
                return {
                    'respuesta': (
                        'Lo siento, no pude procesar tu consulta en este momento. '
                        'Por favor intenta de nuevo en unos segundos.'
                    ),
                    'fuente': 'fallback',
                }

            data = resp.json()
            contenido = data['choices'][0]['message']['content']

            return {
                'respuesta': contenido.strip(),
                'fuente': 'ia',
            }

    except httpx.TimeoutException:
        print('[CHAT-IA] Timeout en Groq API', flush=True)
        return {
            'respuesta': (
                'La consulta tardó demasiado. Por favor intenta con una '
                'pregunta más corta o inténtalo de nuevo.'
            ),
            'fuente': 'fallback',
        }
    except Exception as e:
        print(f'[CHAT-IA] Error inesperado: {e}', flush=True)
        return {
            'respuesta': (
                'Ocurrió un error inesperado. Por favor intenta de nuevo.'
            ),
            'fuente': 'fallback',
        }
