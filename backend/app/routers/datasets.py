"""
GestiÃ³n de datasets SIVIGILA para entrenamiento de modelos ML.

Endpoints:
  GET    /datasets                 â€” lista todos
  POST   /datasets/upload          â€” sube un Excel SIVIGILA
  POST   /datasets/{id}/procesar   â€” ejecuta ETL y genera CSV procesado
  PATCH  /datasets/{id}/habilitar  â€” habilita / deshabilita para entrenamiento
  DELETE /datasets/{id}            â€” elimina registro + archivos
"""

import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app.auth.dependencies import require_adm
from app.config import settings
from app.database import supabase
from app.services.etl import etl_sivigila

router = APIRouter(prefix='/datasets', tags=['datasets'])


def _uploads_dir() -> Path:
    p = Path(settings.data_uploads_dir)
    p.mkdir(parents=True, exist_ok=True)
    return p

def _proc_dir() -> Path:
    p = Path(settings.data_proc_dir)
    p.mkdir(parents=True, exist_ok=True)
    return p


# â”€â”€ Listar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.get('')
async def listar_datasets(user: dict = Depends(require_adm)):
    res = (
        supabase.table('datasets_ml')
        .select('*')
        .order('created_at', desc=True)
        .execute()
    )
    return res.data or []


# â”€â”€ Subir Excel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.post('/upload', status_code=201)
async def subir_dataset(
    file: UploadFile = File(...),
    user: dict = Depends(require_adm),
):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail='Solo se aceptan archivos Excel (.xlsx / .xls)')

    uid      = str(uuid.uuid4())[:8]
    filename = f'{uid}_{file.filename}'
    dest     = _uploads_dir() / filename

    with dest.open('wb') as f:
        shutil.copyfileobj(file.file, f)

    # Contar filas rÃ¡pido
    try:
        import pandas as pd
        filas_raw = len(pd.read_excel(dest))
    except Exception:
        filas_raw = 0

    # Intentar extraer aÃ±o del nombre original (ej. "2024_113_Reporte.xlsx")
    anio = None
    try:
        anio = int(file.filename.split('_')[0])
    except (ValueError, IndexError):
        pass

    rec = {
        'nombre':      file.filename.replace('.xlsx', '').replace('.xls', ''),
        'anio':        anio,
        'archivo_raw': filename,
        'filas_raw':   filas_raw,
        'estado':      'pendiente',
        'habilitado':  False,
        'subido_por':  user.get('id'),
    }
    res = supabase.table('datasets_ml').insert(rec).execute()
    return res.data[0] if res.data else rec


# â”€â”€ Procesar ETL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.post('/{dataset_id}/procesar')
async def procesar_dataset(dataset_id: int, user: dict = Depends(require_adm)):
    res = supabase.table('datasets_ml').select('*').eq('id', dataset_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail='Dataset no encontrado')
    ds = res.data

    ruta_raw = _uploads_dir() / ds['archivo_raw']
    if not ruta_raw.exists():
        raise HTTPException(
            status_code=422,
            detail=f'Archivo no encontrado en el servidor: {ds["archivo_raw"]}',
        )

    supabase.table('datasets_ml').update({'estado': 'procesando'}).eq('id', dataset_id).execute()

    try:
        df_ml, stats = etl_sivigila(ruta_raw)

        nombre_csv = f'dataset_{dataset_id}_{Path(ds["archivo_raw"]).stem}.csv'
        ruta_csv   = _proc_dir() / nombre_csv
        df_ml.to_csv(ruta_csv, index=False)

        supabase.table('datasets_ml').update({
            'estado':       'procesado',
            'archivo_proc': nombre_csv,
            'filas_raw':    stats['filas_raw'],
            'filas_proc':   stats['filas_proc'],
            'mensaje_etl':  f'OK â€” {stats["filas_proc"]:,} registros vÃ¡lidos de {stats["filas_raw"]:,}',
        }).eq('id', dataset_id).execute()

        return {
            'ok':         True,
            'filas_raw':  stats['filas_raw'],
            'filas_proc': stats['filas_proc'],
            'clases':     stats['clases'],
        }

    except Exception as e:
        supabase.table('datasets_ml').update({
            'estado':      'error',
            'mensaje_etl': str(e)[:400],
        }).eq('id', dataset_id).execute()
        raise HTTPException(status_code=500, detail=f'Error en ETL: {str(e)}')


# â”€â”€ Habilitar / deshabilitar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.patch('/{dataset_id}/habilitar')
async def toggle_habilitado(
    dataset_id: int,
    habilitado: bool,
    user: dict = Depends(require_adm),
):
    res = supabase.table('datasets_ml').select('estado').eq('id', dataset_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail='Dataset no encontrado')
    if habilitado and res.data['estado'] != 'procesado':
        raise HTTPException(
            status_code=422,
            detail='El dataset debe estar procesado antes de habilitarlo',
        )

    supabase.table('datasets_ml').update({'habilitado': habilitado}).eq('id', dataset_id).execute()
    return {'ok': True, 'habilitado': habilitado}


# â”€â”€ Eliminar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.delete('/{dataset_id}', status_code=204)
async def eliminar_dataset(dataset_id: int, user: dict = Depends(require_adm)):
    res = supabase.table('datasets_ml').select('archivo_raw, archivo_proc').eq('id', dataset_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail='Dataset no encontrado')
    ds = res.data

    # Borrar el Excel subido
    raw = _uploads_dir() / ds['archivo_raw']
    if raw.exists():
        raw.unlink(missing_ok=True)

    # Borrar el CSV procesado si existe
    if ds.get('archivo_proc'):
        proc = _proc_dir() / ds['archivo_proc']
        if proc.exists():
            proc.unlink(missing_ok=True)

    supabase.table('datasets_ml').delete().eq('id', dataset_id).execute()

