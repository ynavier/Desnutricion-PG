"""
Estadísticas epidemiológicas combinando:
  - Supabase BD (pacientes + controles) → datos actuales y demográficos
  - Datasets_ml habilitados (CSVs en GCS) → datos históricos SIVIGILA
Los archivos CSV locales (113_limpio_unificado, serie_temporal_*) NO se usan
en producción porque están desactualizados.
"""
from collections import defaultdict
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import require_anl
from app.config import settings
from app.database import supabase

router = APIRouter(prefix='/estadisticas', tags=['estadisticas'])

MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
         'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

ESTADO_FILL = {
    'Normal':           '#6FCF97',
    'Normal bajo':      '#FBC02D',
    'Desnut. leve':     '#FB8C00',
    'Desnut. moderada': '#E53935',
    'Desnut. severa':   '#B71C1C',
    'Sobrepeso':        '#4FB4D2',
    'Obesidad':         '#9B59B6',
}

_CLAS_NOMBRE = {
    1: 'Desnut. severa', 2: 'Desnut. moderada', 3: 'Normal bajo',
    4: 'Normal', 5: 'Sobrepeso', 6: 'Obesidad',
}

# Código DIVIPOLA → nombre de departamento (para filtrar datasets por cod_dpto_o)
_COD_DPTO = {
    5:'ANTIOQUIA',8:'ATLÁNTICO',11:'BOGOTÁ',13:'BOLÍVAR',15:'BOYACÁ',
    17:'CALDAS',18:'CAQUETÁ',19:'CAUCA',20:'CESAR',23:'CÓRDOBA',
    25:'CUNDINAMARCA',27:'CHOCÓ',41:'HUILA',44:'GUAJIRA',47:'MAGDALENA',
    50:'META',52:'NARIÑO',54:'NORTE DE SANTANDER',63:'QUINDÍO',
    66:'RISARALDA',68:'SANTANDER',70:'SUCRE',73:'TOLIMA',
    76:'VALLE DEL CAUCA',81:'ARAUCA',85:'CASANARE',86:'PUTUMAYO',
    88:'SAN ANDRÉS',91:'AMAZONAS',94:'GUAINÍA',95:'GUAVIARE',
    97:'VAUPÉS',99:'VICHADA',
}
_NOMBRE_A_COD = {v:k for k,v in _COD_DPTO.items()}


def _clas_key(clas_nombre: str | None) -> str:
    n = (clas_nombre or '').lower()
    if 'severa'   in n: return 'severo'
    if 'moderada' in n: return 'moderado'
    if 'bajo'     in n: return 'leve'
    if 'normal'   in n: return 'adecuado'
    return 'riesgo'

def _clas_peso_key(clas: int) -> str:
    return {1:'severo',2:'moderado',3:'leve',4:'adecuado',5:'riesgo',6:'riesgo'}.get(clas,'riesgo')


# ── Carga de datasets habilitados (GCS / local) ───────────────────────────────

def _cargar_datasets(
    cod_dpto:  int | None = None,
    dpto_nombre: str | None = None,
    municipio: str | None = None,
) -> pd.DataFrame:
    """
    Lee todos los datasets_ml habilitados y procesados.
    Filtra por departamento (cod_dpto_o o ndep_resi) y/o municipio (nmun_resi).
    """
    proc_dir = Path(settings.data_proc_dir)
    partes: list[pd.DataFrame] = []
    archivos_vistos: set[str] = set()

    def _procesar(ruta: Path):
        if ruta.name in archivos_vistos:
            return
        archivos_vistos.add(ruta.name)
        if not ruta.exists():
            return
        try:
            df = pd.read_csv(ruta, low_memory=False)
            # Filtrar por departamento
            if dpto_nombre and 'ndep_resi' in df.columns:
                df = df[df['ndep_resi'].str.upper() == dpto_nombre.upper()]
            elif cod_dpto and 'cod_dpto_o' in df.columns:
                df = df[df['cod_dpto_o'] == cod_dpto]
            # Filtrar por municipio
            if municipio and 'nmun_resi' in df.columns:
                df = df[df['nmun_resi'].str.upper().str.contains(municipio.upper(), na=False)]
            if not df.empty:
                partes.append(df)
        except Exception as e:
            print(f'[STATS] Error leyendo {ruta.name}: {e}', flush=True)

    # Primero intentar con Supabase
    try:
        res = (supabase.table('datasets_ml')
               .select('archivo_proc')
               .eq('habilitado', True)
               .eq('estado', 'procesado')
               .execute())
        for ds in (res.data or []):
            archivo = ds.get('archivo_proc')
            if archivo:
                _procesar(proc_dir / archivo)
    except Exception as e:
        print(f'[STATS] Supabase no disponible: {e}', flush=True)

    # Fallback: escanear directorio
    if not partes:
        for ruta in sorted(proc_dir.glob('dataset_*.csv')):
            _procesar(ruta)

    return pd.concat(partes, ignore_index=True) if partes else pd.DataFrame()


