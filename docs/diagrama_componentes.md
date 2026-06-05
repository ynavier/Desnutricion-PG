# Diagrama de Componentes — NutriVigilancia

```
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                              NUTRIVIGILANCIA — SISTEMA COMPLETO                          ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENTE (Navegador)                                   │
│                              React 18 + Vite + Tailwind CSS                             │
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                               App.jsx (Router Principal)                         │   │
│  │              React Router v6 — rutas protegidas por rol                         │   │
│  └───────────────────────────────┬─────────────────────────────────────────────────┘   │
│                                  │                                                      │
│         ┌────────────────────────┼────────────────────────┐                            │
│         ▼                        ▼                        ▼                            │
│  ┌─────────────┐        ┌─────────────────┐      ┌──────────────┐                     │
│  │ LandingPage │        │  AuthContext.jsx │      │ NotFound.jsx │                     │
│  │  (Pública)  │        │  Estado global  │      │   404 page   │                     │
│  └─────────────┘        │  auth + JWT     │      └──────────────┘                     │
│                          └────────┬────────┘                                           │
│                                   │                                                    │
│              ┌────────────────────┼──────────────────────┐                            │
│              ▼                    ▼                      ▼                            │
│   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                   │
│   │  PANEL CLÍNICO   │  │  PANEL ANALÍTICO │  │  PANEL ADMIN     │                   │
│   │    (rol: CLI)    │  │    (rol: ANL)    │  │    (rol: ADM)    │                   │
│   │                  │  │                  │  │                  │                   │
│   │ ┌──────────────┐ │  │ ┌──────────────┐ │  │ ┌──────────────┐ │                   │
│   │ │ SidebarCLI   │ │  │ │ SidebarANL   │ │  │ │ SidebarADM   │ │                   │
│   │ └──────────────┘ │  │ └──────────────┘ │  │ └──────────────┘ │                   │
│   │                  │  │                  │  │                  │                   │
│   │ Páginas CLI:     │  │ Páginas ANL:     │  │ Páginas ADM:     │                   │
│   │ ┌────────────┐   │  │ ┌────────────┐  │  │ ┌────────────┐   │                   │
│   │ │ HomeCLI    │   │  │ │ HomeANL    │  │  │ │ HomeADM    │   │                   │
│   │ │ KPIs       │   │  │ │ Epidemio.  │  │  │ └────────────┘   │                   │
│   │ │ Gráficos   │   │  │ │ KPIs+Charts│  │  │ ┌────────────┐   │                   │
│   │ └────────────┘   │  │ └────────────┘  │  │ │ReportesADM │   │                   │
│   │ ┌────────────┐   │  │ ┌────────────┐  │  │ └────────────┘   │                   │
│   │ │Pacientes   │   │  │ │ReportesANL │  │  └──────────────────┘                   │
│   │ │ Lista+     │   │  │ │4 tipos     │  │                                          │
│   │ │ Filtros    │   │  │ │Excel export│  │                                          │
│   │ └────────────┘   │  │ └────────────┘  │                                          │
│   │ ┌────────────┐   │  │ ┌────────────┐  │                                          │
│   │ │DetallePac. │   │  │ │DatasetsANL │  │                                          │
│   │ │ Historial  │   │  │ │Upload SIVG.│  │                                          │
│   │ │ + Control  │   │  │ └────────────┘  │                                          │
│   │ └────────────┘   │  │ ┌────────────┐  │                                          │
│   │ ┌────────────┐   │  │ │ModelosANL  │  │                                          │
│   │ │AlertasCLI  │   │  │ │Activar/Ver │  │                                          │
│   │ │ Severidad  │   │  │ └────────────┘  │                                          │
│   │ │ Marcar leída│  │  │ ┌────────────┐  │                                          │
│   │ └────────────┘   │  │ │Entrena.ANL │  │                                          │
│   │                  │  │ │Configurar  │  │                                          │
│   │ Componente       │  │ │+ lanzar job│  │                                          │
│   │ flotante:        │  │ └────────────┘  │                                          │
│   │ ┌────────────┐   │  │ ┌────────────┐  │                                          │
│   │ │ChatAsistente│  │  │ │UsuariosANL │  │                                          │
│   │ │NIVI (voz)  │   │  │ └────────────┘  │                                          │
│   │ │Spline 3D   │   │  │ ┌────────────┐  │                                          │
│   │ └────────────┘   │  │ │DashboardPBI│  │                                          │
│   └──────────────────┘  │ │Power BI    │  │                                          │
│                          │ └────────────┘  │                                          │
│                          │ ┌────────────┐  │                                          │
│                          │ │ChatDashboard│ │                                          │
│                          │ └────────────┘  │                                          │
│                          └─────────────────┘                                          │
│                                                                                         │
│  Componentes Transversales:                                                             │
│  ┌──────────────────┐   ┌──────────────────┐                                          │
│  │ ProtectedRoute   │   │ AnimatedCounter   │                                          │
│  │ (auth + rol)     │   │ (KPI animado)     │                                          │
│  └──────────────────┘   └──────────────────┘                                          │
│                                                                                         │
│  Servicio HTTP:                                                                         │
│  ┌──────────────────────────────────────────┐                                          │
│  │              services/api.js              │                                          │
│  │  Axios — Bearer JWT — auto-logout 401    │                                          │
│  └──────────────────────┬───────────────────┘                                          │
└───────────────────────────────────────────────────────────────────────────────────────┘
                           │  HTTPS/REST
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND — FastAPI (Python 3.11)                            │
│                               Google Cloud Run (Docker)                                 │
│                                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                               main.py                                             │  │
│  │   Lifespan (carga modelos ML al arrancar) · CORS · 13 Routers montados           │  │
│  └──────────────────────────┬─────────────────────────────────────────────────────┘  │
│                              │                                                          │
│   ┌──────────────────────────▼────────────────────────────────────────────────────┐  │
│   │                           CAPA DE AUTENTICACIÓN                                │  │
│   │  auth/router.py          auth/dependencies.py                                  │  │
│   │  POST /auth/login        get_current_user()                                    │  │
│   │  POST /auth/logout       require_adm / require_anl / require_cli               │  │
│   │  Supabase Auth + JWT     Control de acceso por rol                             │  │
│   └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│   ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│   │                              ROUTERS (API Endpoints)                              │  │
│   │                                                                                   │  │
│   │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐    │  │
│   │  │ /pacientes    │  │ /controles    │  │ /alertas      │  │ /usuarios     │    │  │
│   │  │ CRUD pacientes│  │ Registrar     │  │ Listar/leer   │  │ Crear/listar/ │    │  │
│   │  │ Edad en meses │  │ controles     │  │ alertas       │  │ habilitar     │    │  │
│   │  │ Alertas riesgo│  │ → ML predict  │  │ por severidad │  │               │    │  │
│   │  └───────────────┘  │ → Z-scores    │  └───────────────┘  └───────────────┘    │  │
│   │                     │ → Clasificar  │                                            │  │
│   │  ┌───────────────┐  └───────────────┘  ┌───────────────┐  ┌───────────────┐    │  │
│   │  │/recomendaciones│                     │ /modelos      │  │ /estadisticas │    │  │
│   │  │ Gemini AI      │                     │ Listar/activ. │  │ Epidemiología │    │  │
│   │  │ Cache 24h      │                     │ modelos ML    │  │ zona/edad/clas│    │  │
│   │  └───────────────┘                     └───────────────┘  └───────────────┘    │  │
│   │                                                                                   │  │
│   │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐    │  │
│   │  │ /entrenamiento│  │ /datasets     │  │ /reportes     │  │ /chat         │    │  │
│   │  │ Lanzar jobs   │  │ Subir Excel   │  │ 4 tipos       │  │ Voz (Whisper) │    │  │
│   │  │ Monitor estado│  │ SIVIGILA ETL  │  │ Excel export  │  │ Buscar pacs.  │    │  │
│   │  │ 4 algoritmos  │  │ habilitar/des.│  │ Cache memoria │  │ Groq Llama3.3 │    │  │
│   │  └───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘    │  │
│   │                                                                                   │  │
│   │  ┌───────────────┐  ┌───────────────┐                                            │  │
│   │  │ /analisis_ia  │  │ /proyecciones │                                            │  │
│   │  │ Groq LLM      │  │ SARIMA        │                                            │  │
│   │  │ Insights epid.│  │ Hasta Dic2027 │                                            │  │
│   │  └───────────────┘  └───────────────┘                                            │  │
│   └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│   ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│   │                              SCHEMAS (Pydantic)                                   │  │
│   │  paciente.py — PacienteCreate (25 campos) / PacienteOut / PacienteDetalle        │  │
│   │  control.py  — ControlCreate (antropométrico + clínico) / PrediccionOut (6 clases)│  │
│   └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│   ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│   │                              SERVICIOS (Lógica de negocio)                        │  │
│   │                                                                                   │  │
│   │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐               │  │
│   │  │    etl.py        │  │ entrenamiento.py  │  │  ai_reportes.py  │               │  │
│   │  │ Pipeline ETL     │  │ 4 algoritmos ML   │  │ Google Gemini    │               │  │
│   │  │ SIVIGILA Excel   │  │ SMOTE imbalance   │  │ Análisis informes│               │  │
│   │  │ limpieza+impute  │  │ CV 5-fold estrat. │  │ Round-robin mods │               │  │
│   │  └──────────────────┘  └──────────────────┘  └──────────────────┘               │  │
│   │                                                                                   │  │
│   │  ┌──────────────────┐  ┌──────────────────────────────────────────┐             │  │
│   │  │ chat_asistente.py│  │         ai_recomendaciones.py             │             │  │
│   │  │ Búsqueda pacs.   │  │  Recomendaciones clínicas personalizadas  │             │  │
│   │  │ Contexto clínico │  │  Google Gemini · cache 24h · fallback     │             │  │
│   │  │ Respuestas Groq  │  │  estático por nivel severidad             │             │  │
│   │  └──────────────────┘  └──────────────────────────────────────────┘             │  │
│   └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│   ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│   │                         MÓDULO ML (Motor de Predicción)                           │  │
│   │                                                                                   │  │
│   │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐               │  │
│   │  │   ml/loader.py   │  │  ml/predictor.py  │  │  ml/who_tables.py│               │  │
│   │  │ Carga modelos    │  │ Preprocesamiento  │  │ Z-scores OMS     │               │  │
│   │  │ joblib del disco  │  │ Encoding/scaling  │  │ Tablas P/E       │               │  │
│   │  │ Modelo A (c/IMC) │  │ Modelo A o B      │  │ MUAC clasif.     │               │  │
│   │  │ Modelo B (s/IMC) │  │ 6 clases output   │  │                  │               │  │
│   │  └──────────────────┘  └──────────────────┘  └──────────────────┘               │  │
│   └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│   ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│   │                          CONFIGURACIÓN E INFRAESTRUCTURA                          │  │
│   │  app/config.py — Variables de entorno (Pydantic BaseSettings)                    │  │
│   │  app/database.py — Cliente Supabase (service key + anon key)                     │  │
│   │  Dockerfile — Python 3.11 · imagen para Cloud Run                                │  │
│   └──────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
              │                          │                          │
              ▼                          ▼                          ▼
┌─────────────────────┐   ┌─────────────────────────┐   ┌───────────────────────────┐
│  SUPABASE           │   │   APIS EXTERNAS (IA)     │   │  PIPELINE ML OFFLINE      │
│  (PostgreSQL)       │   │                          │   │                           │
│                     │   │  ┌───────────────────┐  │   │  notebooks/               │
│  Tablas:            │   │  │  Google Gemini API │  │   │  01_estructura_datos.ipynb│
│  ┌───────────────┐  │   │  │  Recomendaciones   │  │   │  02_calidad_datos.ipynb   │
│  │  profiles     │  │   │  │  Análisis reportes │  │   │  03_etl_limpieza.ipynb    │
│  │  (usuarios)   │  │   │  └───────────────────┘  │   │  04_analisis_explo.ipynb  │
│  └───────────────┘  │   │  ┌───────────────────┐  │   │  05_modelos_ml.ipynb      │
│  ┌───────────────┐  │   │  │  Groq API          │  │   │  06_predicciones.ipynb    │
│  │  pacientes    │  │   │  │  Llama 3.3 70B     │  │   │  07_proyecciones.ipynb    │
│  │  (25+ campos) │  │   │  │  Chat/Dashboard    │  │   │                           │
│  └───────────────┘  │   │  └───────────────────┘  │   │  scripts/                 │
│  ┌───────────────┐  │   │  ┌───────────────────┐  │   │  train_and_export.py      │
│  │  controles    │  │   │  │  Groq Whisper      │  │   │                           │
│  │  (30+ campos) │  │   │  │  Transcripción voz │  │   │  models/                  │
│  │  + predicción │  │   │  └───────────────────┘  │   │  *.joblib (A y B)         │
│  └───────────────┘  │   └─────────────────────────┘   │  scaler_a/b.joblib        │
│  ┌───────────────┐  │                                  │  label_encoder.joblib     │
│  │  alertas      │  │                                  │  model_metadata.json      │
│  └───────────────┘  │                                  │                           │
│  ┌───────────────┐  │                                  │  data/                    │
│  │  modelos_ml   │  │                                  │  raw/ (SIVIGILA .xlsx)    │
│  └───────────────┘  │                                  │  processed/ (.csv)        │
│  ┌───────────────┐  │                                  │  uploads/ (usuarios)      │
│  │  datasets_ml  │  │                                  └───────────────────────────┘
│  └───────────────┘  │
└─────────────────────┘
```

