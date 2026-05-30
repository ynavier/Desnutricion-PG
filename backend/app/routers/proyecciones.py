"""
Proyecciones temporales usando SARIMA(1,1,1)(1,1,0,12).
Metodología del notebook 07_proyecciones_temporales.ipynb.

Fuentes de datos (en orden de preferencia):
  1. serie_temporal_mensual.csv  — serie nacional agregada (2020-2026)
  2. Datasets habilitados en datasets_ml (procesados con ETL actualizado)
     → tienen columna anio_mes y ndep_resi para filtrar por departamento
Horizonte: hasta diciembre 2027.
"""
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, Query, HTTPException

from app.auth.dependencies import require_anl
from app.config import settings
from app.database import supabase

router = APIRouter(prefix='/proyecciones', tags=['proyecciones'])

_SERIE_MES  = Path(settings.data_proc_dir) / 'serie_temporal_mensual.csv'
FECHA_CORTE = '2027-12'
MESES_LABEL = ['Ene','Feb','Mar','Abr','May','Jun',
               'Jul','Ago','Sep','Oct','Nov','Dic']

# Mapeo nombre departamento → cod_dpto_o DIVIPOLA
_NOMBRE_A_COD = {
    'ANTIOQUIA':5,'ATLÁNTICO':8,'BOGOTÁ':11,'BOLÍVAR':13,'BOYACÁ':15,
    'CALDAS':17,'CAQUETÁ':18,'CAUCA':19,'CESAR':20,'CÓRDOBA':23,
    'CUNDINAMARCA':25,'CHOCÓ':27,'HUILA':41,'GUAJIRA':44,'MAGDALENA':47,
    'META':50,'NARIÑO':52,'NORTE DE SANTANDER':54,'QUINDÍO':63,
    'RISARALDA':66,'SANTANDER':68,'SUCRE':70,'TOLIMA':73,
    'VALLE DEL CAUCA':76,
}


# ── SARIMA helper ─────────────────────────────────────────────────────────────

def _ajustar_sarima(serie_y: np.ndarray, horizonte: int):
    """
    Ajusta SARIMA(1,1,1)(1,1,0,12) y devuelve (yhat, ci80_low, ci80_high, ci95_low, ci95_high).
    Cada array tiene `horizonte` elementos.
    """
    from statsmodels.tsa.statespace.sarimax import SARIMAX

    model  = SARIMAX(
        serie_y,
        order=(1, 1, 1),
        seasonal_order=(1, 1, 0, 12),
        enforce_stationarity=False,
        enforce_invertibility=False,
    )
    result  = model.fit(disp=False)
    fc_obj  = result.get_forecast(steps=horizonte)

    yhat    = np.maximum(0, np.asarray(fc_obj.predicted_mean))
    ci95    = np.asarray(fc_obj.conf_int(alpha=0.05))
    ci80    = np.asarray(fc_obj.conf_int(alpha=0.20))

    return yhat, ci80[:, 0], ci80[:, 1], ci95[:, 0], ci95[:, 1]


def _horizonte_hasta_2027(ultima_fecha: pd.Timestamp) -> int:
    """Calcula cuántos meses proyectar hasta diciembre 2027."""
    fin = pd.Timestamp('2027-12-01')
    return max(1, (fin.year - ultima_fecha.year) * 12 + (fin.month - ultima_fecha.month))


def _construir_resultado(
    df_hist: pd.DataFrame,
    yhat, ci80_lo, ci80_hi, ci95_lo, ci95_hi,
    ultima_fecha: pd.Timestamp,
    horizonte: int,
) -> list[dict]:
    """Une histórico + proyección en una lista de dicts."""
    # Histórico
    resultado = []
    for _, row in df_hist.iterrows():
        am  = str(row['anio_mes'])
        m   = int(am[5:7])
        y   = int(am[:4])
        resultado.append({
            'anio_mes':      am,
            'label':         f'{MESES_LABEL[m-1]} {str(y)[2:]}',
            'valor':         round(float(row['valor']), 2),
            'limite_inf_80': None,
            'limite_sup_80': None,
            'limite_inf_95': None,
            'limite_sup_95': None,
            'tipo':          'historico',
        })

    # Proyección
    fechas_fut = pd.date_range(
        start=ultima_fecha + pd.DateOffset(months=1),
        periods=horizonte, freq='MS',
    )
    for i, fecha in enumerate(fechas_fut):
        am = fecha.strftime('%Y-%m')
        if am > FECHA_CORTE:
            break
        m  = fecha.month
        y  = fecha.year
        resultado.append({
            'anio_mes':      am,
            'label':         f'{MESES_LABEL[m-1]} {str(y)[2:]}',
            'valor':         round(float(yhat[i]), 2),
            'limite_inf_80': round(float(ci80_lo[i]), 2),
            'limite_sup_80': round(float(ci80_hi[i]), 2),
            'limite_inf_95': round(float(ci95_lo[i]), 2),
            'limite_sup_95': round(float(ci95_hi[i]), 2),
            'tipo':          'proyeccion',
        })

    return resultado