def _linreg(xs, ys, paso) -> float:
    xs = np.array(xs, dtype=float)
    ys = np.array(ys, dtype=float)
    if np.std(ys) == 0: return float(ys[-1])
    coef = np.polyfit(xs, ys, 1)
    return float(np.polyval(coef, paso))

def _proyectar_tendencia(tendencia: list[dict], n_pasos: int = 3) -> list[dict]:
    n = len(tendencia)
    if n < 3: return []
    hoy = date.today()
    keys = ['adecuado','riesgo','leve','moderado','severo']
    result = []
    for step in range(1, n_pasos+1):
        m_idx  = (hoy.month-1+step) % 12
        y_step = hoy.year + (hoy.month-1+step) // 12
        p = {'mes': f'{MESES[m_idx]} {str(y_step)[2:]}', 'proyeccion': True}
        for k in keys:
            ys = [t.get(k, 0) for t in tendencia]
            p[k] = max(0, round(_linreg(range(n), ys, n-1+step)))
        result.append(p)
    return result


# ── Endpoint principal ────────────────────────────────────────────────────────

@router.get('')
async def estadisticas(
    dpto:      str | None = Query(None),
    municipio: str | None = Query(None),
    meses:     int        = Query(6, ge=3, le=24),
    _user: dict = Depends(require_anl),
):
    # ── BD: pacientes con último control ─────────────────────────────────────
    q = supabase.table('pacientes').select(
        'id, area_, municipio_res, zona, dpto_residencia, '
        'controles(fecha, clas_nombre)'
    )
    if dpto:      q = q.ilike('dpto_residencia', f'%{dpto}%')
    if municipio: q = q.ilike('municipio_res',   f'%{municipio}%')

    pacientes = q.execute().data or []
    total_bd  = len(pacientes)

    estado_bd: dict[str,int]  = defaultdict(int)
    zona_counts: dict[str,int] = defaultdict(int)
    muni_estado: dict          = defaultdict(lambda: defaultdict(int))
    area_urban_bd = area_rural_bd = en_riesgo_bd = desnutridos_bd = 0

    for p in pacientes:
        controles = sorted(p.get('controles',[]), key=lambda c:c.get('fecha',''), reverse=True)
        ultimo = controles[0] if controles else None
        clas   = ultimo.get('clas_nombre') if ultimo else None
        estado_bd[clas or 'Sin datos'] += 1
        key = _clas_key(clas)
        if key != 'adecuado':            en_riesgo_bd  += 1
        if key in ('moderado','severo'): desnutridos_bd += 1
        if p.get('area_')==1: area_urban_bd += 1
        elif p.get('area_')==2: area_rural_bd += 1
        zona = p.get('municipio_res') or p.get('zona') or 'No especificado'
        zona_counts[zona] += 1
        muni_estado[zona][key] += 1

    # ── Histórico: datasets habilitados ───────────────────────────────────────
    cod_dpto = _NOMBRE_A_COD.get(dpto.upper()) if dpto else None
    df_hist  = _cargar_datasets(cod_dpto=cod_dpto, dpto_nombre=dpto, municipio=municipio)

    hist_total = len(df_hist)
    hist_estado: dict[str,int] = defaultdict(int)
    hist_urban = hist_rural = hist_en_riesgo = hist_desnut = 0

    if not df_hist.empty:
        if 'clas_peso' in df_hist.columns:
            for clas, cnt in df_hist['clas_peso'].dropna().value_counts().items():
                nombre = _CLAS_NOMBRE.get(int(clas), 'Sin datos')
                hist_estado[nombre] += int(cnt)
                key = _clas_peso_key(int(clas))
                if key != 'adecuado':            hist_en_riesgo += int(cnt)
                if key in ('moderado','severo'): hist_desnut    += int(cnt)
        if 'area_' in df_hist.columns:
            hist_urban = int((df_hist['area_']==1).sum())
            hist_rural = int((df_hist['area_']==2).sum())

    # ── Totales combinados ────────────────────────────────────────────────────
    total       = total_bd + hist_total
    en_riesgo   = en_riesgo_bd + hist_en_riesgo
    desnutridos = desnutridos_bd + hist_desnut
    tasa_desnutricion = round(desnutridos/total*100, 1) if total else 0

    estado_comb: dict[str,int] = defaultdict(int)
    for n2,c in estado_bd.items():    estado_comb[n2] += c
    for n2,c in hist_estado.items():  estado_comb[n2] += c

    distribucion_estado = [
        {'estado':e,'cantidad':c,'fill':ESTADO_FILL.get(e,'#9CA3AF')}
        for e,c in sorted(estado_comb.items(), key=lambda x:-x[1])
    ]
    area_urban = area_urban_bd + hist_urban
    area_rural = area_rural_bd + hist_rural
    area_total = area_urban + area_rural
    distribucion_area = [
        {'name':'Urbana','value':round(area_urban/area_total*100) if area_total else 0,'fill':'#4FB4D2'},
        {'name':'Rural', 'value':round(area_rural/area_total*100)  if area_total else 0,'fill':'#6FCF97'},
    ]
    zonas_riesgo = [
        {'zona':z,'casos':c,
         'severo':muni_estado[z].get('severo',0),
         'moderado':muni_estado[z].get('moderado',0)}
        for z,c in sorted(zona_counts.items(), key=lambda x:-x[1])
        if z != 'No especificado'
    ][:10]

    # ── Tendencia mensual BD ──────────────────────────────────────────────────
    cq = supabase.table('controles').select('fecha, clas_nombre, paciente_id')
    if dpto or municipio:
        ids = [p['id'] for p in pacientes]
        if ids: cq = cq.in_('paciente_id', ids)
    controles_todos = cq.order('fecha').execute().data or []

    hoy = date.today()
    meses_rng = []
    for i in range(meses-1,-1,-1):
        m=(hoy.month-i-1)%12+1; y=hoy.year-((hoy.month-i-1)//12)
        meses_rng.append((y,m))
    tend_bd: dict = {(y,m):{'adecuado':0,'riesgo':0,'leve':0,'moderado':0,'severo':0} for y,m in meses_rng}
    meses_bd_set: set[str] = set()
    for ctrl in controles_todos:
        fs=ctrl.get('fecha','')
        if not fs: continue
        try: y,m=int(fs[:4]),int(fs[5:7])
        except: continue
        meses_bd_set.add(f'{y:04d}-{m:02d}')
        if (y,m) in tend_bd:
            tend_bd[(y,m)][_clas_key(ctrl.get('clas_nombre'))] += 1
    tend_bd_list = [{'y':y,'m':m,'mes':MESES[m-1],'historico':False,**v}
                    for (y,m),v in sorted(tend_bd.items())]

    tendencia_mensual = [{k:v for k,v in p.items() if k not in ('y','m')}
                         for p in tend_bd_list]
    proyecciones = _proyectar_tendencia(tendencia_mensual, 3)

    return {
        'total':               total,
        'total_bd':            total_bd,
        'total_historico':     hist_total,
        'en_riesgo':           en_riesgo,
        'tasa_desnutricion':   tasa_desnutricion,
        'zonas_monitoreadas':  len([z for z in zona_counts if z!='No especificado']),
        'distribucion_estado': distribucion_estado,
        'distribucion_area':   distribucion_area,
        'zonas_riesgo':        zonas_riesgo,
        'tendencia_mensual':   tendencia_mensual,
        'proyecciones':        proyecciones,
        'filtros_activos':     {'dpto':dpto,'municipio':municipio},
    }


# ── Detalle demográfico (solo BD — única fuente con sexo, edad exacta, hospitalización) ──

@router.get('/detalle')
async def estadisticas_detalle(
    dpto:      str | None = Query(None),
    municipio: str | None = Query(None),
    _user: dict = Depends(require_anl),
):
    """
    Desglose demográfico combinando BD + datasets SIVIGILA.
    Los datasets re-procesados con el ETL actualizado incluyen sexo_,
    pac_hos_, edad_, ndep_resi, nmun_resi y anio_mes.
    Los datasets procesados antes de esta actualización solo aportan
    crec_dllo y estrato_ (siempre disponibles).
    """
    q = supabase.table('pacientes').select(
        'sexo, fecha_nac, estrato_, area_, crec_dllo, '
        'controles(clas_nombre, fecha, ruta_atenc)'
    )
    if dpto:      q = q.ilike('dpto_residencia', f'%{dpto}%')
    if municipio: q = q.ilike('municipio_res',   f'%{municipio}%')
    pacs = q.execute().data or []

    hoy = date.today()

    def _edad_anios(fecha_nac_str: str | None) -> int | None:
        if not fecha_nac_str: return None
        try:
            fn = date.fromisoformat(fecha_nac_str)
            return (hoy.year-fn.year) - (1 if (hoy.month,hoy.day)<(fn.month,fn.day) else 0)
        except: return None

    estrato_data: dict[int,dict] = defaultdict(lambda:{'total':0,'severo':0,'moderado':0,'adecuado':0})
    sexo_data:    dict[str,dict] = defaultdict(lambda:{'total':0,'severo':0,'moderado':0,'adecuado':0})
    grupo_data:   dict[str,dict] = defaultdict(lambda:{'total':0,'severo':0,'moderado':0})
    crec_con = crec_sin = hosp = total_bd = 0
    grupos_edad = [('<1 año',0,0),('1 año',1,1),('2 años',2,2),('3 años',3,3),('4 años',4,4),('5+ años',5,99)]

    # ── BD ────────────────────────────────────────────────────────────────────
    for p in pacs:
        total_bd += 1
        controles = sorted(p.get('controles',[]), key=lambda c:c.get('fecha',''), reverse=True)
        ult  = controles[0] if controles else None
        clas = ult.get('clas_nombre') if ult else None
        key  = _clas_key(clas)

        est = p.get('estrato_')
        if est:
            d = estrato_data[int(est)]; d['total'] += 1
            if key in d: d[key] += 1

        sexo = str(p.get('sexo','?'))
        if sexo in ('M','F'):
            d = sexo_data[sexo]; d['total'] += 1
            if key in d: d[key] += 1

        edad = _edad_anios(p.get('fecha_nac'))
        if edad is not None:
            for label,mn,mx in grupos_edad:
                if mn <= edad <= mx:
                    d = grupo_data[label]; d['total'] += 1
                    if key in ('severo','moderado'): d[key] += 1
                    break

        crec = p.get('crec_dllo')
        if crec == 1:   crec_con += 1
        elif crec == 2: crec_sin += 1
        if ult and ult.get('ruta_atenc') == 2: hosp += 1

    # ── Datasets históricos ───────────────────────────────────────────────────
    cod_dpto = _NOMBRE_A_COD.get(dpto.upper()) if dpto else None
    df_hist  = _cargar_datasets(cod_dpto=cod_dpto, dpto_nombre=dpto, municipio=municipio)

    total_hist = 0
    if not df_hist.empty:
        # Filtrar por municipio si aplica (solo si la columna existe)
        if municipio and 'nmun_resi' in df_hist.columns:
            df_hist = df_hist[df_hist['nmun_resi'].str.upper().str.contains(municipio.upper(), na=False)]

        total_hist = len(df_hist)

        if 'clas_peso' in df_hist.columns:
            def _key_from_df(row):
                return _clas_peso_key(int(row['clas_peso']))

            # Estrato
            if 'estrato_' in df_hist.columns:
                for est, grp in df_hist.dropna(subset=['estrato_']).groupby('estrato_'):
                    est_i = int(est)
                    if est_i <= 0: continue
                    estrato_data[est_i]['total'] += len(grp)
                    estrato_data[est_i]['severo']   += int((grp['clas_peso']==1).sum())
                    estrato_data[est_i]['moderado'] += int((grp['clas_peso']==2).sum())
                    estrato_data[est_i]['adecuado'] += int((grp['clas_peso']==4).sum())

            # Sexo (solo si el CSV fue procesado con el ETL actualizado)
            if 'sexo_' in df_hist.columns:
                for sexo, grp in df_hist.dropna(subset=['sexo_']).groupby('sexo_'):
                    s = str(sexo).strip().upper()
                    if s not in ('M','F'): continue
                    sexo_data[s]['total']    += len(grp)
                    sexo_data[s]['severo']   += int((grp['clas_peso']==1).sum())
                    sexo_data[s]['moderado'] += int((grp['clas_peso']==2).sum())
                    sexo_data[s]['adecuado'] += int((grp['clas_peso']==4).sum())

            # Grupo etario (edad_ en años)
            if 'edad_' in df_hist.columns:
                df_hist['edad_'] = pd.to_numeric(df_hist['edad_'], errors='coerce')
                for label,mn,mx in grupos_edad:
                    grp = df_hist[(df_hist['edad_']>=mn)&(df_hist['edad_']<=mx)]
                    if grp.empty: continue
                    grupo_data[label]['total']    += len(grp)
                    grupo_data[label]['severo']   += int((grp['clas_peso']==1).sum())
                    grupo_data[label]['moderado'] += int((grp['clas_peso']==2).sum())

            # Crec y desarrollo
            if 'crec_dllo' in df_hist.columns:
                crec_con += int((df_hist['crec_dllo']==1).sum())
                crec_sin += int((df_hist['crec_dllo']==2).sum())

            # Hospitalización
            if 'pac_hos_' in df_hist.columns:
                hosp += int((df_hist['pac_hos_']==1).sum())

    total      = total_bd + total_hist
    crec_total = crec_con + crec_sin

    por_estrato = [
        {'estrato':e,'label':f'Estrato {e}','total':d['total'],
         'severo':d['severo'],'moderado':d['moderado'],'adecuado':d['adecuado'],
         'tasa':round((d['severo']+d['moderado'])/d['total']*100,1) if d['total'] else 0}
        for e,d in sorted(estrato_data.items()) if e>0
    ]
    por_sexo = [
        {'sexo':s,'label':'Masculino' if s=='M' else 'Femenino',
         'total':d['total'],'severo':d['severo'],'moderado':d['moderado'],'adecuado':d['adecuado']}
        for s,d in sexo_data.items() if s in ('M','F')
    ]
    por_grupo_etario = [
        {'grupo':label,'total':d['total'],'severo':d['severo'],'moderado':d['moderado'],
         'tasa':round((d['severo']+d['moderado'])/d['total']*100,1) if d['total'] else 0}
        for label,d in [(g,grupo_data[g]) for g,_,_ in grupos_edad if g in grupo_data]
    ]

    return {
        'por_estrato':          por_estrato,
        'por_sexo':             por_sexo,
        'por_grupo_etario':     por_grupo_etario,
        'crec_dllo': {
            'con':      crec_con,
            'sin':      crec_sin,
            'tasa_sin': round(crec_sin/crec_total*100,1) if crec_total else 0,
        },
        'tasa_hospitalizacion': round(hosp/total*100,1) if total else 0,
        'total_bd':             total_bd,
        'total_historico':      total_hist,
        'total':                total,
        'filtros':              {'dpto':dpto,'municipio':municipio},
        'nota_datasets':        'Los datasets re-procesados incluyen sexo y hospitalización. Los anteriores solo aportan estrato y crec_dllo.' if total_hist > 0 else None,
    }


# ── Proyecciones anuales / mensuales ─────────────────────────────────────────

@router.get('/proyecciones')
async def proyecciones_endpoint(
    dpto:      str  = Query('CESAR'),
    municipio: str | None = Query(None),
    vista:     str  = Query('anual', pattern='^(anual|mensual)$'),
    _user: dict = Depends(require_anl),
):
    """
    Proyecciones construidas desde datos reales:
      anual  → agrega por año desde datasets_ml + BD
      mensual → agrega por mes desde BD (últimos 24 meses)
    """
    cod_dpto = _NOMBRE_A_COD.get(dpto.upper())

    if vista == 'anual':
        # Datasets habilitados filtrados por departamento
        df_hist = _cargar_datasets(cod_dpto=cod_dpto, dpto_nombre=dpto, municipio=municipio)

        anio_hist: dict[int,dict] = defaultdict(lambda:{'casos':0,'severo':0,'moderado':0})

        # Intentar usar columna de año si existe en el CSV
        anio_col = None
        if not df_hist.empty:
            for col in ('anio','año','year','ano'):
                if col in df_hist.columns:
                    anio_col = col; break

        if not df_hist.empty and anio_col and 'clas_peso' in df_hist.columns:
            for anio, grp in df_hist.groupby(anio_col):
                try: a = int(anio)
                except: continue
                anio_hist[a]['casos'] += len(grp)
                anio_hist[a]['severo']   += int((grp['clas_peso']==1).sum())
                anio_hist[a]['moderado'] += int((grp['clas_peso']==2).sum())

        # BD — controles por año filtrados por departamento
        q = supabase.table('controles').select('fecha, clas_nombre, paciente_id')
        pac_q = supabase.table('pacientes').select('id').ilike('dpto_residencia', f'%{dpto}%')
        if municipio:
            pac_q = supabase.table('pacientes').select('id').ilike('dpto_residencia', f'%{dpto}%').ilike('municipio_res', f'%{municipio}%')
        pac_ids = [p['id'] for p in (pac_q.execute().data or [])]
        if pac_ids:
            ctrls = q.in_('paciente_id', pac_ids).execute().data or []
            for c in ctrls:
                fs = c.get('fecha','')
                if not fs: continue
                try: a = int(fs[:4])
                except: continue
                key = _clas_key(c.get('clas_nombre'))
                anio_hist[a]['casos'] += 1
                if key == 'severo':   anio_hist[a]['severo'] += 1
                if key == 'moderado': anio_hist[a]['moderado'] += 1

        historico = sorted([
            {
                'anio':         a,
                'casos':        d['casos'],
                'tasa_severa':  round(d['severo']/d['casos']*100,1)   if d['casos'] else 0,
                'tasa_moderada':round(d['moderado']/d['casos']*100,1) if d['casos'] else 0,
            }
            for a,d in anio_hist.items() if d['casos']>0
        ], key=lambda x:x['anio'])

        if not historico:
            return {'historico':[],'proyeccion':[],'dpto':dpto,'municipio':municipio}

        n    = len(historico)
        anos = [historico[-1]['anio']+i for i in range(1,4)]
        proj = []
        for i,anio in enumerate(anos):
            paso = n+i
            p = {'anio':anio,'proyeccion':True}
            for campo in ('casos','tasa_severa','tasa_moderada'):
                ys = [h[campo] for h in historico]
                val = max(0, _linreg(range(n), ys, paso))
                p[campo] = round(val) if campo=='casos' else round(val,1)
            proj.append(p)

        return {'historico':historico,'proyeccion':proj,'dpto':dpto,'municipio':municipio}

    else:  # mensual — últimos 24 meses desde BD
        pac_q = supabase.table('pacientes').select('id').ilike('dpto_residencia',f'%{dpto}%')
        if municipio: pac_q = pac_q.ilike('municipio_res',f'%{municipio}%')
        pac_ids = [p['id'] for p in (pac_q.execute().data or [])]

        if not pac_ids:
            return {'historico':[],'proyeccion':[],'dpto':dpto,'municipio':municipio}

        ctrls = (supabase.table('controles')
                 .select('fecha, clas_nombre')
                 .in_('paciente_id', pac_ids)
                 .order('fecha')
                 .execute().data or [])

        mes_data: dict[str,dict] = defaultdict(lambda:{'casos':0,'severo':0,'moderado':0,'y':0,'m':0})
        for c in ctrls:
            fs = c.get('fecha','')
            if not fs: continue
            try: y,m = int(fs[:4]),int(fs[5:7])
            except: continue
            am = f'{y:04d}-{m:02d}'
            mes_data[am]['casos'] += 1
            mes_data[am]['y'] = y; mes_data[am]['m'] = m
            key = _clas_key(c.get('clas_nombre'))
            if key == 'severo':   mes_data[am]['severo'] += 1
            if key == 'moderado': mes_data[am]['moderado'] += 1

        historico = sorted([
            {
                'anio_mes':      am,
                'mes':           f'{MESES[d["m"]-1]} {str(d["y"])[2:]}',
                'casos':         d['casos'],
                'tasa_severa':   round(d['severo']/d['casos']*100,1)   if d['casos'] else 0,
                'tasa_moderada': round(d['moderado']/d['casos']*100,1) if d['casos'] else 0,
                'y':d['y'],'m':d['m'],
            }
            for am,d in mes_data.items()
        ], key=lambda x:(x['y'],x['m']))

        for p in historico: p.pop('y',None); p.pop('m',None)

        proyeccion = []
        if len(historico) >= 3:
            n = len(historico)
            hoy = date.today()
            for step in range(1,7):
                m_idx  = (hoy.month-1+step)%12
                y_step = hoy.year+(hoy.month-1+step)//12
                p = {'mes':f'{MESES[m_idx]} {str(y_step)[2:]}','proyeccion':True}
                for campo in ('casos','tasa_severa','tasa_moderada'):
                    ys = [h[campo] for h in historico]
                    val = max(0, _linreg(range(n), ys, n-1+step))
                    p[campo] = round(val) if campo=='casos' else round(val,1)
                proyeccion.append(p)

        return {'historico':historico,'proyeccion':proyeccion,'dpto':dpto,'municipio':municipio}


# ── Opciones geográficas ──────────────────────────────────────────────────────

@router.get('/geo')
async def geo_opciones(
    dpto: str | None = Query(None),
    _user: dict = Depends(require_anl),
):
    """
    Devuelve departamentos y municipios disponibles.
    Si se pasa dpto, los municipios se filtran para ese departamento.
    """
    proc_dir = Path(settings.data_proc_dir)

    # BD
    res      = supabase.table('pacientes').select('dpto_residencia, municipio_res').execute()
    pacs     = res.data or []
    dptos_bd = {p['dpto_residencia'].upper() for p in pacs if p.get('dpto_residencia')}
    munis_bd = {
        p['municipio_res'].upper() for p in pacs
        if p.get('municipio_res') and (not dpto or (p.get('dpto_residencia','').upper() == dpto.upper()))
    }

    # Datasets
    dptos_ds: set[str] = set()
    munis_ds:  set[str] = set()
    for ruta in proc_dir.glob('dataset_*.csv'):
        try:
            df = pd.read_csv(ruta, usecols=lambda c: c in ('ndep_resi','nmun_resi'), low_memory=False)
            if 'ndep_resi' in df.columns:
                dptos_ds.update(df['ndep_resi'].dropna().str.upper().unique())
            if 'nmun_resi' in df.columns:
                sub = df
                if dpto and 'ndep_resi' in df.columns:
                    sub = df[df['ndep_resi'].str.upper() == dpto.upper()]
                munis_ds.update(sub['nmun_resi'].dropna().str.upper().unique())
        except Exception:
            pass

    return {
        'departamentos': sorted(dptos_bd | dptos_ds),
        'municipios':    sorted(munis_bd | munis_ds),
    }
