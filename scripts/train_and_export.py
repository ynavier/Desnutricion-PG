"""
train_and_export.py
-------------------
Entrena Random Forest (Modelo A con IMC y Modelo B sin IMC) usando el dataset
local data/processed/dataset_ml.csv y exporta todos los artefactos a models/.

Uso:
    python scripts/train_and_export.py

Requisitos:
    pip install scikit-learn imbalanced-learn joblib pandas numpy
"""

import sys
import json
import warnings
from pathlib import Path

import pandas as pd
import numpy as np
import joblib

from sklearn.preprocessing import LabelEncoder, RobustScaler
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import f1_score, classification_report
from imblearn.over_sampling import SMOTE

warnings.filterwarnings('ignore')

# ─── Rutas ────────────────────────────────────────────────────────────────────

ROOT      = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / 'data' / 'processed' / 'dataset_ml.csv'
MODELS_DIR = ROOT / 'models'
MODELS_DIR.mkdir(exist_ok=True)

CLASES = ['Desnut. severa', 'Desnut. moderada', 'Normal bajo',
          'Normal', 'Sobrepeso', 'Obesidad']

FEATURES_A = [
    'edad_meses', 'per_etn_', 'estrato_',
    'area_', 'cod_dpto_o',
    'niv_educat', 'menores', 'gp_pobicbf',
    'peso_nac', 'edad_ges',
    'peso_act', 'per_braqui', 'imc',
    't_lechem', 'e_complem',
    'crec_dllo', 'esq_vac', 'carne_vac',
    'edema', 'delgadez', 'palidez',
    'piel_rese', 'hiperpigm', 'cambios_cabello',
    'ruta_atenc',
]

FEATURES_B = [f for f in FEATURES_A if f != 'imc']

COLS_ESCALAR = ['peso_act', 'per_braqui', 't_lechem', 'menores',
                'peso_nac', 'edad_meses', 'imc', 'edad_ges', 'e_complem']


# ─── 1. Carga ─────────────────────────────────────────────────────────────────

def cargar_datos():
    print(f'Cargando datos desde: {DATA_PATH}')
    if not DATA_PATH.exists():
        sys.exit(f'ERROR: No se encontró {DATA_PATH}')

    df_raw = pd.read_csv(DATA_PATH)
    print(f'  Shape original: {df_raw.shape}')
    print(f'  Distribución clas_peso:\n{df_raw["clas_peso"].value_counts().sort_index().to_string()}')
    return df_raw


# ─── 2. Preprocesamiento ──────────────────────────────────────────────────────

def preprocesar(df_raw):
    df = df_raw.dropna(subset=['clas_peso']).copy()
    df['clas_peso'] = df['clas_peso'].astype(int)

    # Crear edad_meses
    df['edad_meses'] = df.apply(
        lambda r: r['edad_'] * 12 if r['uni_med_'] == 1 else r['edad_'], axis=1
    )

    faltantes = [f for f in FEATURES_A if f not in df.columns]
    if faltantes:
        sys.exit(f'ERROR: Features faltantes en el dataset: {faltantes}')

    df_model = df[FEATURES_A + ['clas_peso']].copy()

    # LabelEncoder para cod_dpto_o
    le_dpto = LabelEncoder()
    df_model['cod_dpto_o'] = le_dpto.fit_transform(df_model['cod_dpto_o'].astype(str))
    print(f'\nLabelEncoder cod_dpto_o: {len(le_dpto.classes_)} clases únicas')

    # Imputación estratificada (continuas)
    for col in ['per_braqui', 'niv_educat', 'menores', 't_lechem', 'e_complem']:
        if col in df_model.columns:
            df_model[col] = df_model.groupby('clas_peso')[col].transform(
                lambda x: x.fillna(x.median())
            )
            df_model[col] = df_model[col].fillna(df_model[col].median())

    # gp_pobicbf: valor por defecto 2 (No)
    df_model['gp_pobicbf'] = df_model['gp_pobicbf'].fillna(2)

    # Moda para variables binarias/categóricas
    for col in ['crec_dllo', 'esq_vac', 'carne_vac', 'edema', 'delgadez',
                'palidez', 'piel_rese', 'hiperpigm', 'ruta_atenc', 'cod_dpto_o']:
        if col in df_model.columns and df_model[col].isnull().any():
            df_model[col] = df_model[col].fillna(df_model[col].mode()[0])

    # Fallback general
    for col in df_model.columns:
        if df_model[col].isnull().any():
            df_model[col] = df_model[col].fillna(
                df_model[col].median() if df_model[col].dtype in ['float64', 'int64']
                else df_model[col].mode()[0]
            )

    nulos = df_model.isnull().sum().sum()
    print(f'Nulos tras imputación: {nulos}')
    assert nulos == 0, 'Aún hay nulos tras imputación'

    return df_model, le_dpto


