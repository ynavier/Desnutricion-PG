import json
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
    Si no, carga los modelos RF por defecto.
    """
    d = Path(settings.models_dir)

    if model_record:
        arch_A = model_record.get('archivo_A', 'modelo_A_rf.joblib')
        arch_B = model_record.get('archivo_B', 'modelo_B_rf.joblib')
        sca_A  = model_record.get('scaler_A',  'scaler_A.joblib')
        sca_B  = model_record.get('scaler_B',  'scaler_B.joblib')
        ml.nombre_activo = model_record.get('nombre', 'Modelo personalizado')
    else:
        arch_A, arch_B = 'modelo_A_rf.joblib', 'modelo_B_rf.joblib'
        sca_A,  sca_B  = 'scaler_A.joblib',    'scaler_B.joblib'

    ml.modelo_A = joblib.load(d / arch_A)
    ml.modelo_B = joblib.load(d / arch_B)
    ml.scaler_A = joblib.load(d / sca_A)
    ml.scaler_B = joblib.load(d / sca_B)
    ml.le_dpto  = joblib.load(d / 'le_dpto.joblib')

    with open(d / 'model_metadata.json', encoding='utf-8') as f:
        ml.metadata = json.load(f)

    print(f'[ML] Modelos cargados — A: {arch_A} | B: {arch_B}', flush=True)
    print(f'     Métricas A: {ml.metadata["modelo_A"]["metricas"]}', flush=True)
    print(f'     Métricas B: {ml.metadata["modelo_B"]["metricas"]}', flush=True)
