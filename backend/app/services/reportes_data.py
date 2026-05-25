"""
Funciones de agregación de datos para los 4 tipos de reporte.
Todas las funciones son async y retornan dicts listos para el router.
"""
from collections import defaultdict
from datetime import date, datetime
from app.database import supabase

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


def _clas_key(clas_nombre: str | None) -> str:
    n = (clas_nombre or '').lower()
    if 'severa'   in n: return 'severo'
    if 'moderada' in n: return 'moderado'
    if 'leve'     in n: return 'leve'
    if 'normal'   in n: return 'adecuado'
    return 'riesgo'


def _es_riesgo(clas_nombre: str | None) -> bool:
    return _clas_key(clas_nombre) != 'adecuado'


def _es_desnutricion_ms(clas_nombre: str | None) -> bool:
    k = _clas_key(clas_nombre)
    return k in ('moderado', 'severo')


def _parse_date(s: str | None) -> date | None:
    if not s:
        return None
    try:
        return datetime.strptime(s[:10], '%Y-%m-%d').date()
    except Exception:
        return None


def _ultimos_6_meses(fecha_hasta: str | None) -> list[tuple[int, int]]:
    """Retorna lista de (año, mes) de los últimos 6 meses hasta fecha_hasta."""
    ref = _parse_date(fecha_hasta) or date.today()
    meses = []
    for i in range(5, -1, -1):
        m = (ref.month - i - 1) % 12 + 1
        y = ref.year - ((ref.month - i - 1) // 12)
        meses.append((y, m))
    return meses


def _in_period(fecha_str: str | None, fecha_desde: str | None, fecha_hasta: str | None) -> bool:
    d = _parse_date(fecha_str)
    if d is None:
        return False
    if fecha_desde:
        dd = _parse_date(fecha_desde)
        if dd and d < dd:
            return False
    if fecha_hasta:
        dh = _parse_date(fecha_hasta)
        if dh and d > dh:
            return False
    return True


# ── 1. Reporte Nutricional ────────────────────────────────────────────────────

async def reporte_nutricional(filtros: dict) -> dict:
    fecha_desde   = filtros.get('fecha_desde')
    fecha_hasta   = filtros.get('fecha_hasta')
    zona          = filtros.get('zona')
    establecimiento = filtros.get('establecimiento')

    # Traer pacientes con controles
    p_res = supabase.table('pacientes').select(
        'id, nombre, apellidos, area_, municipio_res, establecimiento, '
        'controles(fecha, clas_nombre, zscore_pt, prob_desnutrido)'
    ).execute()
    pacientes = p_res.data or []

    # Filtrar por zona/establecimiento si aplica
    if zona and zona.lower() not in ('todos', 'todas', ''):
        pacientes = [p for p in pacientes if (p.get('municipio_res') or '').lower() == zona.lower()]
    if establecimiento and establecimiento.lower() not in ('todos', 'todas', ''):
        pacientes = [p for p in pacientes if (p.get('establecimiento') or '').lower() == establecimiento.lower()]

    total_pacientes = len(pacientes)
    estado_counts: dict[str, int] = defaultdict(int)
    area_urban = 0
    area_rural = 0
    zona_counts: dict[str, int] = defaultdict(int)
    en_riesgo = 0
    desnutricion_ms = 0
    controles_en_periodo = 0
    zscores: list[float] = []

    for p in pacientes:
        controles = sorted(
            p.get('controles', []),
            key=lambda c: c.get('fecha', ''),
            reverse=True,
        )

        # Controles en período
        ctrl_periodo = [c for c in controles if _in_period(c.get('fecha'), fecha_desde, fecha_hasta)]
        controles_en_periodo += len(ctrl_periodo)

        # Último control general
        ultimo = controles[0] if controles else None
        clas = ultimo.get('clas_nombre') if ultimo else None
        estado_counts[clas or 'Sin datos'] += 1

        if _es_riesgo(clas):
            en_riesgo += 1
        if _es_desnutricion_ms(clas):
            desnutricion_ms += 1

        area = p.get('area_')
        if area == 1:
            area_urban += 1
        elif area == 2:
            area_rural += 1

        muni = p.get('municipio_res') or 'No especificado'
        zona_counts[muni] += 1

        # Z-scores de controles en período
        for c in ctrl_periodo:
            zs = c.get('zscore_pt')
            if zs is not None:
                try:
                    zscores.append(float(zs))
                except Exception:
                    pass

    tasa_desnutricion = round(desnutricion_ms / total_pacientes * 100, 1) if total_pacientes else 0
    zscore_promedio = round(sum(zscores) / len(zscores), 2) if zscores else None

    # Tendencia mensual últimos 6 meses
    meses6 = _ultimos_6_meses(fecha_hasta)
    tendencia: dict[tuple, dict] = {
        (y, m): {'adecuado': 0, 'riesgo': 0, 'leve': 0, 'moderado': 0, 'severo': 0}
        for y, m in meses6
    }

    for p in pacientes:
        for ctrl in p.get('controles', []):
            fecha_str = ctrl.get('fecha', '')
            if not fecha_str:
                continue
            try:
                parts = fecha_str.split('-')
                y, m = int(parts[0]), int(parts[1])
            except Exception:
                continue
            if (y, m) not in tendencia:
                continue
            key = _clas_key(ctrl.get('clas_nombre'))
            tendencia[(y, m)][key] += 1

    tendencia_mensual = [
        {
            'mes':      MESES[m - 1],
            'adecuado': v['adecuado'],
            'riesgo':   v['riesgo'],
            'leve':     v['leve'],
            'moderado': v['moderado'],
            'severo':   v['severo'],
        }
        for (y, m), v in sorted(tendencia.items())
    ]

    distribucion_estado = [
        {
            'estado':   estado,
            'cantidad': cnt,
            'fill':     ESTADO_FILL.get(estado, '#9CA3AF'),
        }
        for estado, cnt in sorted(estado_counts.items(), key=lambda x: -x[1])
    ]

    area_total = area_urban + area_rural
    distribucion_area = [
        {'name': 'Urbana', 'value': round(area_urban / area_total * 100) if area_total else 0, 'fill': '#4FB4D2'},
        {'name': 'Rural',  'value': round(area_rural  / area_total * 100) if area_total else 0, 'fill': '#6FCF97'},
    ]

    zonas_top = [
        {'zona': z, 'casos': c}
        for z, c in sorted(zona_counts.items(), key=lambda x: -x[1])
        if z != 'No especificado'
    ][:10]

    return {
        'kpis': {
            'total_pacientes':           total_pacientes,
            'en_riesgo':                 en_riesgo,
            'desnutricion_moderada_severa': desnutricion_ms,
            'tasa_desnutricion':         tasa_desnutricion,
            'controles_en_periodo':      controles_en_periodo,
            'zscore_promedio':           zscore_promedio,
        },
        'charts': {
            'distribucion_estado': distribucion_estado,
            'distribucion_area':   distribucion_area,
            'tendencia_mensual':   tendencia_mensual,
            'zonas_top':           zonas_top,
        },
        'distribucion': {
            'por_estado': {e['estado']: e['cantidad'] for e in distribucion_estado},
            'por_area':   {'urbana': area_urban, 'rural': area_rural},
            'zonas_top':  zonas_top[:5],
        },
    }


# ── 2. Reporte Epidemiológico ─────────────────────────────────────────────────

async def reporte_epidemiologico(filtros: dict) -> dict:
    fecha_desde = filtros.get('fecha_desde')
    fecha_hasta = filtros.get('fecha_hasta')
    zona        = filtros.get('zona')
    establecimiento = filtros.get('establecimiento')

    # Traer controles con datos del paciente
    c_res = supabase.table('controles').select(
        'id, fecha, clas_nombre, prob_desnutrido, '
        'pacientes(id, nombre, apellidos, sexo, fecha_nac, municipio_res, establecimiento, area_)'
    ).execute()
    controles_raw = c_res.data or []

    # Filtrar por período
    controles = [c for c in controles_raw if _in_period(c.get('fecha'), fecha_desde, fecha_hasta)]

    # Filtrar por zona/establecimiento
    def _get_pac_field(c, field):
        pac = c.get('pacientes') or {}
        if isinstance(pac, list):
            pac = pac[0] if pac else {}
        return pac.get(field)

    if zona and zona.lower() not in ('todos', 'todas', ''):
        controles = [c for c in controles if (_get_pac_field(c, 'municipio_res') or '').lower() == zona.lower()]
    if establecimiento and establecimiento.lower() not in ('todos', 'todas', ''):
        controles = [c for c in controles if (_get_pac_field(c, 'establecimiento') or '').lower() == establecimiento.lower()]

    total_controles = len(controles)

    # Incidencia por municipio
    muni_total: dict[str, int]  = defaultdict(int)
    muni_riesgo: dict[str, int] = defaultdict(int)

    # Distribución sexo
    sexo_counts: dict[str, int] = defaultdict(int)

    # Distribución edad
    edad_bins = {
        '0-5m': 0, '6-11m': 0, '12-23m': 0, '24-35m': 0, '36-59m': 0, '60m+': 0,
    }

    # Tendencia mensual
    meses6 = _ultimos_6_meses(fecha_hasta)
    tend_meses: dict[tuple, int] = {(y, m): 0 for y, m in meses6}

    probs: list[float] = []
    municipios_set: set[str] = set()

    for ctrl in controles:
        pac = ctrl.get('pacientes') or {}
        if isinstance(pac, list):
            pac = pac[0] if pac else {}

        muni = pac.get('municipio_res') or 'No especificado'
        municipios_set.add(muni)
        muni_total[muni] += 1
        if _es_riesgo(ctrl.get('clas_nombre')):
            muni_riesgo[muni] += 1

        sexo = pac.get('sexo') or 'N/E'
        sexo_counts[sexo] += 1

        edad = None
        fnac = pac.get('fecha_nac')
        if fnac:
            try:
                d = _parse_date(fnac)
                if d:
                    hoy = date.today()
                    edad = (hoy.year - d.year) * 12 + (hoy.month - d.month)
            except Exception:
                pass
        if edad is not None:
            if edad <= 5:      edad_bins['0-5m'] += 1
            elif edad <= 11:   edad_bins['6-11m'] += 1
            elif edad <= 23:   edad_bins['12-23m'] += 1
            elif edad <= 35:   edad_bins['24-35m'] += 1
            elif edad <= 59:   edad_bins['36-59m'] += 1
            else:              edad_bins['60m+'] += 1

        prob = ctrl.get('prob_desnutrido')
        if prob is not None:
            try:
                probs.append(float(prob))
            except Exception:
                pass

        fecha_str = ctrl.get('fecha', '')
        try:
            parts = fecha_str.split('-')
            y, m = int(parts[0]), int(parts[1])
            if (y, m) in tend_meses:
                tend_meses[(y, m)] += 1
        except Exception:
            pass

    prob_promedio = round(sum(probs) / len(probs) * 100, 1) if probs else 0

    # Top 10 municipios por riesgo
    incidencia_municipios = sorted(
        [
            {
                'municipio': muni,
                'total':     muni_total[muni],
                'riesgo':    muni_riesgo.get(muni, 0),
                'tasa':      round(muni_riesgo.get(muni, 0) / muni_total[muni] * 100, 1) if muni_total[muni] else 0,
            }
            for muni in muni_total
            if muni != 'No especificado'
        ],
        key=lambda x: -x['riesgo'],
    )[:10]

    municipio_mayor_carga = incidencia_municipios[0]['municipio'] if incidencia_municipios else 'N/A'

    tendencia_casos = [
        {'mes': MESES[m - 1], 'casos': tend_meses[(y, m)]}
        for (y, m) in sorted(tend_meses.keys())
    ]

    distribucion_sexo = [
        {'sexo': 'Masculino' if k == 'M' else 'Femenino' if k == 'F' else k, 'cantidad': v, 'fill': '#4FB4D2' if k == 'M' else '#F06292'}
        for k, v in sexo_counts.items()
    ]

    distribucion_edad = [
        {'rango': rango, 'cantidad': cnt}
        for rango, cnt in edad_bins.items()
        if cnt > 0
    ]

    return {
        'kpis': {
            'total_controles':            total_controles,
            'municipios_afectados':       len(municipios_set),
            'prob_promedio_desnutricion': prob_promedio,
            'municipio_mayor_carga':      municipio_mayor_carga,
        },
        'charts': {
            'incidencia_municipios': incidencia_municipios,
            'tendencia_casos':       tendencia_casos,
            'distribucion_sexo':     distribucion_sexo,
            'distribucion_edad':     distribucion_edad,
        },
        'distribucion': {
            'municipios_top': incidencia_municipios[:5],
            'por_sexo':       {d['sexo']: d['cantidad'] for d in distribucion_sexo},
            'por_edad':       dict(edad_bins),
        },
    }


# ── 3. Reporte Pacientes ──────────────────────────────────────────────────────

async def reporte_pacientes(filtros: dict) -> dict:
    fecha_desde   = filtros.get('fecha_desde')
    fecha_hasta   = filtros.get('fecha_hasta')
    zona          = filtros.get('zona')
    establecimiento = filtros.get('establecimiento')

    p_res = supabase.table('pacientes').select(
        'id, nombre, apellidos, sexo, fecha_nac, area_, municipio_res, establecimiento, '
        'controles(fecha, clas_nombre)'
    ).execute()
    pacientes = p_res.data or []

    if zona and zona.lower() not in ('todos', 'todas', ''):
        pacientes = [p for p in pacientes if (p.get('municipio_res') or '').lower() == zona.lower()]
    if establecimiento and establecimiento.lower() not in ('todos', 'todas', ''):
        pacientes = [p for p in pacientes if (p.get('establecimiento') or '').lower() == establecimiento.lower()]

    total_pacientes = len(pacientes)
    sin_seguimiento = 0
    con_desnutricion = 0
    estado_counts: dict[str, int] = defaultdict(int)
    area_urban = 0
    area_rural = 0
    edad_piramide = {
        '0-5m': 0, '6-11m': 0, '12-23m': 0, '24-35m': 0, '36-59m': 0,
    }

    tabla: list[dict] = []

    for p in pacientes:
        controles = sorted(
            p.get('controles', []),
            key=lambda c: c.get('fecha', ''),
            reverse=True,
        )

        ctrl_periodo = [c for c in controles if _in_period(c.get('fecha'), fecha_desde, fecha_hasta)]
        tiene_seguimiento = len(ctrl_periodo) > 0

        if not tiene_seguimiento:
            sin_seguimiento += 1

        ultimo = controles[0] if controles else None
        clas = ultimo.get('clas_nombre') if ultimo else None
        estado_counts[clas or 'Sin datos'] += 1

        if _es_desnutricion_ms(clas):
            con_desnutricion += 1

        area = p.get('area_')
        if area == 1:
            area_urban += 1
        elif area == 2:
            area_rural += 1

        # Calcular edad en meses desde fecha_nac
        edad = None
        fnac = p.get('fecha_nac')
        if fnac:
            try:
                d = _parse_date(fnac)
                if d:
                    hoy = date.today()
                    edad = (hoy.year - d.year) * 12 + (hoy.month - d.month)
            except Exception:
                pass

        if edad is not None:
            if edad <= 5:    edad_piramide['0-5m'] += 1
            elif edad <= 11: edad_piramide['6-11m'] += 1
            elif edad <= 23: edad_piramide['12-23m'] += 1
            elif edad <= 35: edad_piramide['24-35m'] += 1
            else:            edad_piramide['36-59m'] += 1

        # Construir fila de tabla
        edad_str = ''
        if edad is not None:
            edad_str = f'{edad // 12}a {edad % 12}m' if edad >= 12 else f'{edad}m'

        if len(tabla) < 200:
            tabla.append({
                'id':            p.get('id'),
                'nombre':        f"{p.get('nombre', '')} {p.get('apellidos', '')}".strip(),
                'edad':          edad_str,
                'sexo':          'M' if p.get('sexo') == 'M' else 'F' if p.get('sexo') == 'F' else 'N/E',
                'municipio':     p.get('municipio_res') or 'N/E',
                'establecimiento': p.get('establecimiento') or 'N/E',
                'ultimo_estado': clas or 'Sin datos',
                'ultimo_control': ultimo.get('fecha', 'Sin controles') if ultimo else 'Sin controles',
                'n_controles':   len(controles),
                'seguimiento':   tiene_seguimiento,
            })

    tasa_sin_seguimiento = round(sin_seguimiento / total_pacientes * 100, 1) if total_pacientes else 0

    distribucion_estado = [
        {'estado': estado, 'cantidad': cnt, 'fill': ESTADO_FILL.get(estado, '#9CA3AF')}
        for estado, cnt in sorted(estado_counts.items(), key=lambda x: -x[1])
    ]

    area_total = area_urban + area_rural
    distribucion_area = [
        {'name': 'Urbana', 'value': round(area_urban / area_total * 100) if area_total else 0, 'fill': '#4FB4D2'},
        {'name': 'Rural',  'value': round(area_rural  / area_total * 100) if area_total else 0, 'fill': '#6FCF97'},
    ]

    piramide_edad = [
        {'rango': rango, 'cantidad': cnt}
        for rango, cnt in edad_piramide.items()
    ]

    return {
        'kpis': {
            'total_pacientes':          total_pacientes,
            'sin_seguimiento_periodo':  sin_seguimiento,
            'con_desnutricion':         con_desnutricion,
            'tasa_sin_seguimiento':     tasa_sin_seguimiento,
        },
        'charts': {
            'distribucion_estado': distribucion_estado,
            'distribucion_area':   distribucion_area,
            'piramide_edad':       piramide_edad,
        },
        'tabla': tabla,
        'distribucion': {
            'por_estado': {e['estado']: e['cantidad'] for e in distribucion_estado},
            'por_area':   {'urbana': area_urban, 'rural': area_rural},
            'sin_seguimiento': sin_seguimiento,
        },
    }


# ── 4. Reporte Modelo ML ──────────────────────────────────────────────────────

async def reporte_modelo(_filtros: dict) -> dict:
    # Modelo activo
    activo_res = supabase.table('modelos_ml').select('*').eq('activo', True).limit(1).execute()
    activo = (activo_res.data or [{}])[0]

    # Historial de modelos (últimos 10)
    hist_res = supabase.table('modelos_ml').select(
        'id, nombre, created_at, version, metricas, activo'
    ).order('created_at', desc=True).limit(10).execute()
    historial = hist_res.data or []

    # Total predicciones
    pred_res = supabase.table('controles').select('id', count='exact').execute()
    total_predicciones = pred_res.count or 0

    def _get_metric(metricas: dict | None, key: str) -> float | None:
        if not metricas:
            return None
        v = metricas.get(f'a_{key}') or metricas.get(key)
        if v is None:
            return None
        try:
            return round(float(v), 4)
        except Exception:
            return None

    metricas_activo = activo.get('metricas') or {}

    accuracy  = _get_metric(metricas_activo, 'accuracy')
    f1        = _get_metric(metricas_activo, 'f1') or _get_metric(metricas_activo, 'f1_score')
    precision = _get_metric(metricas_activo, 'precision')
    recall    = _get_metric(metricas_activo, 'recall')
    roc_auc   = _get_metric(metricas_activo, 'roc_auc')

    def _to_pct(v: float | None) -> float:
        if v is None:
            return 0.0
        return round(v * 100, 1) if v <= 1.0 else round(v, 1)

    radar_metricas = [
        {'metric': 'Accuracy',  'value': _to_pct(accuracy)},
        {'metric': 'F1-Score',  'value': _to_pct(f1)},
        {'metric': 'Precision', 'value': _to_pct(precision)},
        {'metric': 'Recall',    'value': _to_pct(recall)},
        {'metric': 'ROC-AUC',   'value': _to_pct(roc_auc)},
    ]

    evolucion_accuracy = []
    for m in reversed(historial):
        met = m.get('metricas') or {}
        acc = _get_metric(met, 'accuracy')
        # fecha: prefer version (ts string) else created_at
        fecha_raw = m.get('version') or m.get('created_at') or ''
        fecha_str = fecha_raw[:10]
        evolucion_accuracy.append({
            'nombre':   m.get('nombre') or 'sin nombre',
            'fecha':    fecha_str,
            'accuracy': _to_pct(acc),
        })

    return {
        'kpis': {
            'nombre_modelo':      activo.get('nombre') or 'N/A',
            'accuracy':           _to_pct(accuracy),
            'f1_score':           _to_pct(f1),
            'precision':          _to_pct(precision),
            'recall':             _to_pct(recall),
            'total_predicciones': total_predicciones,
            'modelos_entrenados': len(historial),
        },
        'charts': {
            'radar_metricas':     radar_metricas,
            'evolucion_accuracy': evolucion_accuracy,
        },
        'distribucion': {
            'metricas_activo': {
                'accuracy':  _to_pct(accuracy),
                'f1':        _to_pct(f1),
                'precision': _to_pct(precision),
                'recall':    _to_pct(recall),
                'roc_auc':   _to_pct(roc_auc),
            },
            'total_modelos': len(historial),
        },
    }
