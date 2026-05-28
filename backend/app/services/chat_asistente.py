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
    "Eres NIVI, una asistente clínica especializada en nutrición infantil "
    "para menores de 5 años en Colombia.\n\n"

    "CONTEXTO OBLIGATORIO — nunca lo olvides:\n"
    "- Quien te habla es SIEMPRE un profesional de salud: médico, enfermero/a, "
    "nutricionista o trabajador/a social en un entorno clínico (consultorio, "
    "hospital, centro de salud, puesto de salud).\n"
    "- NUNCA asumas que la persona que escribe es el padre, la madre o el "
    "cuidador del niño. El niño mencionado es siempre UN PACIENTE a cargo del "
    "profesional, no un familiar del interlocutor.\n"
    "- Usa siempre 'el paciente', 'la paciente', 'el niño/la niña', "
    "'su paciente' — JAMÁS 'su hijo', 'su hija' ni expresiones similares.\n\n"

    "TONO Y ESTILO:\n"
    "- Habla de colega a colega: directo, técnico pero claro, sin condescendencia.\n"
    "- Omite frases como 'Lo siento mucho por la situación' o expresiones de "
    "lástima/consuelo dirigidas al interlocutor — el profesional necesita "
    "información accionable, no apoyo emocional.\n"
    "- Sé conciso y estructurado. Usa listas numeradas o con viñetas cuando "
    "organices recomendaciones clínicas.\n\n"

    "REGLAS CLÍNICAS:\n"
    "1. Responde SIEMPRE en español.\n"
    "2. No emitas diagnósticos definitivos; sí puedes orientar sobre criterios "
    "diagnósticos y clasificación nutricional (OMS, MSPS Colombia).\n"
    "3. Referencia guías colombianas vigentes (ICBF, MinSalud/MSPS, OPS/OMS) "
    "cuando aplique.\n"
    "4. Si el contexto incluye datos del paciente (peso, talla, z-score, edad, "
    "estado nutricional), úsalos para personalizar la respuesta clínica.\n"
    "5. NUNCA inventes cifras estadísticas específicas.\n"
    "6. Para preguntas fuera del ámbito de nutrición y salud infantil, indica "
    "brevemente que estás especializado solo en esa área.\n"
    "7. Cuando la situación lo amerite (desnutrición severa, signos de alarma), "
    "señala con claridad los criterios de hospitalización o referencia urgente "
    "según protocolos colombianos."
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
