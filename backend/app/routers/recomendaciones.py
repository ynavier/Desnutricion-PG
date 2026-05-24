from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

from app.auth.dependencies import get_current_user
from app.services.ai_recomendaciones import generar_recomendaciones

router = APIRouter(prefix='/recomendaciones', tags=['recomendaciones'])


class RecomendacionesRequest(BaseModel):
    estado_nutricional: Optional[str] = None
    edad_meses:         Optional[int] = None
    sexo:               Optional[str] = None
    zscore:             Optional[float] = None
    prob_desnutrido:    Optional[float] = None
    factores_sociales:  Optional[list[str]] = []
    alertas_activas:    Optional[list[str]] = []
    nivel_alerta:       Optional[str] = None   # contexto rápido desde AlertasCLI


@router.post('')
async def obtener_recomendaciones(
    body: RecomendacionesRequest,
    user: dict = Depends(get_current_user),
):
    result = await generar_recomendaciones(body.model_dump())
    return result
