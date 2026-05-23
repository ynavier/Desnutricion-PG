"""
Preprocesamiento y predicción ML.

Pipeline (mismo orden que en notebook 05):
  1. Codificar cod_dpto_o con LabelEncoder
  2. Imputar nulos con valores por defecto del entrenamiento
  3. Escalar columnas numéricas con RobustScaler
  4. Predecir con RandomForest (Modelo A si hay IMC, Modelo B si no)
"""

import numpy as np
import pandas as pd
from app.ml.loader import ml

FEATURES_A = [
    'edad_meses', 'per_etn_', 'estrato_', 'area_', 'cod_dpto_o',
    'niv_educat', 'menores', 'gp_pobicbf', 'peso_nac', 'edad_ges',
    'peso_act', 'per_braqui', 'imc',
    't_lechem', 'e_complem',
    'crec_dllo', 'esq_vac', 'carne_vac',
    'edema', 'delgadez', 'palidez', 'piel_rese', 'hiperpigm',
    'cambios_cabello', 'ruta_atenc',
]

FEATURES_B = [f for f in FEATURES_A if f != 'imc']

COLS_ESCALAR = ['peso_act', 'per_braqui', 't_lechem', 'menores',
                'peso_nac', 'edad_meses', 'imc', 'edad_ges', 'e_complem']

# Valores de imputación extraídos del entrenamiento (notebook 05)
IMPUTE_MODA = {
    'crec_dllo': 2.0, 'esq_vac': 1.0, 'carne_vac': 2.0,
    'edema': 2.0, 'delgadez': 1.0, 'palidez': 2.0,
    'piel_rese': 1.0, 'hiperpigm': 2.0, 'ruta_atenc': 1.0,
}

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
    Z-score peso/edad aproximado usando la ecuación OMS simplificada.
    Para producción usar tablas LMS completas de la OMS.
    Referencia: WHO Child Growth Standards (2006).
    """
    if not peso or not edad_meses or edad_meses > 60:
        return None

    # Medianas aproximadas por sexo y grupo de edad (WHO 2006, cada 6 meses)
    medianas_M = {0: 3.3, 6: 7.9, 12: 9.6, 18: 10.9, 24: 12.2,
                  30: 13.3, 36: 14.3, 42: 15.3, 48: 16.3, 54: 17.3, 60: 18.3}
    medianas_F = {0: 3.2, 6: 7.3, 12: 8.9, 18: 10.2, 24: 11.5,
                  30: 12.7, 36: 13.9, 42: 14.9, 48: 15.9, 54: 16.9, 60: 17.9}

    tabla = medianas_M if sexo == 'M' else medianas_F
    grupo = (edad_meses // 6) * 6
    grupo = min(grupo, 60)

    mediana = tabla.get(grupo)
    if not mediana:
        return None

    # Aproximación lineal del CV (coeficiente de variación OMS ~13%)
    cv = 0.13
    z  = (peso - mediana) / (mediana * cv)
    return round(z, 2)
