# NutriVigilancia — Sistema de Predicción y Vigilancia de Desnutrición Infantil

Sistema de vigilancia epidemiológica nutricional para menores de 5 años en Colombia, desarrollado como proyecto de grado de la Universidad Popular del Cesar. Combina Machine Learning, análisis predictivo con SARIMA y un asistente clínico con IA (NIVI) para apoyar la toma de decisiones en salud pública.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS + Framer Motion + Recharts |
| Backend | FastAPI (Python 3.11) + Uvicorn |
| Base de datos | Supabase (PostgreSQL + Storage) |
| ML | scikit-learn · imbalanced-learn · statsmodels (SARIMA) |
| IA | Groq API (Llama 3.3 70B + Whisper) · Google Gemini |
| Despliegue | Google Cloud Run + Vercel |

---

## Arquitectura de roles

| Rol | Panel | Responsabilidades |
|---|---|---|
| **CLI** | `/cli` | Registro de pacientes, controles nutricionales, alertas, asistente NIVI clínico |
| **ANL** | `/anl` | Dashboard epidemiológico, proyecciones SARIMA, análisis IA, informes |
| **ADM** | `/adm` | Usuarios, datasets SIVIGILA, entrenamiento ML, modelos, informe ML |

---

## Funcionalidades principales

### Panel Clínico (CLI)
- Registro de pacientes con parámetros OMS: peso, talla, IMC, z-score P/E
- Controles periódicos con predicción automática del estado nutricional (6 clases)
- Alertas automáticas por nivel: severa, moderada, riesgo
- **NIVI** — asistente clínica con voz (Groq Whisper): interpreta datos del paciente, detecta nombres en el chat y carga el contexto del paciente automáticamente con desambiguación si hay varios con el mismo nombre. Animación Spline 3D reactiva al volumen.

### Dashboard Analítico (ANL)
- Banner de estado epidemiológico con umbrales OMS/MSPS (GAM, SAM, hospitalización, C&D)
- KPIs: total casos (BD + histórico SIVIGILA), tasa desnutrición severa/moderada, hospitalización
- Proyecciones **SARIMA(1,1,1)(1,1,0,12)** hasta diciembre 2027 con bandas IC 80% y IC 95%
- Línea histórica (`#2563EB`) + pronóstico discontinuo (`#7E57C2`) diferenciados visualmente
- Filtros geográficos: Colombia → Departamento → Municipio (CESAR/VALLEDUPAR por defecto)
- Distribuciones demográficas: estrato socioeconómico, sexo, grupo etario, crec. y desarrollo
- Alertas normativas de proyección: OMS/OPS, MSPS 2016, ICBF, clasificación IPC
- Fallback jerárquico de datos: municipio → departamento → nacional
- **NIVI en ANL** — análisis interpretativo del dashboard con voz y Spline 3D
- Informes nutricionales y epidemiológicos con gráficas primero, exportación PDF y compartición (Supabase Storage)

### Panel Administrativo (ADM)
- Gestión de usuarios con roles CLI/ANL/ADM y edición de rol inline
- Carga y procesamiento ETL de datasets SIVIGILA (Excel → CSV con columnas ML + dashboard)
- Entrenamiento: Random Forest, XGBoost, Gradient Boosting, Regresión Logística
- **Auto-selección del mejor modelo** por F1 Weighted tras cada entrenamiento
- 1 versión por tipo de algoritmo (limpieza automática)
- Estado de jobs de entrenamiento persistido en Supabase (sobrevive reinicios del contenedor)
- Comparativa visual: radar, barras agrupadas, scatter volumen vs rendimiento
- **NIVI** para explicación de métricas ML
- Informe del modelo ML con exportación PDF

---

## Machine Learning

### Modelos predictivos
- **Modelo A** — con IMC (datos completos)
- **Modelo B** — sin IMC (fallback para contextos rurales)
- 6 clases: Normal · Normal bajo · Desnut. leve · Desnut. moderada · Desnut. severa · Sobrepeso/Obesidad

### Pipeline ETL (SIVIGILA Evento 113)
Filtro pediátrico ≤ 5 años → Ceros clínicos → Outliers físicos → Imputación estratificada → SMOTE → Columnas ML + columnas dashboard (`sexo_`, `pac_hos_`, `ndep_resi`, `nmun_resi`, `anio_mes`)

### Proyecciones epidemiológicas
- SARIMA estacional: captura tendencia + ciclo anual de 12 meses
- Entrenamiento: serie SIVIGILA 2020–2026 (73+ puntos mensuales)
- Relleno de meses sin datos con 0 para continuidad de la serie
- Exclusión automática del último mes si parece incompleto (< 30% del penúltimo)

