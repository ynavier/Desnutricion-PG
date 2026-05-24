import joblib
import numpy as np
from pathlib import Path
from app.config import settings


class MLModels:
    modelo_A = None       # Modelo con IMC
    modelo_B = None       # Modelo sin IMC
    scaler_A = None
    scaler_B = None
    le_dpto  = None
    metadata: dict = {}
    nombre_activo: str = 'Random Forest v1'


ml = MLModels()


def load_models(model_record: dict | None = None):
    """
    Carga los modelos ML desde disco.
    Si se proporciona model_record (desde la BD), usa sus archivos.
    Las claves del record vienen en minúsculas desde Supabase/PostgreSQL.
    Si no hay record, carga los modelos RF por defecto.
    """
    d = Path(settings.models_dir)

    if model_record:
        # PostgreSQL devuelve columnas en minúsculas
        arch_A = model_record.get('archivo_a') or model_record.get('archivo_A', 'modelo_A_rf.joblib')
        arch_B = model_record.get('archivo_b') or model_record.get('archivo_B', 'modelo_B_rf.joblib')
        sca_A  = model_record.get('scaler_a')  or model_record.get('scaler_A',  'scaler_A.joblib')
        sca_B  = model_record.get('scaler_b')  or model_record.get('scaler_B',  'scaler_B.joblib')
        ml.nombre_activo = model_record.get('nombre', 'Modelo personalizado')

        # le_dpto guardado dentro del JSON metricas
        metricas = model_record.get('metricas') or {}
        le_f = metricas.get('le_dpto')

        # Fallback: buscar el le_dpto más reciente en disco
        if not le_f or not (d / le_f).exists():
            candidatos = sorted(d.glob('le_dpto_*.joblib'), key=lambda f: f.stat().st_mtime, reverse=True)
            le_f = candidatos[0].name if candidatos else 'le_dpto.joblib'
    else:
        arch_A, arch_B = 'modelo_A_rf.joblib', 'modelo_B_rf.joblib'
        sca_A,  sca_B  = 'scaler_A.joblib',    'scaler_B.joblib'
        le_f           = 'le_dpto.joblib'

    ml.modelo_A = joblib.load(d / arch_A)
    ml.modelo_B = joblib.load(d / arch_B)
    ml.scaler_A = joblib.load(d / sca_A)
    ml.scaler_B = joblib.load(d / sca_B)
    ml.le_dpto  = joblib.load(d / le_f)

    print(f'[ML] Modelos cargados — A: {arch_A} | B: {arch_B}', flush=True)
    print(f'[ML] Scaler A: {sca_A} | Scaler B: {sca_B} | LE dpto: {le_f}', flush=True)