# ── Carga de datos ────────────────────────────────────────────────────────────

def _serie_nacional(col: str) -> pd.DataFrame:
    """
    Devuelve la serie mensual nacional desde serie_temporal_mensual.csv
    con meses faltantes rellenados con 0 para SARIMA.
    """
    if not _SERIE_MES.exists():
        return pd.DataFrame()
    df = pd.read_csv(_SERIE_MES)
    if col not in df.columns:
        return pd.DataFrame()
    df = df[['anio_mes', col]].dropna().copy()
    df.columns = ['anio_mes', 'valor']
    df['ds'] = pd.to_datetime(df['anio_mes'] + '-01')
    df = df.sort_values('ds').reset_index(drop=True)

    # Serie continua sin huecos
    rng = pd.date_range(df['ds'].min(), df['ds'].max(), freq='MS')
    df  = (df.set_index('ds')
             .reindex(rng, fill_value=0)
             .reset_index()
             .rename(columns={'index': 'ds'}))
    df['anio_mes'] = df['ds'].dt.strftime('%Y-%m')
    return df


def _municipios_de_dpto(dpto: str) -> list[str]:
    """Devuelve municipios disponibles en los datasets para un departamento."""
    proc_dir = Path(settings.data_proc_dir)
    municipios: set[str] = set()
    for ruta in proc_dir.glob('dataset_*.csv'):
        try:
            df = pd.read_csv(ruta, usecols=lambda c: c in ('ndep_resi', 'nmun_resi'), low_memory=False)
            if 'ndep_resi' in df.columns and 'nmun_resi' in df.columns:
                sub = df[df['ndep_resi'].str.upper() == dpto.upper()]
                municipios.update(sub['nmun_resi'].dropna().str.upper().unique())
        except Exception:
            pass
    return sorted(municipios)


def _serie_bd(dpto: str | None = None, municipio: str | None = None) -> pd.DataFrame:
    """
    Construye una serie mensual de casos desde la BD (controles + pacientes).
    Complementa los datasets históricos con los registros clínicos actuales.
    """
    try:
        q = supabase.table('pacientes').select('id, dpto_residencia, municipio_res')
        if dpto:      q = q.ilike('dpto_residencia', f'%{dpto}%')
        if municipio: q = q.ilike('municipio_res',   f'%{municipio}%')
        pac_ids = [p['id'] for p in (q.execute().data or [])]

        if not pac_ids:
            return pd.DataFrame()

        ctrls = (supabase.table('controles')
                 .select('fecha, clas_nombre, paciente_id')
                 .in_('paciente_id', pac_ids)
                 .execute().data or [])

        filas = []
        for c in ctrls:
            fs = c.get('fecha', '')
            if not fs: continue
            try: am = f'{int(fs[:4]):04d}-{int(fs[5:7]):02d}'
            except: continue
            filas.append({'anio_mes': am, 'casos': 1})

        if not filas:
            return pd.DataFrame()

        df = pd.DataFrame(filas)
        serie = df.groupby('anio_mes')['casos'].count().reset_index(name='valor')
        serie['ds'] = pd.to_datetime(serie['anio_mes'] + '-01')
        return serie.sort_values('ds').reset_index(drop=True)
    except Exception as e:
        print(f'[PROY] Error cargando BD: {e}', flush=True)
        return pd.DataFrame()


def _combinar_series(df_hist: pd.DataFrame, df_bd: pd.DataFrame) -> pd.DataFrame:
    """
    Combina la serie histórica (datasets) con la serie de BD.
    Para meses que aparecen en ambas, suma los valores.
    """
    if df_hist.empty and df_bd.empty:
        return pd.DataFrame()
    if df_hist.empty:
        return df_bd
    if df_bd.empty:
        return df_hist

    merged = (
        pd.concat([df_hist[['anio_mes', 'valor']], df_bd[['anio_mes', 'valor']]])
        .groupby('anio_mes')['valor']
        .sum()
        .reset_index()
    )
    merged['ds'] = pd.to_datetime(merged['anio_mes'] + '-01')
    return merged.sort_values('ds').reset_index(drop=True)


