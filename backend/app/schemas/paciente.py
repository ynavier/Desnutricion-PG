from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class PacienteCreate(BaseModel):
    # Datos personales
    nombre: str
    apellidos: str
    dni: Optional[str] = None
    fecha_nac: date
    sexo: str = Field(pattern='^[MF]$')
    per_etn_: Optional[int] = None          # etnia

    # Antecedentes neonatales
    peso_nac: Optional[float] = None
    edad_ges: Optional[float] = None
    t_lechem: Optional[float] = None        # duración lactancia (meses)
    e_complem: Optional[float] = None       # inicio alim. complementaria
    esq_vac: Optional[int] = None           # esquema vacunación
    carne_vac: Optional[int] = None
    crec_dllo: Optional[int] = None
    gp_pobicbf: Optional[int] = 2

    # Procedencia
    cod_dpto_o: Optional[str] = None        # departamento de procedencia
    municipio_proc: Optional[str] = None    # municipio de procedencia
    # Residencia actual
    area_: Optional[int] = None             # 1=Urbana 2=Rural
    dpto_residencia: Optional[str] = None   # departamento de residencia
    municipio_res: Optional[str] = None     # municipio de residencia
    zona: Optional[str] = None              # legacy
    establecimiento: Optional[str] = None

    # Social
    estrato_: Optional[int] = None
    niv_educat: Optional[int] = None
    menores: Optional[float] = None
    factores_sociales: Optional[list[str]] = []

    # Primer control (opcional)
    peso_act: Optional[float] = None
    talla_act: Optional[float] = None
    per_braqui: Optional[float] = None
    observaciones: Optional[str] = None


class PacienteOut(BaseModel):
    id: int
    nombre: str
    apellidos: str
    dni: Optional[str]
    fecha_nac: date
    sexo: str
    zona: Optional[str]
    establecimiento: Optional[str]
    edad_meses: Optional[int] = None
    ultimo_control: Optional[dict] = None
    estado_nutricional: Optional[str] = None


class PacienteDetalle(PacienteOut):
    per_etn_: Optional[int]
    # Procedencia
    cod_dpto_o: Optional[str]
    municipio_proc: Optional[str]
    # Residencia
    area_: Optional[int]
    dpto_residencia: Optional[str]
    municipio_res: Optional[str]
    # Social
    estrato_: Optional[int]
    niv_educat: Optional[int]
    menores: Optional[float]
    factores_sociales: Optional[list[str]]
    # Neonatales
    peso_nac: Optional[float]
    edad_ges: Optional[float]
    t_lechem: Optional[float]
    e_complem: Optional[float]
    esq_vac: Optional[int]
    crec_dllo: Optional[int]
    carne_vac: Optional[int]
    gp_pobicbf: Optional[int]
    controles: list[dict] = []
    alertas: list[dict] = []