# ─── 3. Escalar ───────────────────────────────────────────────────────────────

def escalar(df_model):
    X_A = df_model[FEATURES_A].copy()
    X_B = df_model[FEATURES_B].copy()
    y   = df_model['clas_peso'].copy()

    cols_A = [c for c in COLS_ESCALAR if c in FEATURES_A]
    cols_B = [c for c in COLS_ESCALAR if c in FEATURES_B]

    scaler_A = RobustScaler()
    X_A[cols_A] = scaler_A.fit_transform(X_A[cols_A])

    scaler_B = RobustScaler()
    X_B[cols_B] = scaler_B.fit_transform(X_B[cols_B])

    print(f'Escalado: Modelo A → {len(cols_A)} columnas | Modelo B → {len(cols_B)} columnas')
    return X_A, X_B, y, scaler_A, scaler_B


# ─── 4. Split + SMOTE ────────────────────────────────────────────────────────

def split_y_smote(X_A, X_B, y):
    X_train_A, X_test_A, y_train_A, y_test_A = train_test_split(
        X_A, y, test_size=0.2, random_state=42, stratify=y
    )
    X_train_B, X_test_B, y_train_B, y_test_B = train_test_split(
        X_B, y, test_size=0.2, random_state=42, stratify=y
    )

    smote = SMOTE(random_state=42, k_neighbors=3)
    X_train_A_sm, y_train_A_sm = smote.fit_resample(X_train_A, y_train_A)
    X_train_B_sm, y_train_B_sm = smote.fit_resample(X_train_B, y_train_B)

    print(f'Train: {len(y_train_A):,} → {len(y_train_A_sm):,} (tras SMOTE) | Test: {len(y_test_A):,}')
    return (X_train_A_sm, y_train_A_sm, X_test_A, y_test_A,
            X_train_B_sm, y_train_B_sm, X_test_B, y_test_B)


# ─── 5. Entrenar ─────────────────────────────────────────────────────────────

def entrenar(X_train_A, y_train_A, X_train_B, y_train_B):
    rf_params = dict(
        n_estimators=200, class_weight='balanced',
        max_depth=None, min_samples_leaf=2,
        random_state=42, n_jobs=-1
    )

    print('\nEntrenando Modelo A (Random Forest con IMC)...', end=' ', flush=True)
    modelo_A = RandomForestClassifier(**rf_params)
    modelo_A.fit(X_train_A, y_train_A)
    print('✅')

    print('Entrenando Modelo B (Random Forest sin IMC)...', end=' ', flush=True)
    modelo_B = RandomForestClassifier(**rf_params)
    modelo_B.fit(X_train_B, y_train_B)
    print('✅')

    return modelo_A, modelo_B


# ─── 6. Evaluar ───────────────────────────────────────────────────────────────

def evaluar(modelo, X_test, y_test, nombre):
    y_pred = modelo.predict(X_test)
    acc    = (y_pred == y_test).mean()
    f1_w   = f1_score(y_test, y_pred, average='weighted')
    f1_m   = f1_score(y_test, y_pred, average='macro')
    rec_s  = (y_pred[y_test == 1] == 1).mean() if (y_test == 1).sum() > 0 else 0

    print(f'\n── {nombre} ─────────────────────────────')
    print(f'  Accuracy      : {acc:.4f}')
    print(f'  F1-weighted   : {f1_w:.4f}')
    print(f'  F1-macro      : {f1_m:.4f}')
    print(f'  Recall severa : {rec_s:.4f}')
    return {'accuracy': float(round(acc, 4)), 'f1_weighted': float(round(f1_w, 4)),
            'f1_macro': float(round(f1_m, 4)), 'recall_severa': float(round(rec_s, 4))}


# ─── 7. Exportar ─────────────────────────────────────────────────────────────

