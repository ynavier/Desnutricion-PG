from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.ml.loader import load_models, ml
from app.database import supabase
from app.auth.router import router as auth_router
from app.routers.pacientes import router as pacientes_router
from app.routers.controles import router as controles_router
from app.routers.alertas import router as alertas_router
from app.routers.usuarios import router as usuarios_router
from app.routers.recomendaciones import router as recomendaciones_router
from app.routers.modelos import router as modelos_router
from app.routers.estadisticas import router as estadisticas_router
from app.routers.entrenamiento import router as entrenamiento_router
from app.routers.datasets import router as datasets_router
from app.routers.reportes import router as reportes_router
from app.routers.chat        import router as chat_router
from app.routers.analisis_ia   import router as analisis_ia_router
from app.routers.compartir     import router as compartir_router
from app.routers.proyecciones  import router as proyecciones_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Buscar el modelo activo en BD y cargarlo
    #    Si falla (tabla vacía, error de red, etc.) usa los archivos RF por defecto
    modelo_activo = None
    try:
        res = (
            supabase.table('modelos_ml')
            .select('*')
            .eq('activo', True)
            .limit(1)
            .execute()
        )
        if res.data:
            modelo_activo = res.data[0]
            print(f'[ML] Modelo activo en BD: "{modelo_activo["nombre"]}"', flush=True)
    except Exception as e:
        print(f'[ML] No se pudo consultar modelo activo en BD: {e}', flush=True)

    try:
        load_models(modelo_activo)
    except Exception as e:
        print(f'[ML] ⚠ No se pudieron cargar los modelos: {e}', flush=True)
        print('[ML] El backend arrancará sin modelos cargados. '
              'Activa un modelo desde el panel ANL → Modelos ML.', flush=True)

    yield


app = FastAPI(
    title='NutriVigilancia API',
    description='Sistema de predicción y vigilancia de desnutrición infantil',
    version='1.0.0',
    lifespan=lifespan,
    redirect_slashes=False,
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
app.include_router(recomendaciones_router)
app.include_router(modelos_router)
app.include_router(estadisticas_router)
app.include_router(entrenamiento_router)
app.include_router(datasets_router)
app.include_router(reportes_router)
app.include_router(chat_router)
app.include_router(analisis_ia_router)
app.include_router(proyecciones_router)
app.include_router(compartir_router)


@app.get('/')
async def root():
    return {
        'app':     'NutriVigilancia API',
        'version': '1.0.0',
        'status':  'ok',
    }


@app.get('/health')
async def health():
    return {
        'status':          'ok',
        'modelos_cargados': ml.modelo_A is not None,
        'modelo_activo':   ml.nombre_activo,
        'ia_habilitada':   bool(settings.google_api_key),
    }
