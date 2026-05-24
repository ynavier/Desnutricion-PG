import traceback
from fastapi import APIRouter, HTTPException, Depends

from app.auth.dependencies import get_current_user, require_anl
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
    user: dict = Depends(require_anl),
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
                f'Modelo activado en BD pero falló la carga: '
                f'archivo "{modelo.get("archivo_A")}" no encontrado en /models'
            ),
        )

    print(f'[MODELOS] "{modelo["nombre"]}" activado por {user["email"]}', flush=True)
    return {
        'message': f'Modelo "{modelo["nombre"]}" activado correctamente',
        'modelo': modelo,
    }
