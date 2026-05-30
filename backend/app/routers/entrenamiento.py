from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.auth.dependencies import require_adm
from app.services.entrenamiento import iniciar_entrenamiento, get_job

router = APIRouter(prefix='/entrenamiento', tags=['entrenamiento'])


class EntrenamientoConfig(BaseModel):
    modelos:    dict[str, dict]   # {tipo: params}  ej: {'rf': {'n_estimators': 100}}
    test_size:  float = 0.2
    cv_folds:   int   = 5
    nombre:     str   = ''       # prefijo del nombre en modelos_ml


@router.post('/iniciar')
async def iniciar(body: EntrenamientoConfig, user: dict = Depends(require_adm)):
    if not body.modelos:
        raise HTTPException(status_code=400, detail='Selecciona al menos un modelo')
    job_id = await iniciar_entrenamiento({
        **body.model_dump(),
        'user_id': user.get('id', ''),
    })
    return {'job_id': job_id}


@router.get('/{job_id}')
async def estado_job(job_id: str, user: dict = Depends(require_adm)):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail='Job no encontrado')
    return {
        'estado':    job['estado'],
        'progreso':  job['progreso'],
        'log':       job['log'],
        'resultado': job['resultado'],
    }

