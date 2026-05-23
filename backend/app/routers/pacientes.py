from fastapi import APIRouter, HTTPException, Depends, status
from datetime import date
from app.auth.dependencies import get_current_user, require_cli
from app.database import supabase
from app.schemas.paciente import PacienteCreate, PacienteOut, PacienteDetalle
from app.ml.predictor import predecir, calcular_zscore

router = APIRouter(prefix='/pacientes', tags=['pacientes'])


def _edad_meses(fecha_nac: date) -> int:
    hoy = date.today()
    return (hoy.year - fecha_nac.year) * 12 + (hoy.month - fecha_nac.month)


def _generar_alertas(paciente_id: int, control_id: int, prediccion: dict,
                     zscore: float | None, user_id: str):
    alertas = []

    if prediccion['clas_peso'] == 1:
        alertas.append({
            'paciente_id': paciente_id, 'control_id': control_id,
            'tipo': 'Desnutrición severa detectada', 'nivel': 'severe',
            'mensaje': f'Probabilidad: {prediccion["prob_desnutrido"]*100:.0f}%',
            'registrado_por': user_id,
        })
    elif prediccion['clas_peso'] == 2:
        alertas.append({
            'paciente_id': paciente_id, 'control_id': control_id,
            'tipo': 'Desnutrición moderada detectada', 'nivel': 'moderate',
            'mensaje': f'Probabilidad: {prediccion["prob_desnutrido"]*100:.0f}%',
            'registrado_por': user_id,
        })
    elif prediccion['prob_desnutrido'] > 0.5:
        alertas.append({
            'paciente_id': paciente_id, 'control_id': control_id,
            'tipo': 'Riesgo alto de desnutrición', 'nivel': 'risk',
            'mensaje': f'Probabilidad: {prediccion["prob_desnutrido"]*100:.0f}%',
            'registrado_por': user_id,
        })

    if zscore is not None and zscore < -3:
        alertas.append({
            'paciente_id': paciente_id, 'control_id': control_id,
            'tipo': 'Z-score crítico (< -3)', 'nivel': 'severe',
            'mensaje': f'Z-score P/E: {zscore}',
            'registrado_por': user_id,
        })

    if alertas:
        supabase.table('alertas').insert(alertas).execute()


@router.get('/', response_model=list[PacienteOut])
async def listar_pacientes(
    q: str = '',
    estado: str = '',
    user: dict = Depends(require_cli),
):
    query = supabase.table('pacientes').select(
        'id, nombre, apellidos, dni, fecha_nac, sexo, zona, establecimiento,'
        'controles(id, fecha, peso_act, talla_act, imc, zscore_pt, clas_peso_pred, '
        'clas_nombre, prob_desnutrido, observaciones, created_at)'
    ).order('created_at', desc=True)

    if q:
        query = query.ilike('nombre', f'%{q}%')

    result = query.execute()

    pacientes = []
    for p in (result.data or []):
        controles = sorted(p.pop('controles', []), key=lambda c: c['fecha'], reverse=True)
        ultimo    = controles[0] if controles else None
        em        = _edad_meses(date.fromisoformat(p['fecha_nac']))
        pacientes.append({
            **p,
            'edad_meses':        em,
            'ultimo_control':    ultimo,
            'estado_nutricional': ultimo.get('clas_nombre') if ultimo else None,
        })

    return pacientes


@router.post('/', status_code=status.HTTP_201_CREATED)
async def crear_paciente(
    body: PacienteCreate,
    user: dict = Depends(require_cli),
):
    em = _edad_meses(body.fecha_nac)

    fila = {
        'nombre': body.nombre, 'apellidos': body.apellidos,
        'dni': body.dni, 'fecha_nac': body.fecha_nac.isoformat(),
        'sexo': body.sexo, 'per_etn_': body.per_etn_,
        'peso_nac': body.peso_nac, 'edad_ges': body.edad_ges,
        't_lechem': body.t_lechem, 'e_complem': body.e_complem,
        'esq_vac': body.esq_vac, 'carne_vac': body.carne_vac,
        'crec_dllo': body.crec_dllo, 'gp_pobicbf': body.gp_pobicbf or 2,
        'area_': body.area_, 'cod_dpto_o': body.cod_dpto_o,
        'zona': body.zona, 'establecimiento': body.establecimiento,
        'estrato_': body.estrato_, 'niv_educat': body.niv_educat,
        'menores': body.menores, 'factores_sociales': body.factores_sociales,
        'registrado_por': user['id'],
    }

    res = supabase.table('pacientes').insert(fila).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail='Error al crear paciente')

    paciente_id = res.data[0]['id']

    # Primer control si se proporcionaron datos antropométricos
    if body.peso_act:
        datos_pred = {
            'edad_meses': em, 'peso_act': body.peso_act,
            'talla_act': body.talla_act, 'per_braqui': body.per_braqui,
            'per_etn_': body.per_etn_, 'estrato_': body.estrato_,
            'area_': body.area_, 'cod_dpto_o': body.cod_dpto_o,
            'niv_educat': body.niv_educat, 'menores': body.menores,
            'gp_pobicbf': body.gp_pobicbf or 2,
            'peso_nac': body.peso_nac, 'edad_ges': body.edad_ges,
            't_lechem': body.t_lechem, 'e_complem': body.e_complem,
            'crec_dllo': body.crec_dllo, 'esq_vac': body.esq_vac,
            'carne_vac': body.carne_vac,
        }
        pred    = predecir(datos_pred)
        zscore  = calcular_zscore(body.peso_act, em, body.sexo)
        imc     = pred.get('imc_calculado')

        ctrl = {
            'paciente_id': paciente_id, 'fecha': date.today().isoformat(),
            'peso_act': body.peso_act, 'talla_act': body.talla_act,
            'per_braqui': body.per_braqui, 'imc': imc,
            'zscore_pt': zscore,
            'clas_peso_pred': pred['clas_peso'],
            'clas_nombre': pred['clas_nombre'],
            'prob_desnutrido': pred['prob_desnutrido'],
            'modelo_usado': pred['modelo_usado'],
            'observaciones': body.observaciones,
            'registrado_por': user['id'],
        }
        ctrl_res = supabase.table('controles').insert(ctrl).execute()
        if ctrl_res.data:
            _generar_alertas(paciente_id, ctrl_res.data[0]['id'],
                             pred, zscore, user['id'])

    return {'id': paciente_id, 'message': 'Paciente registrado'}


@router.get('/{paciente_id}', response_model=PacienteDetalle)
async def obtener_paciente(
    paciente_id: int,
    user: dict = Depends(require_cli),
):
    res = supabase.table('pacientes').select(
        '*, controles(*, registrado_por), alertas(*)'
    ).eq('id', paciente_id).single().execute()

    if not res.data:
        raise HTTPException(status_code=404, detail='Paciente no encontrado')

    p  = res.data
    em = _edad_meses(date.fromisoformat(p['fecha_nac']))
    p['edad_meses'] = em

    controles = sorted(p.get('controles', []), key=lambda c: c['fecha'], reverse=True)
    p['controles']  = controles
    p['ultimo_control'] = controles[0] if controles else None
    p['estado_nutricional'] = controles[0].get('clas_nombre') if controles else None

    return p
