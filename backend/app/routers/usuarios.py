from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from app.auth.dependencies import require_adm
from app.database import supabase

router = APIRouter(prefix='/usuarios', tags=['usuarios'])

ROLES_VALIDOS = ('CLI', 'ANL', 'ADM')


class UsuarioCreate(BaseModel):
    nombre:         str
    apellidos:      str
    email:          str
    password:       str
    rol:            str = 'CLI'
    establecimiento: str | None = None


class RolUpdate(BaseModel):
    rol: str


@router.get('')
async def listar_usuarios(user: dict = Depends(require_adm)):
    """Devuelve todos los usuarios del sistema (CLI, ANL, ADM)."""
    res = (
        supabase.table('profiles')
        .select('id, nombre, email, rol, establecimiento, habilitado, created_at')
        .order('created_at', desc=True)
        .execute()
    )
    return res.data or []


@router.post('', status_code=status.HTTP_201_CREATED)
async def crear_usuario(body: UsuarioCreate, user: dict = Depends(require_adm)):
    if body.rol not in ROLES_VALIDOS:
        raise HTTPException(status_code=400, detail=f'Rol inválido. Opciones: {ROLES_VALIDOS}')

    try:
        auth_res = supabase.auth.admin.create_user({
            'email':         body.email,
            'password':      body.password,
            'email_confirm': True,
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Error al crear usuario: {str(e)}')

    user_id = auth_res.user.id
    perfil = {
        'id':             user_id,
        'nombre':         f'{body.nombre} {body.apellidos}',
        'email':          body.email,
        'rol':            body.rol,
        'establecimiento': body.establecimiento,
        'habilitado':     True,
    }
    supabase.table('profiles').insert(perfil).execute()
    return {'id': user_id, 'message': f'Usuario {body.rol} creado'}


@router.patch('/{user_id}/habilitar')
async def toggle_habilitado(
    user_id: str,
    habilitado: bool,
    user: dict = Depends(require_adm),
):
    supabase.table('profiles').update({'habilitado': habilitado}).eq('id', user_id).execute()
    try:
        supabase.auth.admin.update_user_by_id(
            user_id, {'ban_duration': 'none' if habilitado else '876600h'}
        )
    except Exception:
        pass
    return {'ok': True, 'habilitado': habilitado}


@router.patch('/{user_id}/rol')
async def cambiar_rol(
    user_id: str,
    body: RolUpdate,
    user: dict = Depends(require_adm),
):
    """Cambia el rol de un usuario (CLI ↔ ANL ↔ ADM)."""
    if body.rol not in ROLES_VALIDOS:
        raise HTTPException(status_code=400, detail=f'Rol inválido. Opciones: {ROLES_VALIDOS}')

    # No permitir quitarle el rol ADM al propio usuario que hace la petición
    if user_id == user['id'] and body.rol != 'ADM':
        raise HTTPException(status_code=400, detail='No puedes cambiar tu propio rol de ADM.')

    supabase.table('profiles').update({'rol': body.rol}).eq('id', user_id).execute()
    return {'ok': True, 'rol': body.rol}
