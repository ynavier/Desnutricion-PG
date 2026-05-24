from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.database import supabase, supabase_anon

router = APIRouter(prefix='/auth', tags=['auth'])


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: dict


@router.post('/login', response_model=LoginResponse)
async def login(body: LoginRequest):
    try:
        response = supabase_anon.auth.sign_in_with_password({
            'email': body.email,
            'password': body.password,
        })
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail='Credenciales incorrectas')

    if not response.session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail='Credenciales incorrectas')

    user_id = response.user.id
    token   = response.session.access_token

    profile = (
        supabase.table('profiles')
        .select('id, nombre, email, rol, establecimiento')
        .eq('id', user_id)
        .single()
        .execute()
    )

    if not profile.data:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail='Perfil no encontrado. Contacte al administrador.')

    if not profile.data.get('habilitado', True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail='Usuario inhabilitado')

    return LoginResponse(
        access_token=token,
        user=profile.data,
    )


@router.post('/logout')
async def logout():
    try:
        supabase.auth.sign_out()
    except Exception:
        pass
    return {'message': 'Sesión cerrada'}
