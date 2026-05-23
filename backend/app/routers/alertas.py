from fastapi import APIRouter, Depends
from app.auth.dependencies import require_cli
from app.database import supabase

router = APIRouter(prefix='/alertas', tags=['alertas'])


@router.get('/')
async def listar_alertas(
    leida: bool | None = None,
    nivel: str | None = None,
    paciente_id: int | None = None,
    user: dict = Depends(require_cli),
):
    query = supabase.table('alertas').select(
        '*, pacientes(nombre, apellidos)'
    ).order('created_at', desc=True).limit(100)

    if leida is not None:
        query = query.eq('leida', leida)
    if nivel:
        query = query.eq('nivel', nivel)
    if paciente_id:
        query = query.eq('paciente_id', paciente_id)

    res = query.execute()
    return res.data or []


@router.patch('/{alerta_id}/leer')
async def marcar_leida(
    alerta_id: int,
    user: dict = Depends(require_cli),
):
    supabase.table('alertas') \
        .update({'leida': True}) \
        .eq('id', alerta_id) \
        .execute()
    return {'ok': True}


@router.patch('/leer-todas')
async def marcar_todas_leidas(user: dict = Depends(require_cli)):
    supabase.table('alertas').update({'leida': True}).eq('leida', False).execute()
    return {'ok': True}
