import json
import joblib
import numpy as np
from pathlib import Path
from app.config import settings


class MLModels:
    modelo_A = None       # Random Forest con IMC
    modelo_B = None       # Random Forest sin IMC
    scaler_A = None
    scaler_B = None
    le_dpto  = None
    metadata: dict = {}


ml = MLModels()


def load_models():
    d = Path(settings.models_dir)

    ml.modelo_A = joblib.load(d / 'modelo_A_rf.joblib')
    ml.modelo_B = joblib.load(d / 'modelo_B_rf.joblib')
    ml.scaler_A = joblib.load(d / 'scaler_A.joblib')
    ml.scaler_B = joblib.load(d / 'scaler_B.joblib')
    ml.le_dpto  = joblib.load(d / 'le_dpto.joblib')

    with open(d / 'model_metadata.json', encoding='utf-8') as f:
        ml.metadata = json.load(f)

    print(f'[OK] Modelos ML cargados desde {d.resolve()}')
    print(f'     Modelo A: {ml.metadata["modelo_A"]["metricas"]}')
    print(f'     Modelo B: {ml.metadata["modelo_B"]["metricas"]}')
