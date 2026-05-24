"""
Servicio de entrenamiento ML.

Fuentes de datos (combinables):
  1. Datasets SIVIGILA habilitados en la tabla datasets_ml  (CSV procesados por ETL)
  2. Registros de la BD (pacientes + controles) con filtros opcionales + ETL

Pipeline:
  LabelEncoder(cod_dpto_o) → RobustScaler → SMOTE (si hay suficientes datos) → fit → CV → guardar
"""

from __future__ import annotations

import asyncio
import json
import uuid
import joblib
import numpy as np
import pandas as pd

from datetime import datetime
from pathlib import Path

from sklearn.ensemble import (
    RandomForestClassifier,
    GradientBoostingClassifier,
    HistGradientBoostingClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder, RobustScaler
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import accuracy_score, f1_score

from app.config import settings
from app.database import supabase
from app.services.etl import etl_db_records, FEATURES_A, FEATURES_B, TARGET, COLS_ESC_A, COLS_ESC_B

# ── Tipos de modelo ────────────────────────────────────────────────────────────

NOMBRE_LEGIBLE = {
    'rf':  'Random Forest',
    'xgb': 'XGBoost (HistGB)',
    'gb':  'Gradient Boosting',
    'lr':  'Regresión Logística',
}


def _make_model(tipo: str, params: dict):
    if tipo == 'rf':
        return RandomForestClassifier(
            n_estimators      = int(params.get('n_estimators', 100)),
            max_depth         = int(params.get('max_depth', 10)) or None,
            min_samples_split = int(params.get('min_samples_split', 2)),
            max_features      = params.get('max_features', 'sqrt'),
            class_weight      = 'balanced',
            random_state      = 42, n_jobs=-1,
        )
    if tipo == 'xgb':
        return HistGradientBoostingClassifier(
            max_iter         = int(params.get('n_estimators', 200)),
            learning_rate    = float(params.get('learning_rate', 0.1)),
            max_depth        = int(params.get('max_depth', 6)) or None,
            min_samples_leaf = 20,
            random_state     = 42,
        )
    if tipo == 'gb':
        return GradientBoostingClassifier(
            n_estimators     = int(params.get('n_estimators', 150)),
            learning_rate    = float(params.get('learning_rate', 0.05)),
            max_depth        = int(params.get('max_depth', 5)),
            min_samples_leaf = int(params.get('min_samples_leaf', 4)),
            random_state     = 42,
        )
    if tipo == 'lr':
        return LogisticRegression(
            C           = float(params.get('C', 1.0)),
            max_iter    = int(params.get('max_iter', 200)),
            solver      = params.get('solver', 'lbfgs'),
            class_weight= 'balanced',
            random_state= 42, n_jobs=-1,
        )
    raise ValueError(f'Tipo desconocido: {tipo}')


# ── Jobs en memoria ────────────────────────────────────────────────────────────

_jobs: dict[str, dict] = {}

MAX_VERSIONS_DEFAULT = 3   # máximo de versiones por tipo de modelo que se conservan


def _limpiar_modelos_viejos(tipo: str, mantener: int, job: dict):
    """
    Borra los modelos más antiguos del mismo tipo (no activos) para que
    no queden más de `mantener` versiones por tipo en la BD.
    """
    try:
        res = (
            supabase.table('modelos_ml')
            .select('id, archivo_a, archivo_b, scaler_a, scaler_b, metricas, activo')
            .eq('tipo', tipo)
            .order('created_at', desc=False)   # más viejos primero
            .execute()
        )
        todos   = res.data or []
        activos = [m for m in todos if m.get('activo')]
        resto   = [m for m in todos if not m.get('activo')]

        # Cuántos sobran (el modelo recién insertado ya está en `todos`)
        total   = len(todos)
        sobran  = total - mantener

        if sobran <= 0:
            return

        # Borrar solo los no-activos más viejos
        a_borrar = resto[:sobran]
        d = Path(settings.models_dir)

        for m in a_borrar:
            for col in ['archivo_a', 'archivo_b', 'scaler_a', 'scaler_b']:
                fname = m.get(col)
                if fname:
                    f = d / fname
                    if f.exists():
                        f.unlink(missing_ok=True)
            met = m.get('metricas') or {}
            le_f = met.get('le_dpto')
            if le_f:
                f = d / le_f
                if f.exists():
                    f.unlink(missing_ok=True)

            supabase.table('modelos_ml').delete().eq('id', m['id']).execute()
            _log(job, f'Auto-limpieza: eliminada versión antigua #{m["id"]} ({tipo})')

    except Exception as e:
        _log(job, f'Auto-limpieza omitida: {e}')


def get_job(job_id: str) -> dict | None:
    return _jobs.get(job_id)


def _log(job: dict, msg: str):
    job['log'].append(msg)
    print(f'[TRAIN] {msg}', flush=True)


def _pct(job: dict, v: int):
    job['progreso'] = v


# ── Carga de datos ─────────────────────────────────────────────────────────────

def _cargar_datasets_habilitados() -> pd.DataFrame:
    """Lee los CSV procesados de todos los datasets habilitados."""
    res = (
        supabase.table('datasets_ml')
        .select('id, nombre, archivo_proc, filas_proc')
        .eq('habilitado', True)
        .eq('estado', 'procesado')
        .execute()
    )
    datasets = res.data or []
    if not datasets:
        return pd.DataFrame()

    partes: list[pd.DataFrame] = []
    proc_dir = Path(settings.data_proc_dir)
    for ds in datasets:
        archivo = ds.get('archivo_proc')
        if not archivo:
            continue
        ruta = proc_dir / archivo
        if ruta.exists():
            df = pd.read_csv(ruta)
            partes.append(df)

    return pd.concat(partes, ignore_index=True) if partes else pd.DataFrame()


def _cargar_db(filtros: dict | None) -> pd.DataFrame:
    """Carga controles de la BD y aplica ETL."""
    c_res = supabase.table('controles').select(
        'id, paciente_id, fecha, peso_act, talla_act, per_braqui, imc, '
        'edema, delgadez, palidez, piel_rese, hiperpigm, cambios_cabello, '
        'ruta_atenc, clas_peso_pred'
    ).not_.is_('clas_peso_pred', 'null').execute()
    controles = c_res.data or []

    if not controles:
        return pd.DataFrame()

    p_res = supabase.table('pacientes').select(
        'id, fecha_nac, per_etn_, estrato_, area_, cod_dpto_o, municipio_res, '
        'niv_educat, menores, gp_pobicbf, peso_nac, edad_ges, '
        't_lechem, e_complem, crec_dllo, esq_vac, carne_vac'
    ).execute()
    pacientes = {p['id']: p for p in (p_res.data or [])}

    return etl_db_records(controles, pacientes, filtros)


# ── Entrada pública ────────────────────────────────────────────────────────────

async def iniciar_entrenamiento(config: dict) -> str:
    job_id = str(uuid.uuid4())[:8]
    _jobs[job_id] = {'estado': 'running', 'progreso': 0, 'log': [], 'resultado': None}
    asyncio.create_task(_run(job_id, config))
    return job_id


async def _run(job_id: str, config: dict):
    job = _jobs[job_id]
    try:
        await _entrenar(job, config)
        job['estado'] = 'done'
    except Exception as exc:
        job['estado'] = 'error'
        _log(job, f'ERROR: {exc}')
        import traceback
        print(traceback.format_exc(), flush=True)


# ── Pipeline principal ─────────────────────────────────────────────────────────

async def _entrenar(job: dict, config: dict):
    modelos_sel: dict[str, dict] = config.get('modelos', {})
    test_size: float             = float(config.get('test_size', 0.2))
    cv_folds:  int               = int(config.get('cv_folds', 5))
    nombre_base: str             = config.get('nombre', '').strip()
    user_id: str                 = config.get('user_id', '')
    incluir_db: bool             = bool(config.get('incluir_db', False))
    filtros_db: dict | None      = config.get('filtros_db') or None
    usar_smote: bool             = bool(config.get('usar_smote', True))
    max_versions: int            = int(config.get('max_versions', MAX_VERSIONS_DEFAULT))

    # ── 1. Cargar datos ────────────────────────────────────────────────────────
    _log(job, 'Cargando datasets habilitados...')
    _pct(job, 5)
    await asyncio.sleep(0.1)

    df_datasets = _cargar_datasets_habilitados()
    n_datasets  = len(df_datasets)
    _log(job, f'Datasets SIVIGILA: {n_datasets:,} registros')

    df_db = pd.DataFrame()
    if incluir_db:
        _log(job, 'Cargando registros de la BD con filtros...')
        await asyncio.sleep(0.1)
        df_db  = _cargar_db(filtros_db)
        n_db   = len(df_db)
        _log(job, f'Registros BD tras ETL: {n_db:,}')

    if n_datasets == 0 and len(df_db) == 0:
        raise ValueError('No hay datos disponibles. Habilita al menos un dataset o activa "Incluir BD".')

    # Concatenar fuentes
    partes = [p for p in [df_datasets, df_db] if len(p) > 0]
    df_total = pd.concat(partes, ignore_index=True)

    # Renombrar target si viene de BD (clas_peso_pred → clas_peso)
    if 'clas_peso' not in df_total.columns and 'clas_peso_pred' in df_total.columns:
        df_total = df_total.rename(columns={'clas_peso_pred': 'clas_peso'})

    df_total = df_total.dropna(subset=[TARGET])
    n_total  = len(df_total)
    _log(job, f'Total combinado: {n_total:,} registros')

    if n_total < 20:
        raise ValueError(
            f'Datos insuficientes ({n_total} registros). '
            'Se necesitan al menos 20 registros válidos.'
        )

    _pct(job, 12)

    # ── 2. LabelEncoder cod_dpto_o ─────────────────────────────────────────────
    _log(job, 'Codificando departamentos...')
    le_dpto = LabelEncoder()
    df_total['cod_dpto_o'] = le_dpto.fit_transform(
        df_total['cod_dpto_o'].astype(str).fillna('nan')
    )
    _pct(job, 18)
    await asyncio.sleep(0.1)

    y = df_total[TARGET].astype(int).values
    clases_unicas = sorted(np.unique(y).tolist())
    _log(job, f'Clases en target: {clases_unicas} ({len(clases_unicas)} clases)')

    d        = Path(settings.models_dir)
    ts       = datetime.now().strftime('%Y%m%d_%H%M%S')
    n_modelos = len(modelos_sel)
    resultados: list[dict] = []

    for idx, (tipo, params) in enumerate(modelos_sel.items()):
        nombre_algo = NOMBRE_LEGIBLE.get(tipo, tipo.upper())
        _log(job, f'── {nombre_algo} ──')

        base = 18 + int(78 / n_modelos) * idx

        # ── Modelo A (con IMC) ─────────────────────────────────────────────────
        mask_A = df_total['imc'].notna()
        df_A   = df_total[mask_A].copy()

        if len(df_A) >= 20:
            _log(job, f'[A] {len(df_A):,} muestras con IMC')
            X_A = df_A[FEATURES_A].astype(float).values   # astype(float) primero: Int64 → float64
            y_A = df_A[TARGET].astype(int).values

            scaler_A = RobustScaler()
            idx_A    = [FEATURES_A.index(c) for c in COLS_ESC_A if c in FEATURES_A]
            X_A[:, idx_A] = scaler_A.fit_transform(X_A[:, idx_A])

            X_tr_A, X_te_A, y_tr_A, y_te_A = _split(X_A, y_A, test_size)
            X_tr_A, y_tr_A = _smote_if_possible(X_tr_A, y_tr_A, usar_smote, job)

            m_A = _make_model(tipo, params)
            m_A.fit(X_tr_A, y_tr_A)
            met_A = _evaluar(m_A, X_te_A, y_te_A)

            cv_A = _cross_val(tipo, params, X_A, y_A, cv_folds)
            if cv_A:
                met_A['cv_accuracy'] = cv_A
            _log(job, f'[A] Acc:{met_A["accuracy"]:.3f}  F1w:{met_A["f1_weighted"]:.3f}  CV:{cv_A}')
        else:
            _log(job, f'[A] Solo {len(df_A)} muestras con IMC → usando Modelo B como fallback')
            m_A = scaler_A = None
            met_A = {}

        await asyncio.sleep(0.1)
        _pct(job, base + int(78 / n_modelos) // 2)

        # ── Modelo B (sin IMC) ─────────────────────────────────────────────────
        _log(job, f'[B] {n_total:,} muestras (todas)')
        X_B = df_total[FEATURES_B].astype(float).values   # astype(float) primero: Int64 → float64
        y_B = y.copy()

        scaler_B = RobustScaler()
        idx_B    = [FEATURES_B.index(c) for c in COLS_ESC_B if c in FEATURES_B]
        X_B[:, idx_B] = scaler_B.fit_transform(X_B[:, idx_B])

        X_tr_B, X_te_B, y_tr_B, y_te_B = _split(X_B, y_B, test_size)
        X_tr_B, y_tr_B = _smote_if_possible(X_tr_B, y_tr_B, usar_smote, job)

        m_B = _make_model(tipo, params)
        m_B.fit(X_tr_B, y_tr_B)
        met_B = _evaluar(m_B, X_te_B, y_te_B)

        cv_B = _cross_val(tipo, params, X_B, y_B, cv_folds)
        if cv_B:
            met_B['cv_accuracy'] = cv_B
        _log(job, f'[B] Acc:{met_B["accuracy"]:.3f}  F1w:{met_B["f1_weighted"]:.3f}  CV:{cv_B}')

        await asyncio.sleep(0.1)

        # ── Guardar ────────────────────────────────────────────────────────────
        arch_A = f'modelo_A_{tipo}_{ts}.joblib'
        arch_B = f'modelo_B_{tipo}_{ts}.joblib'
        sca_A  = f'scaler_A_{tipo}_{ts}.joblib'
        sca_B  = f'scaler_B_{tipo}_{ts}.joblib'
        le_f   = f'le_dpto_{tipo}_{ts}.joblib'

        joblib.dump(m_A   if m_A   else m_B,   d / arch_A)
        joblib.dump(scaler_A if scaler_A else scaler_B, d / sca_A)
        joblib.dump(m_B,   d / arch_B)
        joblib.dump(scaler_B, d / sca_B)
        joblib.dump(le_dpto, d / le_f)
        _log(job, f'Archivos guardados: {arch_A}, {arch_B}')

        # ── Registrar en modelos_ml ────────────────────────────────────────────
        nombre_modelo = nombre_base or f'{nombre_algo} {ts[-6:]}'
        fuentes = []
        if n_datasets > 0: fuentes.append(f'SIVIGILA ({n_datasets:,})')
        if len(df_db) > 0: fuentes.append(f'BD ({len(df_db):,})')

        metricas = {
            'modelo_A':  met_A,
            'modelo_B':  met_B,
            'n_muestras': n_total,
            'test_size':  test_size,
            'cv_folds':   cv_folds,
            'fuentes':    fuentes,
            'smote':      usar_smote,
            'le_dpto':    le_f,   # nombre del archivo LabelEncoder para loader.py
        }

        rec = {
            'nombre':        nombre_modelo,
            'tipo':          tipo,
            'descripcion':   f'Entrenado con {n_total:,} registros · {" + ".join(fuentes)}',
            'version':       ts,
            'archivo_a':     arch_A,   # PostgreSQL guarda columnas en minúsculas
            'archivo_b':     arch_B,
            'scaler_a':      sca_A,
            'scaler_b':      sca_B,
            'metricas':      metricas,
            'activo':        False,
            'entrenado_por': user_id or None,
        }
        # Guardar también le_dpto propio en la columna extra si existe,
        # o como fallback sigue usando el global
        try:
            supabase.table('modelos_ml').insert(rec).execute()
            _log(job, f'Registrado en modelos_ml: "{nombre_modelo}"')
            _limpiar_modelos_viejos(tipo, max_versions, job)
        except Exception as e:
            _log(job, f'Advertencia al registrar: {e}')

        resultados.append({'tipo': tipo, 'nombre': nombre_modelo, 'metricas': metricas})
        _pct(job, base + int(78 / n_modelos))
        await asyncio.sleep(0.1)

    _log(job, f'Entrenamiento completado — {len(resultados)} modelo(s)')
    _pct(job, 100)
    job['resultado'] = resultados


# ── Helpers ────────────────────────────────────────────────────────────────────

def _split(X, y, test_size):
    strat = y if len(np.unique(y)) > 1 else None
    return train_test_split(X, y, test_size=test_size, random_state=42, stratify=strat)


def _smote_if_possible(X_tr, y_tr, usar_smote: bool, job: dict):
    if not usar_smote:
        return X_tr, y_tr
    clases, counts = np.unique(y_tr, return_counts=True)
    min_count = int(counts.min())
    if min_count < 2 or len(clases) < 2:
        return X_tr, y_tr
    try:
        from imblearn.over_sampling import SMOTE
        k = max(1, min(5, min_count - 1))
        sm = SMOTE(random_state=42, k_neighbors=k)
        X_sm, y_sm = sm.fit_resample(X_tr, y_tr)
        _log(job, f'SMOTE: {len(y_tr):,} → {len(y_sm):,} muestras')
        return X_sm, y_sm
    except Exception as e:
        _log(job, f'SMOTE omitido: {e}')
        return X_tr, y_tr


def _evaluar(model, X_te, y_te) -> dict:
    y_pred = model.predict(X_te)
    return {
        'accuracy':    round(float(accuracy_score(y_te, y_pred)), 4),
        'f1_weighted': round(float(f1_score(y_te, y_pred, average='weighted', zero_division=0)), 4),
        'f1_macro':    round(float(f1_score(y_te, y_pred, average='macro',    zero_division=0)), 4),
    }


def _cross_val(tipo: str, params: dict, X, y, folds: int) -> float | None:
    if len(X) < folds * 3:
        return None
    n_clases = len(np.unique(y))
    k = min(folds, n_clases)
    if k < 2:
        return None
    try:
        cv = cross_val_score(
            _make_model(tipo, params), X, y,
            cv=StratifiedKFold(n_splits=k, shuffle=True, random_state=42),
            scoring='accuracy', n_jobs=-1,
        )
        return round(float(cv.mean()), 4)
    except Exception:
        return None