def _serie_departamento(dpto: str, municipio: str | None = None) -> pd.DataFrame:
    """
    Devuelve la serie mensual de casos para un departamento/municipio específico.
    Lee todos los CSVs procesados en proc_dir que tengan ndep_resi y anio_mes.
    Si se especifica municipio, filtra también por nmun_resi.
    """
    proc_dir = Path(settings.data_proc_dir)
    cod_dpto = _NOMBRE_A_COD.get(dpto.upper())
    partes: list[pd.DataFrame] = []
    archivos_vistos: set[str] = set()

    def _leer_csv(ruta: Path):
        if ruta.name in archivos_vistos:
            return
        archivos_vistos.add(ruta.name)
        try:
            df = pd.read_csv(ruta, low_memory=False)
            if 'ndep_resi' in df.columns and 'anio_mes' in df.columns:
                filtrado = df[df['ndep_resi'].str.upper() == dpto.upper()]
                if municipio and 'nmun_resi' in filtrado.columns:
                    filtrado = filtrado[filtrado['nmun_resi'].str.upper().str.contains(municipio.upper(), na=False)]
                if not filtrado.empty:
                    partes.append(filtrado[['anio_mes']].assign(casos=1))
            elif cod_dpto and 'cod_dpto_o' in df.columns and 'anio_mes' in df.columns and not municipio:
                filtrado = df[df['cod_dpto_o'] == cod_dpto]
                if not filtrado.empty:
                    partes.append(filtrado[['anio_mes']].assign(casos=1))
        except Exception as e:
            print(f'[PROY] Error leyendo {ruta.name}: {e}', flush=True)

    # 1. Escanear todos los CSVs en proc_dir directamente
    for ruta in sorted(proc_dir.glob('dataset_*.csv')):
        _leer_csv(ruta)

    # 2. Complementar con datasets habilitados en Supabase
    try:
        res = (supabase.table('datasets_ml')
               .select('archivo_proc')
               .eq('habilitado', True)
               .eq('estado', 'procesado')
               .execute())
        for ds in (res.data or []):
            archivo = ds.get('archivo_proc')
            if archivo:
                _leer_csv(proc_dir / archivo)
    except Exception as e:
        print(f'[PROY] Supabase no disponible: {e}', flush=True)

    if not partes:
        return pd.DataFrame()

    df_all = pd.concat(partes, ignore_index=True)
    serie  = (df_all.groupby('anio_mes')['casos']
              .count()
              .reset_index(name='valor'))
    serie['ds'] = pd.to_datetime(serie['anio_mes'] + '-01')
    serie = serie.sort_values('ds').reset_index(drop=True)

    # Excluir el último mes si parece incompleto (< 30% del penúltimo)
    if len(serie) > 2:
        if serie['valor'].iloc[-1] < serie['valor'].iloc[-2] * 0.30:
            serie = serie.iloc[:-1]

    # Verificar umbrales ANTES de rellenar:
    # — Al menos 12 meses con datos reales (no ceros)
    # — Al menos 20 casos en total
    meses_reales = int((serie['valor'] > 0).sum())
    casos_totales = int(serie['valor'].sum())
    if meses_reales < 12 or casos_totales < 20:
        return pd.DataFrame()

    # Rellenar meses faltantes con 0 para que SARIMA tenga serie continua
    rng = pd.date_range(serie['ds'].min(), serie['ds'].max(), freq='MS')
    serie = (serie.set_index('ds')
             .reindex(rng, fill_value=0)
             .reset_index()
             .rename(columns={'index': 'ds'}))
    serie['anio_mes'] = serie['ds'].dt.strftime('%Y-%m')

    return serie


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get('')
async def proyecciones(
    metrica:   str      = Query('casos', pattern='^(casos|tasa_severa|tasa_moderada|zscore)$'),
    dpto:      str | None = Query(None),
    municipio: str | None = Query(None),
    _user: dict = Depends(require_anl),
):
    """
    Proyección SARIMA(1,1,1)(1,1,0,12) hasta diciembre 2027.

    - metrica: casos | tasa_severa | tasa_moderada | zscore
    - dpto: si se especifica, proyecta solo los casos de ese departamento.
            Solo disponible para metrica=casos y con datasets re-procesados.
    """
    # ── Elegir fuente de datos ────────────────────────────────────────────────
    def _suficiente(df: pd.DataFrame) -> bool:
        if df.empty: return False
        return int((df['valor'] > 0).sum()) >= 12 and int(df['valor'].sum()) >= 20

    fuente       = 'nacional'
    zona_efectiva = dpto or 'Nacional'

    if dpto:
        # ── Nivel 1: municipio ───────────────────────────────────────────────
        if municipio:
            df_m = _combinar_series(_serie_departamento(dpto, municipio), _serie_bd(dpto, municipio))
            if _suficiente(df_m):
                df           = df_m
                fuente       = 'municipio'
                zona_efectiva = f'{municipio}, {dpto}'
                col_metrica  = 'casos'
                print(f'[PROY] Proyección nivel municipio: {zona_efectiva}', flush=True)
            else:
                print(f'[PROY] Sin datos suficientes para {municipio} — subiendo a departamento', flush=True)
                municipio = None   # intentar nivel departamento

        # ── Nivel 2: departamento (si municipio no alcanzó) ──────────────────
        if fuente == 'nacional':
            df_d = _combinar_series(_serie_departamento(dpto, None), _serie_bd(dpto, None))
            if _suficiente(df_d):
                df           = df_d
                fuente       = 'departamento' if not municipio else 'departamento_fallback'
                zona_efectiva = dpto
                col_metrica  = 'casos'
                print(f'[PROY] Proyección nivel departamento: {dpto}', flush=True)
            else:
                print(f'[PROY] Sin datos suficientes para {dpto} — subiendo a nacional', flush=True)

    # ── Nivel 3: nacional ────────────────────────────────────────────────────
    if fuente == 'nacional':
        col_map = {
            'casos':         'casos',
            'tasa_severa':   'tasa_severa',
            'tasa_moderada': 'tasa_moderada',
            'zscore':        'zscore_pt_media',
        }
        df_nac = _serie_nacional(col_map[metrica])
        df     = _combinar_series(df_nac, _serie_bd()) if metrica == 'casos' else df_nac
        if df.empty or len(df) < 12:
            raise HTTPException(
                status_code=422,
                detail='Serie temporal no disponible. Verifica que serie_temporal_mensual.csv esté en data/processed/.',
            )
        col_metrica   = metrica
        zona_efectiva = 'Nacional'

    # ── SARIMA ───────────────────────────────────────────────────────────────
    serie_y       = df['valor'].values.astype(float)
    ultima_fecha  = df['ds'].max()
    horizonte     = _horizonte_hasta_2027(ultima_fecha)

    try:
        yhat, ci80_lo, ci80_hi, ci95_lo, ci95_hi = _ajustar_sarima(serie_y, horizonte)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error ajustando SARIMA: {e}')

    resultado = _construir_resultado(
        df, yhat, ci80_lo, ci80_hi, ci95_lo, ci95_hi, ultima_fecha, horizonte,
    )

    total_casos = int(df['valor'].sum()) if not df.empty else 0
    return {
        'datos':         resultado,
        'metrica':       col_metrica,
        'dpto':          dpto,
        'municipio':     municipio,
        'fuente':        fuente,
        'zona_efectiva': zona_efectiva,
        'modelo':        'SARIMA(1,1,1)(1,1,0,12)',
        'horizonte':     FECHA_CORTE,
        'n_train':       len(df),
        'total_casos':   total_casos,
        'baja_densidad': total_casos < 50,
    }


