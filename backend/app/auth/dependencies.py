import traceback
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import supabase, supabase_anon

bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> dict:
    # ── 1. Verificar que viene el header Authorization ─────────────────────────
    if credentials is None:
        print('[AUTH] Sin Authorization header', flush=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='No autenticado',
            headers={'WWW-Authenticate': 'Bearer'},
        )

    token = credentials.credentials
    print(f'[AUTH] Token recibido ({len(token)} chars): {token[:25]}...', flush=True)

    # ── 2. Validar token con Supabase (cliente anon — sin estado de sesión) ───
    try:
        response = supabase_anon.auth.get_user(token)
        if not response or not response.user:
            print('[AUTH] get_user sin usuario en respuesta', flush=True)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='Token inválido o expirado',
            )
        user_id = response.user.id
        print(f'[AUTH] OK - user_id: {user_id}', flush=True)
    except HTTPException:
        raise
    except Exception:
        print(f'[AUTH] Error en get_user:\n{traceback.format_exc()}', flush=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Token inválido o expirado',
        )

    # ── 3. Obtener perfil con rol ──────────────────────────────────────────────
    try:
        profile = (
            supabase.table('profiles')
            .select('id, nombre, email, rol, establecimiento, habilitado')
            .eq('id', user_id)
            .single()
            .execute()
        )
    except Exception:
        print(f'[AUTH] Error consultando perfil:\n{traceback.format_exc()}', flush=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Error interno del servidor',
        )

    if not profile.data:
        print(f'[AUTH] Perfil no encontrado para {user_id}', flush=True)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Perfil no encontrado',
        )

    if not profile.data.get('habilitado', True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Usuario inhabilitado',
        )

    print(f'[AUTH] Perfil OK: {profile.data.get("email")} rol={profile.data.get("rol")}', flush=True)
    return {**profile.data, 'token': token}


async def require_adm(user: dict = Depends(get_current_user)) -> dict:
    if user.get('rol') != 'ADM':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Se requiere rol ADM',
        )
    return user


async def require_anl(user: dict = Depends(get_current_user)) -> dict:
    """Analytics: accesible para ANL y ADM."""
    if user.get('rol') not in ('ANL', 'ADM'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Se requiere rol ANL o ADM',
        )
    return user


async def require_cli(user: dict = Depends(get_current_user)) -> dict:
    if user.get('rol') != 'CLI':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Se requiere rol CLI',
        )
    return user
