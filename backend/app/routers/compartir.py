"""
Endpoints para compartir informes:
  - /compartir/subir    → convierte HTML a PDF (WeasyPrint) y sube a Supabase Storage
  - /compartir/informe  → envía PDF por correo via SMTP (requiere config SMTP)

WeasyPrint requiere GTK en Windows (solo disponible en producción/Linux).
En Windows local el endpoint devuelve 501 con instrucción clara.
"""
import base64
import email.mime.application
import email.mime.multipart
import email.mime.text
import uuid
from datetime import datetime

import aiosmtplib
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from app.auth.dependencies import require_anl
from app.config import settings
from app.database import supabase

router = APIRouter(prefix='/compartir', tags=['compartir'])

BUCKET        = 'reportes'
LINK_EXPIRY_S = 7 * 24 * 3600   # 7 días

# Detectar si WeasyPrint está disponible (Linux/producción) o no (Windows local)
try:
    import weasyprint  # noqa: F401
    WEASYPRINT_OK = True
except Exception:
    WEASYPRINT_OK = False


def _html_a_pdf(html_bytes: bytes) -> bytes:
    """Convierte HTML a PDF usando WeasyPrint."""
    if not WEASYPRINT_OK:
        raise RuntimeError(
            'WeasyPrint no está disponible en este entorno. '
            'Esta función solo opera en producción (Cloud Run / Linux). '
            'En Windows local usa el botón "Descargar PDF" para obtener el PDF '
            'y compártelo manualmente.'
        )
    import weasyprint
    return weasyprint.HTML(string=html_bytes.decode('utf-8')).write_pdf()


# ── Subir informe como PDF a Supabase Storage ─────────────────────────────────

class SubirRequest(BaseModel):
    html_base64:    str
    nombre_archivo: str = 'informe.pdf'
    titulo:         str = 'Informe NutriVigilancia'


@router.post('/subir')
async def subir_informe(
    body: SubirRequest,
    user: dict = Depends(require_anl),
):
    """
    Recibe el HTML del informe en base64, lo convierte a PDF con WeasyPrint
    y lo sube al bucket 'reportes' de Supabase Storage.
    Requiere entorno Linux (Cloud Run) con GTK instalado.
    """
    if not WEASYPRINT_OK:
        raise HTTPException(
            status_code=501,
            detail=(
                'La generación de PDF para compartir solo está disponible en producción. '
                'En local usa el botón "Descargar PDF" y comparte el archivo manualmente.'
            ),
        )

    # Decodificar HTML
    try:
        html_bytes = base64.b64decode(body.html_base64)
    except Exception:
        raise HTTPException(status_code=422, detail='HTML inválido.')

    # Convertir a PDF
    try:
        pdf_bytes = _html_a_pdf(html_bytes)
    except RuntimeError as e:
        raise HTTPException(status_code=501, detail=str(e))
    except Exception as e:
        print(f'[COMPARTIR] Error WeasyPrint: {e}', flush=True)
        raise HTTPException(status_code=500, detail=f'Error generando PDF: {e}')

    # Nombre único
    uid      = str(uuid.uuid4())[:8]
    fecha    = datetime.now().strftime('%Y%m%d_%H%M')
    filename = f"{fecha}_{uid}_{body.nombre_archivo}"

    # Subir a Supabase Storage
    try:
        supabase.storage.from_(BUCKET).upload(
            path=filename,
            file=pdf_bytes,
            file_options={'content-type': 'application/pdf'},
        )
    except Exception as e:
        msg = str(e)
        if 'not found' in msg.lower() or 'does not exist' in msg.lower():
            raise HTTPException(
                status_code=404,
                detail=f'El bucket "{BUCKET}" no existe. Créalo en Supabase: Storage → New bucket → "reportes" (público).',
            )
        raise HTTPException(status_code=500, detail=f'Error subiendo PDF: {e}')

    # URL pública (bucket debe estar configurado como público)
    try:
        result = supabase.storage.from_(BUCKET).get_public_url(filename)
        url    = result if isinstance(result, str) else result.get('publicUrl', '')
        if not url:
            res = supabase.storage.from_(BUCKET).create_signed_url(filename, LINK_EXPIRY_S)
            url = res.get('signedURL') or res.get('signed_url') or res.get('signedUrl', '')
        if not url:
            raise ValueError('URL vacía')
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error generando link: {e}')

    print(f'[COMPARTIR] PDF subido: {filename} | {user.get("email")}', flush=True)
    return {'url': url, 'archivo': filename, 'titulo': body.titulo}