@router.get('/departamentos')
async def deptos_disponibles(_user: dict = Depends(require_anl)):
    """Lista los departamentos con datos suficientes para proyectar."""
    proc_dir = Path(settings.data_proc_dir)
    dpto_meses: dict[str, set] = {}

    try:
        res = (supabase.table('datasets_ml')
               .select('archivo_proc')
               .eq('habilitado', True)
               .eq('estado', 'procesado')
               .execute())
        for ds in (res.data or []):
            archivo = ds.get('archivo_proc')
            if not archivo: continue
            ruta = proc_dir / archivo
            if not ruta.exists(): continue
            df = pd.read_csv(ruta, usecols=lambda c: c in ('ndep_resi', 'anio_mes'), low_memory=False)
            if 'ndep_resi' not in df.columns or 'anio_mes' not in df.columns:
                continue
            for dpto, grp in df.groupby('ndep_resi'):
                if dpto not in dpto_meses:
                    dpto_meses[dpto] = set()
                dpto_meses[dpto].update(grp['anio_mes'].dropna().unique())
    except Exception as e:
        print(f'[PROY] Error: {e}', flush=True)

    disponibles = [
        {'departamento': d, 'meses_datos': len(m)}
        for d, m in sorted(dpto_meses.items())
        if len(m) >= 12
    ]
    return {'departamentos': disponibles}
