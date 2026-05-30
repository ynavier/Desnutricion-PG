import traceback
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends

from app.auth.dependencies import get_current_user, require_adm
from app.config import settings
from app.database import supabase
from app.ml.loader import load_models

router = APIRouter(prefix='/modelos', tags=['modelos'])


@router.get('')
async def listar_modelos(user: dict = Depends(get_current_user)):
    """Lista todos los modelos registrados. Accesible para CLI y ANL."""
    res = supabase.table('modelos_ml').select('*').order('created_at').execute()
    return res.data or []


@router.get('/activo')
async def modelo_activo(user: dict = Depends(get_current_user)):
    """Retorna el modelo actualmente activo."""
    res = (
        supabase.table('modelos_ml')
        .select('*')
        .eq('activo', True)
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None


@router.put('/{modelo_id}/activar')
async def activar_modelo(
    modelo_id: int,
    user: dict = Depends(require_adm),
):
    """
    Activa el modelo indicado para el panel CLI.
    Solo disponible para usuarios ANL.
    """
    res = supabase.table('modelos_ml').select('*').eq('id', modelo_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail='Modelo no encontrado')

    modelo = res.data

    # Desactivar todos y activar el seleccionado
    supabase.table('modelos_ml').update({'activo': False}).gte('id', 0).execute()
    supabase.table('modelos_ml').update({'activo': True}).eq('id', modelo_id).execute()

    # Recargar el predictor con los archivos del nuevo modelo
    try:
        load_models(modelo)
    except Exception:
        print(f'[MODELOS] Error recargando modelo:\n{traceback.format_exc()}', flush=True)
        raise HTTPException(
            status_code=500,
            detail=(
                f'Modelo activado en BD pero fallÃ³ la carga: '
                f'archivo "{modelo.get("archivo_a")}" no encontrado en /models'
            ),
        )

    print(f'[MODELOS] "{modelo["nombre"]}" activado por {user["email"]}', flush=True)
    return {
        'message': f'Modelo "{modelo["nombre"]}" activado correctamente',
        'modelo': modelo,
    }


@router.delete('/{modelo_id}', status_code=204)
async def eliminar_modelo(modelo_id: int, user: dict = Depends(require_adm)):
    """Elimina un modelo de la BD y borra sus archivos .joblib del disco."""
    res = supabase.table('modelos_ml').select('*').eq('id', modelo_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail='Modelo no encontrado')

    modelo = res.data
    if modelo.get('activo'):
        raise HTTPException(
            status_code=422,
            detail='No se puede eliminar el modelo activo. Activa otro modelo primero.',
        )

    # Borrar archivos .joblib del disco
    d = Path(settings.models_dir)
    for col in ['archivo_a', 'archivo_b', 'scaler_a', 'scaler_b']:
        fname = modelo.get(col)
        if fname:
            f = d / fname
            if f.exists():
                f.unlink(missing_ok=True)

    # Borrar le_dpto si estÃ¡ registrado en metricas
    metricas = modelo.get('metricas') or {}
    le_f = metricas.get('le_dpto')
    if le_f:
        f = d / le_f
        if f.exists():
            f.unlink(missing_ok=True)

    supabase.table('modelos_ml').delete().eq('id', modelo_id).execute()
    print(f'[MODELOS] Modelo #{modelo_id} "{modelo["nombre"]}" eliminado por {user["email"]}', flush=True)


# â”€â”€ Archivos huÃ©rfanos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

# Archivos base que NUNCA se borran aunque no estÃ©n en la BD
_ARCHIVOS_PROTEGIDOS = {
    'modelo_A_rf.joblib', 'modelo_B_rf.joblib',
    'scaler_A.joblib', 'scaler_B.joblib',
    'le_dpto.joblib', 'model_metadata.json',
}

@router.post('/limpiar-huerfanos')
async def limpiar_huerfanos(user: dict = Depends(require_adm)):
    """
    Detecta y elimina archivos .joblib en /models que no estÃ¡n referenciados
    por ningÃºn registro activo en la BD (huÃ©rfanos de entrenamientos fallidos).
    Nunca borra los archivos base protegidos.
    """
    d = Path(settings.models_dir)
    if not d.exists():
        return {'borrados': [], 'total': 0}

    # Recopilar todos los archivos referenciados en la BD
    res = supabase.table('modelos_ml').select(
        'archivo_a, archivo_b, scaler_a, scaler_b, metricas'
    ).execute()

    archivos_en_bd: set[str] = set()
    for rec in (res.data or []):
        for col in ['archivo_a', 'archivo_b', 'scaler_a', 'scaler_b']:
            if rec.get(col):
                archivos_en_bd.add(rec[col])
        met = rec.get('metricas') or {}
        if met.get('le_dpto'):
            archivos_en_bd.add(met['le_dpto'])

    # Escanear disco
    borrados = []
    for f in d.iterdir():
        if f.suffix not in ('.joblib',) or f.name in _ARCHIVOS_PROTEGIDOS:
            continue
        if f.name not in archivos_en_bd:
            f.unlink(missing_ok=True)
            borrados.append(f.name)
            print(f'[MODELOS] HuÃ©rfano eliminado: {f.name}', flush=True)

    print(f'[MODELOS] Limpieza: {len(borrados)} archivo(s) huÃ©rfano(s) eliminados por {user["email"]}', flush=True)
    return {'borrados': borrados, 'total': len(borrados)}