# ── Subir PDF directamente (local o producción) ───────────────────────────────

class SubirPdfRequest(BaseModel):
    pdf_base64:     str
    nombre_archivo: str = 'informe.pdf'
    titulo:         str = 'Informe NutriVigilancia'


@router.post('/subir-pdf')
async def subir_pdf_directo(
    body: SubirPdfRequest,
    user: dict = Depends(require_anl),
):
    """
    Recibe el PDF como base64 (generado desde el navegador vía window.print)
    y lo sube directamente a Supabase Storage.
    Funciona en local y producción.
    """
    try:
        pdf_bytes = base64.b64decode(body.pdf_base64)
    except Exception:
        raise HTTPException(status_code=422, detail='PDF inválido — error al decodificar.')

    uid      = str(uuid.uuid4())[:8]
    fecha    = datetime.now().strftime('%Y%m%d_%H%M')
    filename = f"{fecha}_{uid}_{body.nombre_archivo}"

    try:
        supabase.storage.from_(BUCKET).upload(
            path=filename,
            file=pdf_bytes,
            file_options={'content-type': 'application/pdf'},
        )
    except Exception as e:
        msg = str(e)
        if 'not found' in msg.lower() or 'does not exist' in msg.lower():
            raise HTTPException(
                status_code=404,
                detail='El bucket "reportes" no existe. Créalo en Supabase Storage (público).',
            )
        raise HTTPException(status_code=500, detail=f'Error subiendo PDF: {e}')

    try:
        result = supabase.storage.from_(BUCKET).get_public_url(filename)
        url    = result if isinstance(result, str) else result.get('publicUrl', '')
        if not url:
            res = supabase.storage.from_(BUCKET).create_signed_url(filename, LINK_EXPIRY_S)
            url = res.get('signedURL') or res.get('signed_url') or res.get('signedUrl', '')
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error generando link: {e}')

    print(f'[COMPARTIR] PDF directo subido: {filename} | {user.get("email")}', flush=True)
    return {'url': url, 'archivo': filename, 'titulo': body.titulo}


class CompartirRequest(BaseModel):
    destinatario: EmailStr
    asunto:       str
    mensaje:      str = ''
    pdf_base64:   str          # PDF generado en el frontend (base64)
    nombre_archivo: str = 'informe_nutrivigilancia.pdf'


@router.post('/informe')
async def compartir_informe(
    body: CompartirRequest,
    user: dict = Depends(require_anl),
):
    """
    Envía el informe como PDF adjunto al correo indicado.
    Requiere SMTP configurado (SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM).
    """
    if not all([settings.smtp_host, settings.smtp_user, settings.smtp_pass]):
        raise HTTPException(
            status_code=400,
            detail='El servidor de correo no está configurado. '
                   'Contacta al administrador para habilitar el envío de informes.',
        )

    # Decodificar PDF
    try:
        pdf_bytes = base64.b64decode(body.pdf_base64)
    except Exception:
        raise HTTPException(status_code=422, detail='PDF inválido — error al decodificar base64.')

    # Construir correo MIME
    msg = email.mime.multipart.MIMEMultipart()
    msg['From']    = settings.smtp_from or settings.smtp_user
    msg['To']      = body.destinatario
    msg['Subject'] = body.asunto

    # Cuerpo del correo
    cuerpo = body.mensaje or (
        f'Se adjunta el informe generado por el Sistema de Vigilancia Nutricional Infantil.\n\n'
        f'Generado el {datetime.now().strftime("%d/%m/%Y %H:%M")} por {user.get("nombre", user.get("email", ""))}\n\n'
        f'—\nNutriVigilancia — Sistema de Predicción y Vigilancia de Desnutrición Infantil'
    )
    msg.attach(email.mime.text.MIMEText(cuerpo, 'plain', 'utf-8'))

    # PDF adjunto
    adjunto = email.mime.application.MIMEApplication(pdf_bytes, _subtype='pdf')
    adjunto.add_header(
        'Content-Disposition', 'attachment',
        filename=body.nombre_archivo,
    )
    msg.attach(adjunto)

    # Enviar
    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=settings.smtp_pass,
            start_tls=True,
        )
    except aiosmtplib.SMTPException as e:
        print(f'[SMTP] Error enviando correo: {e}', flush=True)
        raise HTTPException(status_code=502, detail=f'Error al enviar el correo: {e}')
    except Exception as e:
        print(f'[SMTP] Error inesperado: {e}', flush=True)
        raise HTTPException(status_code=500, detail='Error inesperado al enviar el correo.')

    return {'ok': True, 'destinatario': body.destinatario}
