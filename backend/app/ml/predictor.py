"""
Preprocesamiento y predicción ML.

Pipeline (mismo orden que en notebook 05):
  1. Codificar cod_dpto_o con LabelEncoder
  2. Imputar nulos con valores por defecto del entrenamiento
  3. Escalar columnas numéricas con RobustScaler
  4. Predecir con RandomForest (Modelo A si hay IMC, Modelo B si no)

IMPORTANTE: FEATURES_A/B, COLS_ESCALAR e IMPUTE_MODA se importan de etl.py
para garantizar que predictor y entrenamiento siempre usen las mismas columnas.
"""

import numpy as np
import pandas as pd
from app.ml.loader import ml
from app.ml.who_tables import calcular_zscore_who
from app.services.etl import FEATURES_A, FEATURES_B, COLS_ESC_A as COLS_ESCALAR, IMPUTE_MODA

CLASES = {
    1: 'Desnut. severa',
    2: 'Desnut. moderada',
    3: 'Normal bajo',
    4: 'Normal',
    5: 'Sobrepeso',
    6: 'Obesidad',
}

# Mapeo departamento textual → código SIVIGILA (dataset Colombia)
# Valores no reconocidos caen en clase 'nan' del LabelEncoder
DEPT_A_CODIGO = {
    'Bogotá': '11', 'Boyacá': '15', 'Cesar': '20',
    'Cundinamarca': '25', 'La Guajira': '44',
    'Magdalena': '47', 'Nariño': '52', 'Santander': '68',
}


def _encode_dpto(valor: str | None) -> int:
    codigo = DEPT_A_CODIGO.get(str(valor or ''), str(valor or ''))
    clases = list(ml.le_dpto.classes_)
    if codigo in clases:
        return int(ml.le_dpto.transform([codigo])[0])
    # desconocido → usar clase 'nan' (última del encoder)
    return int(ml.le_dpto.transform(['nan'])[0]) if 'nan' in clases else len(clases) - 1


def predecir(datos: dict) -> dict:
    """
    datos: dict con claves equivalentes a las columnas del dataset.
           Mínimo requerido: edad_meses, peso_act.
           Si talla_act está presente, se calcula IMC y se usa Modelo A.
    Retorna: dict con predicción, probabilidades, modelo usado.
    """
    if ml.modelo_A is None or ml.modelo_B is None:
        raise RuntimeError(
            'No hay ningún modelo cargado. '
            'Ve al panel ANL → Modelos ML, entrena un modelo y actívalo.'
        )

    peso  = float(datos.get('peso_act', 0))
    talla = float(datos.get('talla_act') or 0)

    usar_a = talla > 0
    imc    = round(peso / (talla / 100) ** 2, 2) if usar_a else None

    features = FEATURES_A if usar_a else FEATURES_B
    modelo   = ml.modelo_A if usar_a else ml.modelo_B
    scaler   = ml.scaler_A if usar_a else ml.scaler_B

    # Construir fila con todos los features
    fila = {}
    for f in features:
        fila[f] = datos.get(f, np.nan)

    # Valores calculados / derivados
    fila['imc'] = imc if usar_a else None
    fila['cod_dpto_o'] = _encode_dpto(datos.get('cod_dpto_o'))

    # Imputar moda del entrenamiento
    fila['gp_pobicbf'] = fila.get('gp_pobicbf') or 2
    for col, val_moda in IMPUTE_MODA.items():
        if col in fila and (fila[col] is None or np.isnan(float(fila[col] if fila[col] is not None else np.nan))):
            fila[col] = val_moda

    df = pd.DataFrame([{f: fila.get(f, np.nan) for f in features}])

    # Escalar columnas numéricas
    cols_esc = [c for c in COLS_ESCALAR if c in features]
    df[cols_esc] = scaler.transform(df[cols_esc])

    # Predecir
    pred  = int(modelo.predict(df)[0])
    proba = modelo.predict_proba(df)[0]

    prob_por_clase   = {int(c): round(float(p), 4) for c, p in zip(modelo.classes_, proba)}
    prob_desnutrido  = round(float(prob_por_clase.get(1, 0) + prob_por_clase.get(2, 0)), 4)
    confianza        = round(float(max(proba)), 4)

    return {
        'clas_peso':       pred,
        'clas_nombre':     CLASES.get(pred, 'Desconocido'),
        'prob_desnutrido': prob_desnutrido,
        'probabilidades':  prob_por_clase,
        'confianza':       confianza,
        'modelo_usado':    'Modelo A (con IMC)' if usar_a else 'Modelo B (sin IMC)',
        'imc_calculado':   imc,
    }


def calcular_zscore(peso: float, edad_meses: int, sexo: str) -> float | None:
    """
    Z-score Peso/Edad (WAZ) usando tablas LMS OMS 2006.
    Delega a who_tables.calcular_zscore_who con resolución mensual completa.
    """
    return calcular_zscore_who(peso, edad_meses, sexo)
