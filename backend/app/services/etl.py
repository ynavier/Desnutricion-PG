"""
ETL para datasets SIVIGILA (Reporte 113 — Desnutrición aguda).

Pipeline COMPLETO alineado con notebook 03_etl_limpieza_datos.ipynb:
  1.  Leer Excel
  2.  Fix coma decimal → float
  3.  Filtrar solo pediátricos (≤5 años)  [Cell 10]
  4.  Ceros clínicos → NaN               [Cell 14]
  5.  Outliers físicos: peso_act [1-25], talla_act [45-150], imc [10-30]  [Cell 17-21]
  6.  Eliminar clas_peso == 7            [Cell 27]
  7.  Validación coherencia edad/fecha   [Cell 37]  — solo si las columnas existen
  8.  Calcular edad_meses
  9.  Imputación: per_braqui, niv_educat, menores, t_lechem, e_complem → mediana estratif.
  10. Imputación: peso_nac por grupo edad_ges; edad_ges → mediana  [Cell 41]
  11. estrato_ → fillna(0).astype(int)   [Cell 41]
  12. gp_pobicbf → fillna(2)
  13. Moda para binarias/categóricas
  14. Fallback general (mediana / moda)
  15. Int64 para columnas enteras        [Cell 29]
  16. Seleccionar columnas ML + dropna

También expone `etl_db_records()` para convertir registros de la BD al mismo formato.
"""

from __future__ import annotations
import warnings
from pathlib import Path
from datetime import date

import numpy as np
import pandas as pd

warnings.filterwarnings('ignore')

# ── Columnas ML ───────────────────────────────────────────────────────────────

FEATURES_A = [
    'edad_meses', 'per_etn_', 'estrato_', 'area_', 'cod_dpto_o',
    'niv_educat', 'menores', 'gp_pobicbf', 'peso_nac', 'edad_ges',
    'peso_act', 'per_braqui', 'imc',
    't_lechem', 'e_complem',
    'crec_dllo', 'esq_vac', 'carne_vac',
    'edema', 'delgadez', 'palidez', 'piel_rese', 'hiperpigm',
    'cambios_cabello', 'ruta_atenc',
]
FEATURES_B    = [f for f in FEATURES_A if f != 'imc']
TARGET        = 'clas_peso'
ALL_COLS      = FEATURES_A + [TARGET]

COLS_ESC_A   = ['peso_act', 'per_braqui', 't_lechem', 'menores',
                'peso_nac', 'edad_meses', 'imc', 'edad_ges', 'e_complem']
COLS_ESC_B   = [c for c in COLS_ESC_A if c != 'imc']

IMPUTE_MODA  = {
    'crec_dllo': 2.0, 'esq_vac': 1.0, 'carne_vac': 2.0,
    'edema': 2.0, 'delgadez': 1.0, 'palidez': 2.0,
    'piel_rese': 1.0, 'hiperpigm': 2.0, 'ruta_atenc': 1.0,
    'cambios_cabello': 2.0,
}

# Columnas que deben castearse a Int64 (entero nullable de pandas)
_COLS_INT64 = [
    'per_etn_', 'estrato_', 'area_', 'niv_educat', 'menores', 'gp_pobicbf',
    'crec_dllo', 'esq_vac', 'carne_vac',
    'edema', 'delgadez', 'palidez', 'piel_rese', 'hiperpigm',
    'cambios_cabello', 'ruta_atenc', 'e_complem', 't_lechem',
]

# Columnas numéricas que pueden llegar con coma decimal en SIVIGILA (formato es-CO)
_COLS_NUMERICAS = [
    'peso_act', 'talla_act', 'talla_nac', 'per_braqui', 'imc',
    'zscore_pt', 'zscore_te',
    'peso_nac', 'edad_ges', 't_lechem', 'e_complem', 'menores',
    'niv_educat', 'estrato_', 'edad_',
]

# Columnas clínicas donde 0 es fisiológicamente imposible → tratar como NaN
_COLS_CERO_NAN = ['peso_nac', 'talla_nac', 'per_braqui', 'edad_ges']


