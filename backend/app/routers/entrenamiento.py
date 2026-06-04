from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.auth.dependencies import require_adm
from app.services.entrenamiento import iniciar_entrenamiento, get_job, cancelar_job
from app.database import supabase

router = APIRouter(prefix='/entrenamiento', tags=['entrenamiento'])


class EntrenamientoConfig(BaseModel):
    modelos:    dict[str, dict]
    test_size:  float = 0.2
    cv_folds:   int   = 5
    nombre:     str   = ''


@router.post('/iniciar')
async def iniciar(body: EntrenamientoConfig, user: dict = Depends(require_adm)):
    if not body.modelos:
        raise HTTPException(status_code=400, detail='Selecciona al menos un modelo')
    job_id = await iniciar_entrenamiento({
        **body.model_dump(),
        'user_id': user.get('id', ''),
    })
    return {'job_id': job_id}


@router.post('/{job_id}/cancelar')
async def cancelar(job_id: str, user: dict = Depends(require_adm)):
    ok = cancelar_job(job_id)
    if not ok:
        raise HTTPException(status_code=422, detail='El job no existe o ya terminó')
    return {'message': 'Cancelación solicitada'}


@router.get('/{job_id}')
async def estado_job(job_id: str, user: dict = Depends(require_adm)):
    # 1. Buscar en memoria primero (más rápido)
    job = get_job(job_id)
    if job:
        return {
            'estado':    job['estado'],
            'progreso':  job['progreso'],
            'log':       job['log'],
            'resultado': job['resultado'],
        }

    # 2. Fallback: buscar en Supabase (sobrevive reinicios del contenedor)
    try:
        res = (
            supabase.table('jobs_entrenamiento')
            .select('estado, progreso, log_msgs, resultado')
            .eq('job_id', job_id)
            .limit(1)
            .execute()
        )
        if res.data:
            row = res.data[0]
            return {
                'estado':    row['estado'],
                'progreso':  row['progreso'],
                'log':       row.get('log_msgs', []),
                'resultado': row.get('resultado'),
            }
    except Exception as e:
        print(f'[ENTRENAMIENTO] Error consultando Supabase: {e}', flush=True)

    raise HTTPException(status_code=404, detail='Job no encontrado')