---

## Flujo de Datos Principal

```
Usuario CLI                      Backend FastAPI                    Supabase DB
    │                                  │                                 │
    │── POST /controles ──────────────►│                                 │
    │   (peso, talla, MUAC, signos)    │── INSERT control ──────────────►│
    │                                  │                                 │
    │                       ml/predictor.py                              │
    │                       ┌─────────────────┐                         │
    │                       │ 1. Encode dept.  │                         │
    │                       │ 2. Impute fields │                         │
    │                       │ 3. RobustScale   │                         │
    │                       │ 4. Predict A o B │                         │
    │                       │ 5. 6 clases prob.│                         │
    │                       └────────┬────────┘                         │
    │                                │                                   │
    │                       who_tables.py (Z-scores OMS)                 │
    │                                │                                   │
    │◄── predicción + alerta ────────┘                                   │
    │    (si severo → INSERT alerta) ─────────────────────────────────►│
```

```
Usuario ANL                      Backend FastAPI                Groq / Gemini
    │                                  │                              │
    │── GET /estadisticas ────────────►│                              │
    │◄── datos epidemiológicos ────────│                              │
    │                                  │                              │
    │── POST /analisis_ia ────────────►│── prompt + datos ───────────►│
    │◄── insights en lenguaje nat. ────│◄── respuesta LLM ────────────│
    │                                  │                              │
    │── GET /proyecciones ────────────►│                              │
    │◄── SARIMA forecast 2027 ─────────│                              │
```