def _fix_coma_decimal(df: pd.DataFrame) -> pd.DataFrame:
    """Convierte columnas con coma decimal (ej. '11,5') a float."""
    for col in _COLS_NUMERICAS:
        if col not in df.columns:
            continue
        if df[col].dtype == object:
            df[col] = pd.to_numeric(
                df[col].astype(str).str.strip().str.replace(',', '.', regex=False),
                errors='coerce',
            )
    return df


# ── ETL SIVIGILA ──────────────────────────────────────────────────────────────

def etl_sivigila(ruta: Path) -> tuple[pd.DataFrame, dict]:
    """
    Lee un Excel SIVIGILA y devuelve (df_ml, stats).
    df_ml contiene FEATURES_A + 'clas_peso' sin nulos.

    Pipeline alineado con notebook 03_etl_limpieza_datos.ipynb.
    stats = { 'filas_raw': int, 'filas_proc': int, 'clases': dict }
    """
    # ── 1. Leer + fix coma decimal ─────────────────────────────────────────────
    df = pd.read_excel(ruta)
    filas_raw = len(df)
    df = _fix_coma_decimal(df)

    # ── 2. Filtro pediátrico ≤5 años  [Cell 10] ────────────────────────────────
    if 'uni_med_' in df.columns and 'edad_' in df.columns:
        df['edad_'] = pd.to_numeric(df['edad_'], errors='coerce')
        mask_pedi = (
            (df['uni_med_'] == 2) |
            ((df['uni_med_'] == 1) & (df['edad_'] <= 5))
        )
        df = df[mask_pedi].copy()

    # ── 3. Ceros clínicos → NaN  [Cell 14] ────────────────────────────────────
    for col in _COLS_CERO_NAN:
        if col in df.columns:
            df[col] = df[col].replace(0, float('nan'))

    # ── 4. Outliers físicos  [Cell 17-21] ──────────────────────────────────────
    if 'peso_act' in df.columns:
        df = df[(df['peso_act'] >= 1) & (df['peso_act'] <= 25)].copy()
    if 'talla_act' in df.columns:
        df = df[(df['talla_act'] >= 45) & (df['talla_act'] <= 150)].copy()
    if 'imc' in df.columns:
        df = df[df['imc'].isna() | ((df['imc'] >= 10) & (df['imc'] <= 30))].copy()

    # ── 5. Eliminar sin clas_peso + clas_peso == 7  [Cell 27] ─────────────────
    df = df.dropna(subset=['clas_peso']).copy()
    df['clas_peso'] = pd.to_numeric(df['clas_peso'], errors='coerce')
    df = df.dropna(subset=['clas_peso'])
    df['clas_peso'] = df['clas_peso'].astype(int)
    df = df[df['clas_peso'] != 7].copy()

    # ── 6. Validación coherencia edad vs fecha nacimiento  [Cell 37] ───────────
    # Elimina registros donde la edad registrada difiere > 1 año de la calculada
    # a partir de fec_not - fecha_nto_. Opcional: solo si las columnas existen.
    cols_fecha_req = ['fec_not', 'fecha_nto_', 'edad_', 'uni_med_']
    if all(c in df.columns for c in cols_fecha_req):
        df['fec_not']    = pd.to_datetime(df['fec_not'],    dayfirst=True, errors='coerce')
        df['fecha_nto_'] = pd.to_datetime(df['fecha_nto_'], dayfirst=True, errors='coerce')
        mask_fechas_ok = df['fec_not'].notna() & df['fecha_nto_'].notna()
        if mask_fechas_ok.any():
            df_val = df.copy()
            df_val['_edad_calc'] = (df_val['fec_not'] - df_val['fecha_nto_']).dt.days / 365
            df_val['_edad_anios'] = df_val['edad_'].where(
                df_val['uni_med_'] == 1, df_val['edad_'] / 12
            )
            mask_coherente = (
                ~mask_fechas_ok |
                (abs(df_val['_edad_anios'] - df_val['_edad_calc']) < 1)
            )
            df = df[mask_coherente].copy()

    # ── 7. Calcular edad_meses ─────────────────────────────────────────────────
    if 'uni_med_' in df.columns and 'edad_' in df.columns:
        df['edad_meses'] = df.apply(
            lambda r: r['edad_'] * 12 if r['uni_med_'] == 1 else r['edad_'],
            axis=1,
        )
    elif 'edad_meses' not in df.columns:
        df['edad_meses'] = np.nan

    # ── 8. Verificar columnas necesarias ───────────────────────────────────────
    faltantes = [c for c in ALL_COLS if c not in df.columns]
    if faltantes:
        raise ValueError(f'Columnas faltantes en el Excel: {faltantes}')

    df_ml = df[ALL_COLS].copy()

    # Forzar numérico (strings residuales → NaN)
    for col in FEATURES_A:
        if col != 'cod_dpto_o':
            df_ml[col] = pd.to_numeric(df_ml[col], errors='coerce')

    # ── 9. estrato_ → 0 si desconocido  [Cell 41] ─────────────────────────────
    df_ml['estrato_'] = (
        pd.to_numeric(df_ml['estrato_'], errors='coerce')
        .fillna(0)
        .astype(int)
    )

    # ── 10. Imputación estratificada variables continuas ───────────────────────
    for col in ['per_braqui', 'niv_educat', 'menores', 't_lechem', 'e_complem']:
        if col in df_ml.columns:
            df_ml[col] = df_ml.groupby(TARGET)[col].transform(
                lambda x: x.fillna(x.median())
            )
            df_ml[col] = df_ml[col].fillna(df_ml[col].median())

    # ── 11. peso_nac por grupo edad_ges; edad_ges → mediana  [Cell 41] ─────────
    if 'peso_nac' in df_ml.columns and 'edad_ges' in df_ml.columns:
        df_ml['peso_nac'] = df_ml.groupby('edad_ges')['peso_nac'].transform(
            lambda x: x.fillna(x.median())
        )
        df_ml['peso_nac'] = df_ml['peso_nac'].fillna(df_ml['peso_nac'].median())

    if 'edad_ges' in df_ml.columns:
        df_ml['edad_ges'] = df_ml['edad_ges'].fillna(df_ml['edad_ges'].median())

    # ── 12. gp_pobicbf → 2 por defecto ────────────────────────────────────────
    df_ml['gp_pobicbf'] = df_ml['gp_pobicbf'].fillna(2)

    # ── 13. Moda para binarias / categóricas ───────────────────────────────────
    for col, val in IMPUTE_MODA.items():
        if col in df_ml.columns:
            df_ml[col] = df_ml[col].fillna(val)

    # ── 14. Fallback general ───────────────────────────────────────────────────
    for col in df_ml.columns:
        if df_ml[col].isnull().any():
            if df_ml[col].dtype in ['float64', 'int64']:
                med = df_ml[col].median()
                df_ml[col] = df_ml[col].fillna(med if pd.notna(med) else 0)
            else:
                moda = df_ml[col].mode()
                df_ml[col] = df_ml[col].fillna(moda[0] if len(moda) else 0)

    df_ml = df_ml.dropna()

    # ── 15. Castear columnas enteras a Int64  [Cell 29] ────────────────────────
    for col in _COLS_INT64:
        if col in df_ml.columns:
            try:
                df_ml[col] = pd.to_numeric(df_ml[col], errors='coerce').astype('Int64')
            except Exception:
                pass

    filas_proc = len(df_ml)

    stats = {
        'filas_raw':  filas_raw,
        'filas_proc': filas_proc,
        'clases':     {int(k): int(v) for k, v in df_ml[TARGET].value_counts().to_dict().items()},
    }
    return df_ml, stats


