# Sistema de Predicción y Clasificación de la Desnutrición Infantil en Valledupar

Sistema de aprendizaje automático para predecir y clasificar la desnutrición en niños menores de cinco años en Valledupar, Colombia, usando datos del SIVIGILA (Evento 113) del período 2020–2025.

---

## Descripción

El proyecto desarrolla dos componentes principales:

- **Clasificador nutricional**: asigna una de seis categorías (Desnutrición severa, Moderada, Normal bajo, Normal, Sobrepeso, Obesidad) a partir de datos antropométricos y clínicos del paciente.
- **Predictor de riesgo**: estima la probabilidad de desnutrición a nivel individual, poblacional y territorial, con proyecciones SARIMA hasta diciembre 2027.

Los resultados se visualizan en cuatro dashboards en Power BI conectados a BigQuery.

---

## Resultados del modelo

| Modelo | Accuracy | F1-ponderado | Recall Desnut. severa | AUC-ROC |
| --- | --- | --- | --- | --- |
| Random Forest (con IMC) | 83.1% | 82.0% | 59.2% | — |
| Gradient Boosting (con IMC) | 82.9% | 82.0% | 63.3% | — |
| Gradient Boosting — Predictor binario | — | — | — | 91.3% |

El sistema opera en dos modos:

- **Modo Clínica (Modelo A)**: usa IMC — requiere báscula y tallímetro.
- **Modo Campo (Modelo B)**: sin IMC — solo requiere cinta métrica para perímetro braquial.

---

## Estructura del proyecto

```text
Project/
│
├── data/
│   ├── raw/                        # Datos originales SIVIGILA
│   ├── processed/                  # Datasets limpios y transformados
│   │   ├── 01_registros.csv        # Dataset limpio principal (2,438 registros)
│   │   ├── dataset_ml.csv          # Dataset para modelado (3,428 registros)
│   │   ├── serie_temporal_mensual.csv
│   │   └── serie_temporal_departamento.csv
│   └── external/
│
├── notebooks/
│   ├── 01_estructura_datos.ipynb   # Exploración inicial y estructura
│   ├── 02_calidad_datos.ipynb      # Auditoría de calidad y nulos
│   ├── 03_etl_limpieza_datos.ipynb # ETL y limpieza (metodología CRISP-DM)
│   ├── 04_analisis_exploratorio.ipynb  # EDA — factores de riesgo y correlaciones
│   ├── 05_modelos_ml.ipynb         # Entrenamiento y evaluación de modelos
│   ├── 06_predicciones.ipynb       # Predicciones individuales y perfiles de riesgo
│   └── 07_proyecciones_temporales.ipynb  # Proyecciones SARIMA hasta dic 2027
│
├── src/
│   ├── data_processing/
│   ├── models/
│   ├── utils/
│   └── visualization/
│
├── models/                         # Modelos entrenados serializados
├── reports/                        # Reportes y figuras generadas
├── docs/                           # Documentación del proyecto
├── api/                            # API de inferencia
├── frontend/                       # Interfaz de usuario
│
├── requirements.txt
├── .gitignore
└── README.md
```

---

## Dashboards Power BI

Los dashboards se conectan a BigQuery (`proyecto.desnutricion.*`) y cubren cuatro perspectivas:

| Dashboard | Pregunta que responde | Tablas BigQuery |
| --- | --- | --- |
| Epidemiológico | ¿Cuántos casos hay, dónde y cuándo? | `limpio_unificado`, `serie_temporal_mensual` |
| Factores de riesgo | ¿Por qué se desnutren? | `limpio_unificado` |
| Proyección temporal | ¿Qué pasará hasta 2027? | `proy_casos_mensual`, `proy_tasa_severa`, `proy_tasa_moderada`, `proy_zscore_mensual`, `proy_casos_departamento` |
| Cuadro de mando | ¿Cuál es el estado general del sistema? | todas |

---

### Dashboard 1 — Epidemiológico

**Filtros:** Procedencia (departamento → municipio) / Residencia (departamento → municipio) / Año / Trimestre / Semestre

| # | KPI |
| --- | --- |
| 1 | Total de niños evaluados |
| 2 | Tasa de desnutrición (%) |
| 3 | Tasa de desnutrición en valledupar (%) |
| 4 | Distribución por tipo de desnutrición |
| 5 | Tendencia mensual de casos (2020–2025) |

---

### Dashboard 2 — Factores de Riesgo

**Filtros:** Grupo etario / Área / Año

| # | KPI |
| --- | --- |
| 1 | Grupo etario con mayor tasa de desnutrición |
| 2 | Tasa de desnutrición por etnia |
| 3 | Tasa por esquema de vacunación |
| 4 | Tasa por seguimiento de crecimiento y desarrollo (C&D) |
| 5 | Tasa por nivel educativo del cuidador |

---

### Dashboard 3 — Proyección Temporal

**Filtros:** Año / Trimestre / Semestre / Departamento (CESAR, GUAJIRA, MAGDALENA)

| # | KPI | Fuente BigQuery | Valor proyectado |
| --- | --- | --- | --- |
| 1 | Tasa de desnutrición severa proyectada | `proy_tasa_severa` | 13.7% (2026) → 11.8% (2027) |
| 2 | Tasa de desnutrición moderada proyectada | `proy_tasa_moderada` | disponible |
| 3 | Z-score promedio proyectado | `proy_zscore_mensual` | -2.43 (2026) → -2.44 (2027) |
| 4 | Casos proyectados por departamento | `proy_casos_departamento` | CESAR / GUAJIRA / MAGDALENA |
| 5 | Banda de confianza 80% y 95% | todas las tablas | incluida en cada tabla |

---

### Dashboard 4 — Cuadro de Mando Estratégico

| Perspectiva | KPI |
| --- | --- |
| Social | Niños en riesgo severo identificados |
| Social | Municipios priorizados para intervención |
| Técnica | Exactitud del sistema (Accuracy 83.1% / AUC 91.3%) |
| Salud pública | Tendencia proyectada 2027 — mejora o deterioro |
| Datos | Completitud del dataset post-ETL (%) |

---

## Instalación

```bash
git clone <url-del-repositorio>
cd Project
pip install -r requirements.txt
```

Autenticación con Google Cloud (necesaria para BigQuery y GCS):

```bash
gcloud auth application-default login
```

---

## Datos

**Fuente:** SIVIGILA — Evento 113 (Desnutrición aguda en menores de 5 años)  
**Período:** 2020–2025 (73 meses)  
**Cobertura:** 45 municipios, 9 departamentos  
**Almacenamiento:** Google Cloud Storage (`gs://data_desnutricion`) y BigQuery (`desnutricion.*`)

Los datos crudos no se incluyen en el repositorio por restricciones de privacidad. Contactar al equipo para acceso.

---

## Metodología

El proyecto sigue la metodología **CRISP-DM** en seis fases:

1. Entendimiento del negocio
2. Entendimiento de los datos (`nb01`, `nb02`)
3. Preparación de los datos (`nb03`)
4. Modelado (`nb04`, `nb05`, `nb06`)
5. Evaluación (`nb05`)
6. Despliegue (`nb07`, dashboards Power BI)

---

## Tecnologías

- **Lenguaje:** Python 3.11
- **ML:** scikit-learn, statsmodels (SARIMA)
- **Datos:** pandas, numpy
- **Nube:** Google Cloud Storage, BigQuery
- **Visualización:** Power BI, matplotlib, seaborn
- **Control de versiones:** Git / GitHub

---

## Autores

Proyecto de Grado — Universidad Piloto de Colombia  
Programa de Ingeniería de Sistemas
