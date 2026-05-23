from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.ml.loader import load_models
from app.auth.router import router as auth_router
from app.routers.pacientes import router as pacientes_router
from app.routers.controles import router as controles_router
from app.routers.alertas import router as alertas_router
from app.routers.usuarios import router as usuarios_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_models()
    yield


app = FastAPI(
    title='NutriVigilancia API',
    description='Sistema de predicción y vigilancia de desnutrición infantil',
    version='1.0.0',
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(auth_router)
app.include_router(pacientes_router)
app.include_router(controles_router)
app.include_router(alertas_router)
app.include_router(usuarios_router)


@app.get('/')
async def root():
    return {
        'app': 'NutriVigilancia API',
        'version': '1.0.0',
        'status': 'ok',
    }


@app.get('/health')
async def health():
    from app.ml.loader import ml
    return {
        'status': 'ok',
        'modelos_cargados': ml.modelo_A is not None,
    }