---

## Estructura del proyecto

```
Project/
├── backend/
│   ├── app/
│   │   ├── routers/          # pacientes, controles, alertas, estadisticas,
│   │   │                     # proyecciones, modelos, entrenamiento, datasets,
│   │   │                     # reportes, chat, analisis_ia, compartir, usuarios
│   │   ├── services/         # entrenamiento, ETL, chat_asistente, ai_reportes
│   │   ├── ml/               # loader.py, predictor.py
│   │   ├── auth/             # JWT + dependencias por rol
│   │   └── config.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── cli/          # HomeCLI, PacientesCLI, DetallePaciente, AlertasCLI
│   │   │   ├── anl/          # HomeANL, ReportesANL, ModelosANL
│   │   │   └── adm/          # HomeADM, ReportesADM, DashboardADM
│   │   ├── components/
│   │   │   ├── cli/          # ChatAsistente (NIVI), SidebarCLI
│   │   │   ├── anl/          # ChatDashboard (NIVI ANL), SidebarANL
│   │   │   └── adm/          # SidebarADM
│   │   └── contexts/         # AuthContext
│   └── vercel.json
├── notebooks/                # EDA, ETL, modelos ML, proyecciones SARIMA
├── data/processed/           # CSVs procesados + series temporales
└── .github/workflows/        # deploy-backend.yml (Cloud Run)
```

---

## Despliegue en producción

### Backend — Google Cloud Run
El workflow `.github/workflows/deploy-backend.yml` construye la imagen Docker, la sube a Artifact Registry y despliega automáticamente en cada push a `main`.

```bash
# Configuración manual requerida (una sola vez)
gcloud run services update nutrivigilancia-api \
  --region us-central1 \
  --min-instances 1 \
  --timeout 3600
```

Variables de entorno en Cloud Run:
```
SUPABASE_URL · SUPABASE_ANON_KEY · SUPABASE_SERVICE_KEY · SUPABASE_JWT_SECRET
GROQ_API_KEY · GOOGLE_API_KEY · CORS_ORIGINS
MODELS_DIR=/app/persistent/models
DATA_UPLOADS_DIR=/app/persistent/uploads
DATA_PROC_DIR=/app/persistent/processed
```

### Frontend — Vercel
Conectar el repositorio a Vercel con `frontend/` como directorio raíz.

```
VITE_API_URL=https://nutrivigilancia-api-XXX.us-central1.run.app
```

### Base de datos — Supabase
Tablas: `profiles`, `pacientes`, `controles`, `alertas`, `modelos_ml`, `datasets_ml`, `jobs_entrenamiento`  
Bucket Storage: `reportes` (público) — compartición de informes PDF

---

## Instalación local

```bash
# Backend
cd backend
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env    # completar variables
uvicorn main:app --reload --port 8000

# Frontend (otra terminal)
cd frontend
npm install
npm run dev             # http://localhost:3000
```

El proxy en `vite.config.js` redirige `/api → localhost:8000` automáticamente en desarrollo.

---

## Estándares normativos aplicados

| Estándar | Umbral | Acción |
|---|---|---|
| OMS/OPS — SAM | ≥ 2% → emergencia · ≥ 5% → crítica | Activar protocolo MSPS |
| OMS/OPS — GAM | ≥ 10% → emergencia · ≥ 15% → crítica | Declarar emergencia territorial |
| OPS Caribe | GAM ≥ 5% (con agravantes) | Alerta con poblaciones vulnerables |
| ICBF | Z-score < −1.5 promedio poblacional | Intervención preventiva C&D |
| MSPS 2016 | SAM ≥ 2% | Activar respuesta urgente territorial |
| OMS 2006 | Z-score < −2 · < −3 | Desnutrición moderada · severa |

---

## Asistente NIVI

NIVI (asistente clínica IA) está integrada en los tres paneles con comportamiento diferenciado:

- **CLI**: Orientación clínica individual basada en criterios OMS/MSPS. Detecta nombres de pacientes en el chat y carga su contexto automáticamente. Soporta voz con transcripción Whisper y animación Spline 3D reactiva al volumen.
- **ANL**: Análisis epidemiológico poblacional del dashboard. Interpreta tendencias, genera alertas y sugiere acciones de intervención en salud pública.
- **ADM**: Explica métricas ML (Accuracy, F1 Weighted, F1 Macro, CV Accuracy) en lenguaje comprensible para el administrador.

---

## Autores

Proyecto de Grado — Universidad Popular del Cesar  
Programa de Ingeniería de Sistemas · 2026
