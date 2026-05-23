from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import supabase

bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail='No autenticado',
                            headers={'WWW-Authenticate': 'Bearer'})
    token = credentials.credentials
    try:
        response = supabase.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail='Token inválido o expirado')
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail='Token inválido o expirado')

    user_id = response.user.id

    # Obtener perfil con rol
    profile = (
        supabase.table('profiles')
        .select('id, nombre, email, rol, establecimiento, habilitado')
        .eq('id', user_id)
        .single()
        .execute()
    )

    if not profile.data:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail='Perfil no encontrado')

    if not profile.data.get('habilitado', True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail='Usuario inhabilitado')

    return {**profile.data, 'token': token}


async def require_anl(user: dict = Depends(get_current_user)) -> dict:
    if user.get('rol') != 'ANL':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail='Se requiere rol ANL')
    return user


async def require_cli(user: dict = Depends(get_current_user)) -> dict:
    if user.get('rol') not in ('CLI', 'ANL'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail='Acceso no autorizado')
    return user
