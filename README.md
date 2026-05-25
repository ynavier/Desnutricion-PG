<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/scikit--learn-ML-F7931E?style=for-the-badge&logo=scikitlearn&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5.x-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/License-Academic-blue?style=for-the-badge" />
</p>

# 🏥 NutriVigilancia — Sistema de Predicción y Clasificación de la Desnutrición Infantil

> **Plataforma clínica inteligente** para la predicción, clasificación y vigilancia de la desnutrición en niños menores de 5 años en Valledupar, Colombia, basada en datos del SIVIGILA (Evento 113, período 2020–2025).

---

## 📋 Tabla de Contenido

- [Descripción General](#-descripción-general)
- [Características Principales](#-características-principales)
- [Arquitectura del Sistema](#-arquitectura-del-sistema)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación y Configuración](#-instalación-y-configuración)
  - [1. Clonar el repositorio](#1-clonar-el-repositorio)
  - [2. Configurar Supabase](#2-configurar-supabase)
  - [3. Configurar el Backend](#3-configurar-el-backend)
  - [4. Configurar el Frontend](#4-configurar-el-frontend)
  - [5. Configurar la IA (Opcional)](#5-configurar-la-ia-opcional)
- [Ejecución](#-ejecución)
- [Roles del Sistema](#-roles-del-sistema)
- [Módulos Funcionales](#-módulos-funcionales)
- [Modelos de Machine Learning](#-modelos-de-machine-learning)
- [API REST — Endpoints](#-api-rest--endpoints)
- [Base de Datos](#-base-de-datos)
- [Reportes Clínicos](#-reportes-clínicos)
- [Dashboards Power BI](#-dashboards-power-bi)
- [Datos y Fuentes](#-datos-y-fuentes)
- [Metodología](#-metodología)
- [Stack Tecnológico](#-stack-tecnológico)
- [Variables de Entorno](#-variables-de-entorno)
- [Contribución](#-contribución)
- [Autores](#-autores)
- [Licencia](#-licencia)

---

## 🎯 Descripción General

**NutriVigilancia** es una plataforma web clínica de apoyo a la decisión que integra Machine Learning con vigilancia epidemiológica para:

- **Clasificar** el estado nutricional de niños menores de 5 años en 6 categorías: Desnutrición severa, Desnutrición moderada, Normal bajo, Normal, Sobrepeso y Obesidad.
- **Predecir** el riesgo individual de desnutrición con probabilidades calibradas.
- **Alertar** de forma temprana sobre pacientes en riesgo mediante un sistema inteligente de alertas.
- **Recomendar** intervenciones clínicas personalizadas potenciadas por IA (Google Gemini).
- **Monitorear** tendencias epidemiológicas a nivel territorial con proyecciones SARIMA hasta diciembre de 2027.
- **Generar reportes** clínicamente útiles en formatos PDF y Excel.

> ⚠️ **Importante:** El sistema NO diagnostica enfermedades. Es una herramienta de apoyo a la toma de decisiones preventivas mediante análisis predictivo.

---

## ✨ Características Principales

| Área | Funcionalidades |
|------|----------------|
| 🧒 **Gestión de Pacientes** | Registro, búsqueda, historial clínico completo, datos antropométricos y socioeconómicos |
| 📏 **Controles Antropométricos** | Peso, talla, IMC, perímetro braquial, Z-scores WHO, signos clínicos (edema, delgadez, palidez, etc.) |
| 🤖 **Machine Learning** | Clasificación nutricional con 4 algoritmos (RF, GB, LR, XGBoost), modos Clínica y Campo |
| ⚠️ **Alertas Inteligentes** | Detección temprana de riesgo (severo, moderado, leve), tendencias negativas, pacientes sin seguimiento |
| 💡 **Recomendaciones IA** | Recomendaciones clínicas personalizadas generadas por Google Gemini con caché de 24h |
| 📊 **Dashboards** | Indicadores epidemiológicos, factores de riesgo, proyecciones temporales y cuadro de mando estratégico |
| 📄 **Reportes** | 4 tipos de reportes clínicos (Individual, Poblacional, Epidemiológico, Intervención) en PDF/Excel |
| 🗃️ **Gestión de Datasets** | Carga de CSV/Excel, ETL automático (limpieza, normalización, validación) |
| 🔧 **Entrenamiento de Modelos** | Selección de algoritmo, ajuste de hiperparámetros, evaluación de métricas, comparación de modelos |
| 👥 **Gestión de Usuarios** | RBAC con roles ANL y CLI, habilitación/inhabilitación de cuentas |
| 🔐 **Seguridad** | Autenticación JWT vía Supabase Auth, Row Level Security, service key para backend |

---

## 🏗 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENTE (Browser)                          │
│   React 18 + Vite + TailwindCSS + Recharts + Framer Motion         │
│                                                                     │
│   ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────────┐  │
│   │ Landing  │  │  Login   │  │  Panel    │  │  Panel           │  │
│   │  Page    │  │  Page    │  │  ANL      │  │  CLI             │  │
│   └──────────┘  └──────────┘  └───────────┘  └──────────────────┘  │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ HTTP / REST (axios)
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       BACKEND (FastAPI + Uvicorn)                    │
│                                                                     │
│   ┌───────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│   │  Auth     │  │  Routers   │  │  Services  │  │  ML Engine   │  │
│   │  (JWT)    │  │  (REST)    │  │  (ETL, IA) │  │  (sklearn)   │  │
│   └───────────┘  └────────────┘  └────────────┘  └──────────────┘  │
└─────────────────────────┬──────────────────────┬────────────────────┘
                          │                      │
                          ▼                      ▼
               ┌──────────────────┐    ┌──────────────────┐
               │    Supabase      │    │  Google Gemini   │
               │  (PostgreSQL +   │    │  (Recomendaciones│
               │   Auth + RLS)    │    │   clínicas IA)   │
               └──────────────────┘    └──────────────────┘
```

---

## 📁 Estructura del Proyecto

```text
Project/
│
├── backend/                          # API REST (FastAPI)
│   ├── main.py                       # Entry point — lifespan, CORS, routers
│   ├── requirements.txt              # Dependencias Python
│   ├── .env.example                  # Variables de entorno ejemplo
│   └── app/
│       ├── config.py                 # Configuración (Pydantic Settings)
│       ├── database.py               # Cliente Supabase
│       ├── auth/                     # Autenticación JWT
│       │   └── router.py             # Login, registro, validación de tokens
│       ├── routers/                  # Endpoints REST
│       │   ├── pacientes.py          # CRUD de pacientes
│       │   ├── controles.py          # Controles antropométricos + predicción ML
│       │   ├── alertas.py            # Sistema de alertas inteligentes
│       │   ├── usuarios.py           # Gestión de usuarios (RBAC)
│       │   ├── recomendaciones.py    # Recomendaciones clínicas IA
│       │   ├── modelos.py            # Gestión de modelos ML (activar, comparar)
│       │   ├── estadisticas.py       # KPIs y métricas del dashboard
│       │   ├── entrenamiento.py      # Entrenamiento de modelos ML
│       │   ├── datasets.py           # Carga y gestión de datasets
│       │   └── reportes.py           # Generación de reportes PDF/Excel
│       ├── schemas/                  # Esquemas Pydantic (validación)
│       ├── services/                 # Lógica de negocio
│       │   ├── ai_recomendaciones.py # Recomendaciones con Google Gemini
│       │   ├── ai_reportes.py        # Análisis IA para reportes
│       │   ├── entrenamiento.py      # Pipeline de entrenamiento ML
│       │   ├── etl.py                # Limpieza y transformación de datos
│       │   └── reportes_data.py      # Consultas y datos para reportes
│       └── ml/                       # Motor de Machine Learning
│           ├── loader.py             # Carga de modelos serializados
│           └── predictor.py          # Inferencia y predicción
│
├── frontend/                         # Interfaz de usuario (React)
│   ├── package.json                  # Dependencias Node.js
│   ├── vite.config.js                # Configuración Vite
│   ├── tailwind.config.js            # Paleta de colores clínica
│   ├── index.html                    # HTML raíz
│   └── src/
│       ├── App.jsx                   # Router principal
│       ├── main.jsx                  # Entry point React
│       ├── index.css                 # Estilos globales
│       ├── contexts/                 # AuthContext (estado global de sesión)
│       ├── services/                 # Clientes HTTP (axios)
│       ├── styles/                   # Estilos adicionales
│       ├── components/               # Componentes reutilizables
│       │   ├── common/               # ProtectedRoute, Sidebar, Navbar
│       │   ├── anl/                  # Componentes del panel ANL
│       │   └── cli/                  # Componentes del panel CLI
│       └── pages/                    # Páginas de la aplicación
│           ├── LandingPage.jsx       # Página de inicio pública
│           ├── NotFound.jsx          # Página 404
│           ├── auth/
│           │   └── LoginPage.jsx     # Inicio de sesión
│           ├── anl/                  # Vistas del rol ANL
│           │   ├── HomeANL.jsx       # Dashboard principal analítico
│           │   ├── DashboardANL.jsx  # Layout con sidebar
│           │   ├── DashboardsPBI.jsx # Dashboards Power BI embebidos
│           │   ├── DatasetsANL.jsx   # Gestión de datasets
│           │   ├── EntrenamientoANL.jsx # Entrenamiento de modelos
│           │   ├── ModelosANL.jsx    # Comparación y activación de modelos
│           │   ├── ReportesANL.jsx   # Generación de reportes
│           │   └── UsuariosANL.jsx   # Gestión de usuarios
│           └── cli/                  # Vistas del rol CLI
│               ├── HomeCLI.jsx       # Dashboard clínico
│               ├── DashboardCLI.jsx  # Layout con sidebar
│               ├── PacientesCLI.jsx  # Lista y registro de pacientes
│               ├── DetallePaciente.jsx # Ficha completa del paciente
│               └── AlertasCLI.jsx    # Centro de alertas
│
├── models/                           # Modelos ML serializados (.joblib)
│   ├── modelo_A_*.joblib             # Modelos Modo Clínica (con IMC)
│   ├── modelo_B_*.joblib             # Modelos Modo Campo (sin IMC)
│   ├── scaler_A_*.joblib             # Escaladores Modo Clínica
│   ├── scaler_B_*.joblib             # Escaladores Modo Campo
│   ├── le_dpto_*.joblib              # Label Encoders de departamento
│   └── model_metadata.json           # Metadatos del modelo activo
│
├── data/                             # Datos del proyecto
│   ├── raw/                          # Datos originales SIVIGILA
│   ├── processed/                    # Datasets limpios y transformados
│   │   ├── 01_registros.csv          # Dataset limpio principal (2,438 registros)
│   │   ├── dataset_ml.csv            # Dataset para modelado (3,428 registros)
│   │   ├── serie_temporal_mensual.csv
│   │   └── serie_temporal_departamento.csv
│   └── external/                     # Datos complementarios externos
│
├── notebooks/                        # Jupyter Notebooks (CRISP-DM)
│   ├── 01_estructura_datos.ipynb     # Exploración inicial y estructura
│   ├── 02_calidad_datos.ipynb        # Auditoría de calidad y nulos
│   ├── 03_etl_limpieza_datos.ipynb   # ETL y limpieza
│   ├── 04_analisis_exploratorio.ipynb # EDA — factores de riesgo y correlaciones
│   ├── 05_modelos_ml.ipynb           # Entrenamiento y evaluación de modelos
│   ├── 06_predicciones.ipynb         # Predicciones individuales y perfiles de riesgo
│   └── 07_proyecciones_temporales.ipynb # Proyecciones SARIMA hasta dic 2027
│
├── supabase/                         # Configuración de base de datos
│   ├── schema.sql                    # Esquema de tablas (DDL)
│   ├── seed.sql                      # Datos iniciales
│   └── migrations/                   # Migraciones incrementales
│
├── reports/                          # Reportes y figuras generadas
├── docs/                             # Documentación adicional
├── scripts/                          # Scripts auxiliares
├── api/                              # Documentación de la API
│
├── AI.md                             # Especificación de diseño y arquitectura
├── requirements.txt                  # Dependencias globales (notebooks)
├── .gitignore                        # Archivos excluidos de Git
└── README.md                         # ← Este archivo
```

---

## 📌 Requisitos Previos

| Herramienta | Versión mínima | Propósito |
|-------------|---------------|-----------|
| **Python** | 3.11+ | Backend, ML, notebooks |
| **Node.js** | 18+ | Frontend React |
| **npm** | 9+ | Gestor de paquetes |
| **Git** | 2.x | Control de versiones |
| **Supabase** | Cuenta gratuita | Base de datos + Auth |
| **Google Cloud** (opcional) | — | BigQuery, GCS, API Gemini |

---

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd Project
```

### 2. Configurar Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. Ir a **SQL Editor** y ejecutar el archivo `supabase/schema.sql`.
3. Ejecutar `supabase/seed.sql` para crear datos iniciales.
4. Copiar las credenciales desde **Settings → API**:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `SUPABASE_JWT_SECRET`

### 3. Configurar el Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv

# Activar entorno (Windows)
venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Crear archivo de variables de entorno
copy .env.example .env
```

Editar `backend/.env` con las credenciales de Supabase:

```env
# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_KEY=eyJhbGci...
SUPABASE_JWT_SECRET=tu-jwt-secret

# ML models directory (relativo a backend/)
MODELS_DIR=../models

# App
APP_ENV=development
CORS_ORIGINS=http://localhost:5173

# Google Gemini (opcional — recomendaciones IA)
GOOGLE_API_KEY=
```

### 4. Configurar el Frontend

```bash
cd frontend
npm install
```

El frontend se conecta por defecto a `http://localhost:8000`. Si el backend corre en otro puerto, ajustar la variable en `src/services/`.

### 5. Configurar la IA (Opcional)

Para habilitar las **recomendaciones clínicas personalizadas** con IA:

1. Ir a [Google AI Studio](https://aistudio.google.com/apikey) y obtener una API key gratuita (sin tarjeta de crédito).
2. Agregar a `backend/.env`:

```env
GOOGLE_API_KEY=tu-api-key
```

> Si no se configura, el sistema retorna recomendaciones estáticas igualmente funcionales.

---

## ▶️ Ejecución

Abrir dos terminales:

**Terminal 1 — Backend (FastAPI):**
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend (Vite):**
```bash
cd frontend
npm run dev
```

Acceder a la aplicación en: **http://localhost:5173**

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| API Backend | http://localhost:8000 |
| Docs API (Swagger) | http://localhost:8000/docs |
| Health Check | http://localhost:8000/health |

---

## 👥 Roles del Sistema

La plataforma implementa **Control de Acceso Basado en Roles (RBAC)** con dos roles:

### 🔬 Rol ANL (Analítica)

Personal administrativo y analítico responsable de la vigilancia epidemiológica.

| Permiso | Descripción |
|---------|-------------|
| ✅ Dashboard analítico avanzado | KPIs epidemiológicos, tendencias, mapas |
| ✅ Gestión de datasets | Carga CSV/Excel, ETL automático |
| ✅ Entrenamiento de modelos ML | Selección de algoritmo, hiperparámetros |
| ✅ Comparación de modelos | Accuracy, F1, Recall, AUC-ROC, matrices de confusión |
| ✅ Generación de reportes | PDF/Excel con análisis clínico y epidemiológico |
| ✅ Gestión de usuarios | Crear, habilitar/inhabilitar usuarios CLI |
| ✅ Dashboards Power BI | Visualización de dashboards embebidos |
| ✅ Configuración de alertas | Umbrales y reglas |

### 🩺 Rol CLI (Clínica)

Personal médico y de enfermería responsable de la atención directa del paciente.

| Permiso | Descripción |
|---------|-------------|
| ✅ Registrar pacientes | Datos personales, antropométricos, socioeconómicos |
| ✅ Controles antropométricos | Peso, talla, IMC, perímetro braquial, signos clínicos |
| ✅ Ver predicciones ML | Clasificación nutricional y probabilidad de riesgo |
| ✅ Consultar alertas | Centro de alertas con filtros por severidad |
| ✅ Ver recomendaciones IA | Recomendaciones clínicas personalizadas |
| ✅ Historial del paciente | Evolución nutricional con gráficos |
| ❌ Gestión de usuarios | Solo ANL |
| ❌ Entrenamiento de modelos | Solo ANL |
| ❌ Configuración del sistema | Solo ANL |

---

## 📦 Módulos Funcionales

```
┌─────────────────────────────────────────────────────────┐
│                 NutriVigilancia — Módulos                │
├─────────────────┬───────────────────────────────────────┤
│ 1. Autenticación│ JWT, Supabase Auth, RLS               │
│ 2. Dashboard ANL│ KPIs, estadísticas, tendencias        │
│ 3. Dashboard CLI│ Panel clínico, pacientes activos      │
│ 4. Pacientes    │ CRUD, búsqueda, ficha completa        │
│ 5. Controles    │ Antropometría, Z-scores, predicción   │
│ 6. Machine Learn│ Entrenamiento, evaluación, inferencia  │
│ 7. Alertas      │ Detección temprana, niveles, lectura   │
│ 8. Recomendacio.│ IA Gemini + fallback estático          │
│ 9. Reportes     │ 4 tipos, PDF/Excel, análisis IA       │
│10. Datasets     │ Carga, ETL, validación, limpieza       │
│11. Usuarios     │ RBAC, habilitación, registro           │
│12. Estadísticas │ Indicadores poblacionales y temporales  │
└─────────────────┴───────────────────────────────────────┘
```

---

## 🤖 Modelos de Machine Learning

### Resultados

| Modelo | Accuracy | F1-ponderado | Recall Desnut. severa | AUC-ROC |
|--------|----------|-------------|----------------------|---------|
| Random Forest (con IMC) | 83.1% | 82.0% | 59.2% | — |
| Gradient Boosting (con IMC) | 82.9% | 82.0% | 63.3% | — |
| Gradient Boosting — Predictor binario | — | — | — | 91.3% |

### Modos de Operación

| Modo | Variables | Equipo requerido | Uso recomendado |
|------|-----------|-----------------|-----------------|
| **Modo Clínica (Modelo A)** | Incluye IMC, peso, talla | Báscula + tallímetro | Centros de salud, hospitales |
| **Modo Campo (Modelo B)** | Sin IMC, usa perímetro braquial | Solo cinta métrica | Jornadas rurales, tamizaje comunitario |

### Algoritmos Disponibles

- **Random Forest** — Robusto, buen desempeño general
- **Gradient Boosting** — Mejor recall en desnutrición severa
- **Logistic Regression** — Rápido, interpretable
- **XGBoost** — Alto rendimiento, regularización avanzada

### Pipeline de Entrenamiento

```
CSV/Excel → ETL (limpieza, normalización) → Feature Engineering
     → Train/Test Split → Entrenamiento → Evaluación de métricas
     → Serialización (.joblib) → Activación en producción
```

---

## 🌐 API REST — Endpoints

Base URL: `http://localhost:8000`

| Grupo | Ruta | Descripción |
|-------|------|-------------|
| **Health** | `GET /` | Info de la API |
| | `GET /health` | Estado del sistema y modelos |
| **Auth** | `POST /auth/login` | Inicio de sesión |
| | `POST /auth/register` | Registro de usuario (solo ANL) |
| **Pacientes** | `GET /pacientes` | Listar pacientes |
| | `POST /pacientes` | Registrar paciente |
| | `GET /pacientes/{id}` | Detalle del paciente |
| | `PUT /pacientes/{id}` | Actualizar paciente |
| **Controles** | `POST /controles` | Nuevo control antropométrico + predicción ML |
| | `GET /controles/{paciente_id}` | Historial de controles |
| **Alertas** | `GET /alertas` | Listar alertas |
| | `PATCH /alertas/{id}` | Marcar como leída |
| **Recomendaciones** | `POST /recomendaciones` | Obtener recomendación IA |
| **Modelos** | `GET /modelos` | Listar modelos entrenados |
| | `POST /modelos/{id}/activar` | Activar un modelo |
| **Estadísticas** | `GET /estadisticas` | KPIs del dashboard |
| **Entrenamiento** | `POST /entrenamiento` | Entrenar nuevo modelo |
| **Datasets** | `POST /datasets/upload` | Subir dataset CSV/Excel |
| | `POST /datasets/etl` | Ejecutar ETL sobre el dataset |
| **Reportes** | `GET /reportes/{tipo}` | Generar reporte (PDF/Excel) |
| **Usuarios** | `GET /usuarios` | Listar usuarios |
| | `PATCH /usuarios/{id}` | Habilitar/inhabilitar usuario |

> 📖 Documentación interactiva completa en: http://localhost:8000/docs

---

## 🗄 Base de Datos

El sistema usa **Supabase (PostgreSQL)** con las siguientes tablas:

```
┌──────────────┐       ┌──────────────┐
│   profiles   │       │  pacientes   │
│──────────────│       │──────────────│
│ id (UUID)    │◄──────│ registrado_  │
│ nombre       │       │  por (FK)    │
│ email        │       │ nombre       │
│ rol (ANL/CLI)│       │ apellidos    │
│ habilitado   │       │ fecha_nac    │
│ establecim.  │       │ sexo         │
└──────────────┘       │ per_etn_     │
                       │ peso_nac     │
                       │ cod_dpto_o   │
                       │ area_        │
                       │ estrato_     │
                       │ ...          │
                       └──────┬───────┘
                              │ 1:N
                   ┌──────────┴──────────┐
                   │                     │
            ┌──────┴──────┐       ┌──────┴──────┐
            │  controles  │       │   alertas   │
            │─────────────│       │─────────────│
            │ paciente_id │       │ paciente_id │
            │ peso_act    │       │ control_id  │
            │ talla_act   │       │ tipo        │
            │ per_braqui  │       │ nivel       │
            │ imc         │       │ (severe/    │
            │ zscore_pt   │       │  moderate/  │
            │ zscore_te   │       │  mild/risk) │
            │ edema       │       │ mensaje     │
            │ clas_nombre │       │ leida       │
            │ prob_desnut.│       └─────────────┘
            │ modelo_usado│
            └─────────────┘
```

**Seguridad:**
- Row Level Security (RLS) habilitada en todas las tablas.
- El backend usa `service_key` para bypass de RLS.
- Trigger automático para crear perfil al registrar usuario en Supabase Auth.

---

## 📄 Reportes Clínicos

El sistema genera **4 tipos de reportes** clínicamente útiles, disponibles en PDF y Excel:

### 1. Reporte de Evaluación Nutricional Individual

| Sección | Contenido |
|---------|-----------|
| Datos del paciente | Nombre, edad, sexo, zona, establecimiento |
| Evaluación antropométrica | Peso, talla, IMC, perímetro braquial, Z-scores WHO |
| Clasificación nutricional | Estado asignado por ML, probabilidad de riesgo, modelo usado |
| Signos clínicos | Edema, delgadez, palidez, piel reseca, hiperpigmentación, cambios en cabello |
| Historial de controles | Evolución temporal del peso, talla, IMC y Z-scores |
| Alertas activas | Alertas generadas para el paciente |
| Recomendaciones IA | Intervenciones clínicas personalizadas |

### 2. Reporte Poblacional

| Sección | Contenido |
|---------|-----------|
| Resumen general | Total de pacientes evaluados, distribución por estado nutricional |
| Análisis demográfico | Distribución por edad, sexo, zona (urbana/rural), etnia |
| Prevalencia | Tasas de desnutrición por severidad, municipio, departamento |
| Factores de riesgo | Estrato socioeconómico, nivel educativo del cuidador, esquema de vacunación |
| Indicadores críticos | Top pacientes en riesgo severo, municipios prioritarios |
| Tendencias | Evolución mensual y anual de casos |

### 3. Reporte Epidemiológico

| Sección | Contenido |
|---------|-----------|
| Contexto regional | Distribución geográfica (Cesar, Guajira, Magdalena) |
| Incidencia/prevalencia | Tasas por período, comparativas inter-anuales |
| Análisis espacial | Concentración de casos por municipio |
| Proyecciones SARIMA | Tendencias estimadas hasta diciembre 2027 |
| Bandas de confianza | Intervalos al 80% y 95% |
| Recomendaciones | Acciones sugeridas para salud pública |

### 4. Reporte de Intervención y Monitoreo

| Sección | Contenido |
|---------|-----------|
| Indicadores de proceso | Pacientes registrados, controles realizados, completitud de datos |
| Indicadores de resultado | Cambios en tasas de desnutrición, mejoras en Z-scores |
| Efectividad | Comparación pre/post intervención |
| Cobertura | Municipios y establecimientos atendidos |
| Alertas generadas | Distribución por severidad y tipo |
| Seguimiento | Pacientes con y sin seguimiento activo |

---

## 📊 Dashboards Power BI

Los dashboards se conectan a BigQuery (`proyecto.desnutricion.*`) y cubren cuatro perspectivas:

| Dashboard | Pregunta que responde | Tablas BigQuery |
|-----------|----------------------|-----------------|
| **Epidemiológico** | ¿Cuántos casos hay, dónde y cuándo? | `limpio_unificado`, `serie_temporal_mensual` |
| **Factores de riesgo** | ¿Por qué se desnutren? | `limpio_unificado` |
| **Proyección temporal** | ¿Qué pasará hasta 2027? | `proy_casos_mensual`, `proy_tasa_severa`, `proy_tasa_moderada`, `proy_zscore_mensual`, `proy_casos_departamento` |
| **Cuadro de mando** | ¿Cuál es el estado general del sistema? | Todas las tablas |

---

## 📊 Datos y Fuentes

| Atributo | Valor |
|----------|-------|
| **Fuente** | SIVIGILA — Evento 113 (Desnutrición aguda en menores de 5 años) |
| **Período** | 2020–2025 (73 meses) |
| **Cobertura** | 45 municipios, 9 departamentos |
| **Registros (limpio)** | 2,438 |
| **Registros (ML)** | 3,428 (con sobre-muestreo SMOTE) |
| **Almacenamiento** | Google Cloud Storage + BigQuery |

> ⚠️ Los datos crudos no se incluyen en el repositorio por restricciones de privacidad. Contactar al equipo para acceso.

---

## 🔬 Metodología

El proyecto sigue la metodología **CRISP-DM** (Cross-Industry Standard Process for Data Mining):

```
1. Entendimiento del negocio          ── Objetivo y alcance
2. Entendimiento de los datos         ── Notebooks 01, 02
3. Preparación de los datos           ── Notebook 03 (ETL)
4. Modelado                           ── Notebooks 04, 05, 06
5. Evaluación                         ── Notebook 05
6. Despliegue                         ── Notebook 07 + App Web + Power BI
```

---

## 🛠 Stack Tecnológico

### Backend
| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| Python | 3.11+ | Lenguaje principal |
| FastAPI | 0.115 | Framework web (REST API) |
| Uvicorn | 0.30.6 | Servidor ASGI |
| Supabase SDK | ≥2.10 | Cliente de base de datos |
| python-jose | 3.3.0 | Autenticación JWT |
| Pydantic | 2.8.2 | Validación de esquemas |
| scikit-learn | ≥1.5.2 | Modelos de ML |
| imbalanced-learn | ≥0.12.3 | SMOTE (sobre-muestreo) |
| pandas | 2.2.2 | Manipulación de datos |
| numpy | ≥1.26 | Cálculos numéricos |
| google-genai | ≥1.0 | Google Gemini (recomendaciones IA) |
| openpyxl | ≥3.1 | Generación de Excel |
| httpx | 0.27.2 | Cliente HTTP asíncrono |

### Frontend
| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| React | 18.3 | Framework de UI |
| Vite | 5.3 | Build tool y dev server |
| TailwindCSS | 3.4 | Estilos utilitarios |
| React Router | 6.24 | Enrutamiento SPA |
| Recharts | 2.12 | Gráficos y visualizaciones |
| Framer Motion | 11.3 | Animaciones suaves |
| Lucide React | 0.395 | Iconografía |
| Axios | 1.7 | Cliente HTTP |

### Infraestructura
| Tecnología | Propósito |
|-----------|-----------|
| Supabase | PostgreSQL + Auth + Row Level Security |
| Google Cloud Storage | Almacenamiento de datos |
| BigQuery | Data warehouse para Power BI |
| Power BI | Dashboards de visualización |

---

## 🔐 Variables de Entorno

Archivo: `backend/.env`

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `SUPABASE_URL` | ✅ | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | ✅ | Clave anónima (pública) |
| `SUPABASE_SERVICE_KEY` | ✅ | Clave de servicio (bypasa RLS) |
| `SUPABASE_JWT_SECRET` | ✅ | Secret para verificar tokens JWT |
| `MODELS_DIR` | ❌ | Directorio de modelos (default: `../models`) |
| `DATA_UPLOADS_DIR` | ❌ | Directorio de uploads (default: `../data/uploads`) |
| `DATA_PROC_DIR` | ❌ | Directorio procesados (default: `../data/processed`) |
| `APP_ENV` | ❌ | Entorno (default: `development`) |
| `CORS_ORIGINS` | ❌ | Orígenes CORS separados por coma |
| `GOOGLE_API_KEY` | ❌ | API key de Google Gemini para recomendaciones IA |

---

## 🤝 Contribución

1. Fork del repositorio
2. Crear una rama feature: `git checkout -b feature/mi-feature`
3. Commit de los cambios: `git commit -m 'feat: descripción'`
4. Push a la rama: `git push origin feature/mi-feature`
5. Abrir un Pull Request

---

## 👨‍💻 Autores

**Proyecto de Grado**  
Universidad Popular del Cesar (UPC)  
Programa de Ingeniería de Sistemas

---

## 📜 Licencia

Este proyecto fue desarrollado con fines académicos como Proyecto de Grado. Todos los derechos reservados.  
Los datos del SIVIGILA son de uso público conforme a la normativa colombiana de datos abiertos.

---

<p align="center">
  <sub>Hecho con ❤️ para la salud infantil de Valledupar, Colombia</sub>
</p>
