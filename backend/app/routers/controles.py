from fastapi import APIRouter, HTTPException, Depends, status
from datetime import date
from app.auth.dependencies import require_cli
from app.database import supabase
from app.schemas.control import ControlCreate, ControlOut, PrediccionOut
from app.ml.predictor import predecir, calcular_zscore
from app.ml.who_tables import clasificar_muac
from app.routers.pacientes import _generar_alertas

router = APIRouter(prefix='/pacientes/{paciente_id}/controles', tags=['controles'])


def _get_paciente(paciente_id: int) -> dict:
    res = supabase.table('pacientes').select(
        'id, fecha_nac, sexo, per_etn_, estrato_, area_, cod_dpto_o, '
        'niv_educat, menores, gp_pobicbf, peso_nac, edad_ges, '
        't_lechem, e_complem, crec_dllo, esq_vac, carne_vac'
    ).eq('id', paciente_id).single().execute()

    if not res.data:
        raise HTTPException(status_code=404, detail='Paciente no encontrado')
    return res.data


@router.post('', status_code=status.HTTP_201_CREATED, response_model=PrediccionOut)
async def registrar_control(
    paciente_id: int,
    body: ControlCreate,
    user: dict = Depends(require_cli),
):
    p  = _get_paciente(paciente_id)
    em = (date.today().year - date.fromisoformat(p['fecha_nac']).year) * 12 + \
         (date.today().month - date.fromisoformat(p['fecha_nac']).month)

    # Construir vector de features combinando datos fijos del paciente + control
    datos = {
        'edad_meses':    em,
        'per_etn_':      p.get('per_etn_'),
        'estrato_':      p.get('estrato_'),
        'area_':         p.get('area_'),
        'cod_dpto_o':    p.get('cod_dpto_o'),
        'niv_educat':    p.get('niv_educat'),
        'menores':       p.get('menores'),
        'gp_pobicbf':    p.get('gp_pobicbf', 2),
        'peso_nac':      p.get('peso_nac'),
        'edad_ges':      p.get('edad_ges'),
        't_lechem':      p.get('t_lechem'),
        'e_complem':     p.get('e_complem'),
        'crec_dllo':     p.get('crec_dllo'),
        'esq_vac':       p.get('esq_vac'),
        'carne_vac':     p.get('carne_vac'),
        # Datos del control actual
        'peso_act':      body.peso_act,
        'talla_act':     body.talla_act,
        'per_braqui':    body.per_braqui,
        'edema':         body.edema,
        'delgadez':      body.delgadez,
        'palidez':       body.palidez,
        'piel_rese':     body.piel_rese,
        'hiperpigm':     body.hiperpigm,
        'cambios_cabello': body.cambios_cabello,
        'ruta_atenc':    body.ruta_atenc,
    }

    try:
        pred = predecir(datos)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    zscore    = calcular_zscore(body.peso_act, em, p['sexo'])
    imc       = pred.get('imc_calculado')
    muac_clas = clasificar_muac(body.per_braqui, em)

    ctrl = {
        'paciente_id':   paciente_id,
        'fecha':         date.today().isoformat(),
        'peso_act':      body.peso_act,
        'talla_act':     body.talla_act,
        'per_braqui':    body.per_braqui,
        'imc':           imc,
        'zscore_pt':     zscore,
        'edema':         body.edema,
        'delgadez':      body.delgadez,
        'palidez':       body.palidez,
        'piel_rese':     body.piel_rese,
        'hiperpigm':     body.hiperpigm,
        'cambios_cabello': body.cambios_cabello,
        'ruta_atenc':    body.ruta_atenc,
        'apetito':       body.apetito,
        'micronutrientes': body.micronutrientes,
        'enfermedades':  body.enfermedades,
        'factores_sociales': body.factores_sociales,
        'observaciones': body.observaciones,
        'clas_peso_pred': pred['clas_peso'],
        'clas_nombre':   pred['clas_nombre'],
        'prob_desnutrido': pred['prob_desnutrido'],
        'modelo_usado':  pred['modelo_usado'],
        'registrado_por': user['id'],
    }

    res = supabase.table('controles').insert(ctrl).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail='Error al registrar control')

    control_id = res.data[0]['id']
    _generar_alertas(paciente_id, control_id, pred, zscore, user['id'])

    return PrediccionOut(
        **pred,
        zscore_pt=zscore,
        muac_clas=muac_clas,
    )


@router.get('', response_model=list[ControlOut])
async def listar_controles(
    paciente_id: int,
    user: dict = Depends(require_cli),
):
    res = supabase.table('controles') \
        .select('*') \
        .eq('paciente_id', paciente_id) \
        .order('fecha', desc=True) \
        .execute()

    return res.data or []
