from pydantic import BaseModel
from typing import Optional
from datetime import date


class ControlCreate(BaseModel):
    # Antropométrico
    peso_act: float
    talla_act: Optional[float] = None
    per_braqui: Optional[float] = None

    # Signos clínicos (1=Sí 2=No)
    edema: Optional[int] = 2
    delgadez: Optional[int] = 2
    palidez: Optional[int] = 2
    piel_rese: Optional[int] = 2
    hiperpigm: Optional[int] = 2
    cambios_cabello: Optional[int] = 2

    # Estado clínico
    ruta_atenc: Optional[int] = None        # 1=Demanda espontánea 2=Captación 3=Referencia
    apetito: Optional[str] = None
    micronutrientes: Optional[int] = None   # 1=Sí 2=No
    enfermedades: Optional[list[str]] = []
    factores_sociales: Optional[list[str]] = []
    observaciones: Optional[str] = None


class ControlOut(BaseModel):
    id: int
    paciente_id: int
    fecha: date
    peso_act: float
    talla_act: Optional[float]
    per_braqui: Optional[float]
    imc: Optional[float]
    zscore_pt: Optional[float]
    clas_peso_pred: Optional[int]
    clas_nombre: Optional[str]
    prob_desnutrido: Optional[float]
    modelo_usado: Optional[str]
    observaciones: Optional[str]
    created_at: Optional[str]


class PrediccionOut(BaseModel):
    clas_peso: int
    clas_nombre: str
    prob_desnutrido: float
    probabilidades: dict
    confianza: float
    modelo_usado: str
    imc_calculado: Optional[float]
    zscore_pt: Optional[float]
