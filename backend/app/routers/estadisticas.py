from collections import defaultdict
from fastapi import APIRouter, Depends
from app.auth.dependencies import get_current_user
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

def _clas_key(clas_nombre: str | None) -> str:
    n = (clas_nombre or '').lower()
    if 'severa'   in n: return 'severo'
    if 'moderada' in n: return 'moderado'
    if 'bajo'     in n: return 'leve'
    if 'normal'   in n: return 'adecuado'
    return 'riesgo'


@router.get('')
async def estadisticas(user: dict = Depends(get_current_user)):
    # ── 1. Pacientes con su último control ────────────────────────────────────
    p_res = supabase.table('pacientes').select(
        'id, area_, municipio_res, zona, '
        'controles(fecha, clas_nombre, clas_peso_pred, prob_desnutrido)'
    ).execute()

    pacientes = p_res.data or []
    total = len(pacientes)

    estado_counts: dict[str, int] = defaultdict(int)
    area_urban = 0
    area_rural = 0
    zona_counts: dict[str, int] = defaultdict(int)
    en_riesgo   = 0
    desnutridos = 0  # moderada + severa

    for p in pacientes:
        controles = sorted(
            p.get('controles', []),
            key=lambda c: c.get('fecha', ''), reverse=True,
        )
        ultimo = controles[0] if controles else None

        clas = ultimo.get('clas_nombre') if ultimo else None
        estado_counts[clas or 'Sin datos'] += 1

        key = _clas_key(clas)
        if key != 'adecuado':
            en_riesgo += 1
        if key in ('moderado', 'severo'):
            desnutridos += 1

        area = p.get('area_')
        if area == 1:
            area_urban += 1
        elif area == 2:
            area_rural += 1

        zona = p.get('municipio_res') or p.get('zona') or 'No especificado'
        zona_counts[zona] += 1

    tasa_desnutricion = round(desnutridos / total * 100, 1) if total else 0

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

    zonas_riesgo = [
        {'zona': z, 'casos': c}
        for z, c in sorted(zona_counts.items(), key=lambda x: -x[1])
        if z != 'No especificado'
    ][:5]

    zonas_monitoreadas = len([z for z in zona_counts if z != 'No especificado'])

    # ── 2. Tendencia mensual — últimos 6 meses (todos los controles) ──────────
    c_res = supabase.table('controles').select(
        'fecha, clas_nombre'
    ).order('fecha').execute()

    controles_todos = c_res.data or []

    # Determinar rango últimos 6 meses
    from datetime import date
    hoy    = date.today()
    meses6 = []
    for i in range(5, -1, -1):
        m = (hoy.month - i - 1) % 12 + 1
        y = hoy.year - ((hoy.month - i - 1) // 12)
        meses6.append((y, m))

    tendencia: dict[tuple, dict] = {
        (y, m): {'adecuado': 0, 'riesgo': 0, 'leve': 0, 'moderado': 0, 'severo': 0}
        for y, m in meses6
    }

    for ctrl in controles_todos:
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
            'mes':       MESES[m - 1],
            'adecuado':  v['adecuado'],
            'riesgo':    v['riesgo'],
            'leve':      v['leve'],
            'moderado':  v['moderado'],
            'severo':    v['severo'],
        }
        for (y, m), v in sorted(tendencia.items())
    ]

    return {
        'total':               total,
        'en_riesgo':           en_riesgo,
        'tasa_desnutricion':   tasa_desnutricion,
        'zonas_monitoreadas':  zonas_monitoreadas,
        'distribucion_estado': distribucion_estado,
        'distribucion_area':   distribucion_area,
        'zonas_riesgo':        zonas_riesgo,
        'tendencia_mensual':   tendencia_mensual,
    }