def exportar(modelo_A, modelo_B, scaler_A, scaler_B, le_dpto, metricas_A, metricas_B):
    print(f'\n── Exportando a {MODELS_DIR} ───────────────────────────')

    joblib.dump(modelo_A,  MODELS_DIR / 'modelo_A_rf.joblib')
    print('  ✅ modelo_A_rf.joblib')

    joblib.dump(modelo_B,  MODELS_DIR / 'modelo_B_rf.joblib')
    print('  ✅ modelo_B_rf.joblib')

    joblib.dump(scaler_A,  MODELS_DIR / 'scaler_A.joblib')
    print('  ✅ scaler_A.joblib')

    joblib.dump(scaler_B,  MODELS_DIR / 'scaler_B.joblib')
    print('  ✅ scaler_B.joblib')

    joblib.dump(le_dpto,   MODELS_DIR / 'le_dpto.joblib')
    print('  ✅ le_dpto.joblib')

    metadata = {
        'version': '1.0.0',
        'fecha_entrenamiento': pd.Timestamp.now().isoformat(),
        'algoritmo': 'RandomForestClassifier',
        'target': 'clas_peso',
        'clases': {str(i + 1): nombre for i, nombre in enumerate(CLASES)},
        'modelo_A': {
            'descripcion': 'Con IMC — para clínicas con báscula y tallímetro',
            'n_features': len(FEATURES_A),
            'features': FEATURES_A,
            'cols_escalar': [c for c in COLS_ESCALAR if c in FEATURES_A],
            'metricas': metricas_A,
        },
        'modelo_B': {
            'descripcion': 'Sin IMC — fallback para zonas rurales',
            'n_features': len(FEATURES_B),
            'features': FEATURES_B,
            'cols_escalar': [c for c in COLS_ESCALAR if c in FEATURES_B],
            'metricas': metricas_B,
        },
        'preprocesamiento': {
            'cod_dpto_o': {
                'tipo': 'LabelEncoder',
                'clases': list(le_dpto.classes_),
                'codigos': [int(x) for x in le_dpto.transform(le_dpto.classes_)],
            },
            'imputacion': {
                'estratificada': ['per_braqui', 'niv_educat', 'menores', 't_lechem', 'e_complem'],
                'valor_fijo': {'gp_pobicbf': 2},
                'moda': ['crec_dllo', 'esq_vac', 'carne_vac', 'edema', 'delgadez',
                         'palidez', 'piel_rese', 'hiperpigm', 'ruta_atenc'],
            },
            'escalado': 'RobustScaler',
        },
    }

    with open(MODELS_DIR / 'model_metadata.json', 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    print('  ✅ model_metadata.json')


# ─── 8. Smoke test ────────────────────────────────────────────────────────────

def smoke_test(X_test_A):
    print('\n── Smoke test ──────────────────────────────────────────')
    modelo  = joblib.load(MODELS_DIR / 'modelo_A_rf.joblib')
    muestra = X_test_A.iloc[:1].copy()
    pred    = modelo.predict(muestra)
    proba   = modelo.predict_proba(muestra)

    clase_nombre = CLASES[pred[0] - 1]
    prob_desnut  = round(float(proba[0][0] + proba[0][1]), 3)

    print(f'  Clase predicha   : {pred[0]} → {clase_nombre}')
    print(f'  Prob. desnutrido : {prob_desnut}')
    print('  ✅ Smoke test OK')


# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print('=' * 60)
    print('  NutriVigilancia — Entrenamiento y exportación de modelos')
    print('=' * 60)

    df_raw                          = cargar_datos()
    df_model, le_dpto               = preprocesar(df_raw)
    X_A, X_B, y, scaler_A, scaler_B = escalar(df_model)

    (X_train_A, y_train_A, X_test_A, y_test_A,
     X_train_B, y_train_B, X_test_B, y_test_B) = split_y_smote(X_A, X_B, y)

    modelo_A, modelo_B = entrenar(X_train_A, y_train_A, X_train_B, y_train_B)

    metricas_A = evaluar(modelo_A, X_test_A, y_test_A, 'Modelo A (con IMC)')
    metricas_B = evaluar(modelo_B, X_test_B, y_test_B, 'Modelo B (sin IMC)')

    exportar(modelo_A, modelo_B, scaler_A, scaler_B, le_dpto, metricas_A, metricas_B)
    smoke_test(X_test_A)

    print('\n' + '=' * 60)
    print('  Exportación completada. Archivos en models/')
    print('=' * 60)
