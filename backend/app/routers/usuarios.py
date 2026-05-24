from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from app.auth.dependencies import require_anl
from app.database import supabase

router = APIRouter(prefix='/usuarios', tags=['usuarios'])


class UsuarioCreate(BaseModel):
    nombre: str
    apellidos: str
    email: str
    password: str
    establecimiento: str | None = None


@router.get('')
async def listar_usuarios(user: dict = Depends(require_anl)):
    res = supabase.table('profiles') \
        .select('id, nombre, email, rol, establecimiento, habilitado, created_at') \
        .eq('rol', 'CLI') \
        .order('created_at', desc=True) \
        .execute()
    return res.data or []


@router.post('', status_code=status.HTTP_201_CREATED)
async def crear_usuario(body: UsuarioCreate, user: dict = Depends(require_anl)):
    # Crear en Supabase Auth
    try:
        auth_res = supabase.auth.admin.create_user({
            'email': body.email,
            'password': body.password,
            'email_confirm': True,
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Error al crear usuario: {str(e)}')

    user_id = auth_res.user.id

    # Crear perfil
    perfil = {
        'id': user_id,
        'nombre': f'{body.nombre} {body.apellidos}',
        'email': body.email,
        'rol': 'CLI',
        'establecimiento': body.establecimiento,
        'habilitado': True,
    }
    supabase.table('profiles').insert(perfil).execute()

    return {'id': user_id, 'message': 'Usuario CLI creado'}


@router.patch('/{user_id}/habilitar')
async def toggle_habilitado(
    user_id: str,
    habilitado: bool,
    user: dict = Depends(require_anl),
):
    supabase.table('profiles') \
        .update({'habilitado': habilitado}) \
        .eq('id', user_id) \
        .execute()

    # Bloquear/desbloquear en Supabase Auth
    try:
        supabase.auth.admin.update_user_by_id(user_id, {'ban_duration': 'none' if habilitado else '876600h'})
    except Exception:
        pass

    return {'ok': True, 'habilitado': habilitado}