# ── ETL registros de la BD ────────────────────────────────────────────────────

def etl_db_records(
    controles: list[dict],
    pacientes: dict[int, dict],
    filtros: dict | None = None,
) -> pd.DataFrame:
    """
    Convierte registros de la BD al mismo formato que etl_sivigila().

    controles: lista de dicts desde la tabla 'controles'
    pacientes: {id: dict} desde la tabla 'pacientes'
    filtros:   { 'fecha_desde': 'YYYY-MM-DD', 'fecha_hasta': ...,
                 'municipios': ['X', 'Y'], 'area': 1|2 }
    """
    filtros     = filtros or {}
    fecha_desde = filtros.get('fecha_desde')
    fecha_hasta = filtros.get('fecha_hasta')
    municipios  = set(filtros.get('municipios') or [])
    area_fil    = filtros.get('area')

    rows = []
    for c in controles:
        if not c.get('clas_peso_pred'):
            continue

        fecha_c = c.get('fecha', '')
        if fecha_desde and fecha_c < fecha_desde:
            continue
        if fecha_hasta and fecha_c > fecha_hasta:
            continue

        p = pacientes.get(c['paciente_id'])
        if not p:
            continue

        mun = p.get('municipio_res') or ''
        if municipios and mun not in municipios:
            continue

        area_p = p.get('area_')
        if area_fil and area_p != area_fil:
            continue

        # Calcular edad_meses en la fecha del control
        try:
            fctl = date.fromisoformat(fecha_c)
            fnac = date.fromisoformat(p['fecha_nac'])
            em   = (fctl.year - fnac.year) * 12 + (fctl.month - fnac.month)
        except Exception:
            em = np.nan

        row = {
            'edad_meses':      em,
            'per_etn_':        p.get('per_etn_'),
            'estrato_':        p.get('estrato_') or 0,
            'area_':           area_p,
            'cod_dpto_o':      str(p.get('cod_dpto_o') or 'nan'),
            'niv_educat':      p.get('niv_educat'),
            'menores':         p.get('menores'),
            'gp_pobicbf':      p.get('gp_pobicbf') or 2,
            'peso_nac':        p.get('peso_nac') or np.nan,
            'edad_ges':        p.get('edad_ges'),
            'peso_act':        c.get('peso_act'),
            'per_braqui':      c.get('per_braqui'),
            'imc':             c.get('imc'),
            't_lechem':        p.get('t_lechem'),
            'e_complem':       p.get('e_complem'),
            'crec_dllo':       p.get('crec_dllo'),
            'esq_vac':         p.get('esq_vac'),
            'carne_vac':       p.get('carne_vac'),
            'edema':           c.get('edema'),
            'delgadez':        c.get('delgadez'),
            'palidez':         c.get('palidez'),
            'piel_rese':       c.get('piel_rese'),
            'hiperpigm':       c.get('hiperpigm'),
            'cambios_cabello': c.get('cambios_cabello'),
            'ruta_atenc':      c.get('ruta_atenc'),
            'clas_peso':       c['clas_peso_pred'],
        }
        rows.append(row)

    if not rows:
        return pd.DataFrame(columns=ALL_COLS)

    df = pd.DataFrame(rows)

    # Ceros clínicos → NaN
    for col in _COLS_CERO_NAN:
        if col in df.columns:
            df[col] = df[col].replace(0, float('nan'))

    # Outliers físicos (mismos rangos del notebook)
    if 'peso_act' in df.columns:
        df = df[(df['peso_act'] >= 1) & (df['peso_act'] <= 25)].copy()
    if 'imc' in df.columns:
        df = df[df['imc'].isna() | ((df['imc'] >= 10) & (df['imc'] <= 30))].copy()

    # clas_peso == 7
    df = df[df['clas_peso'] != 7].copy()

    # Imputación continuas
    for col in ['per_braqui', 'niv_educat', 'menores', 't_lechem', 'e_complem']:
        if col in df.columns:
            med = df[col].median()
            df[col] = df[col].fillna(med if pd.notna(med) else 0)

    # peso_nac por grupo edad_ges; edad_ges → mediana
    if 'peso_nac' in df.columns and 'edad_ges' in df.columns:
        df['peso_nac'] = df.groupby('edad_ges')['peso_nac'].transform(
            lambda x: x.fillna(x.median())
        )
        df['peso_nac'] = df['peso_nac'].fillna(df['peso_nac'].median())

    if 'edad_ges' in df.columns:
        df['edad_ges'] = df['edad_ges'].fillna(df['edad_ges'].median())

    df['gp_pobicbf'] = df['gp_pobicbf'].fillna(2)
    for col, val in IMPUTE_MODA.items():
        if col in df.columns:
            df[col] = df[col].fillna(val)

    for col in df.columns:
        if df[col].isnull().any():
            if df[col].dtype in ['float64', 'int64']:
                med = df[col].median()
                df[col] = df[col].fillna(med if pd.notna(med) else 0)

    # Int64
    for col in _COLS_INT64:
        if col in df.columns:
            try:
                df[col] = pd.to_numeric(df[col], errors='coerce').astype('Int64')
            except Exception:
                pass

    return df.dropna()
