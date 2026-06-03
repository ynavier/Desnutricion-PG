<p align="center">
  <img src="frontend/public/Logo.png" alt="NutriVigilancia Logo" width="80"/>
</p>

<h1 align="center">NutriVigilancia</h1>
<p align="center"><b>Sistema de Predicción y Vigilancia de Desnutrición Infantil</b></p>
<p align="center">Universidad Popular del Cesar · Proyecto de Grado · Ingeniería de Sistemas · 2026</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white"/>
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white"/>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black"/>
  <img src="https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white"/>
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white"/>
  <img src="https://img.shields.io/badge/Cloud%20Run-Google-4285F4?style=flat-square&logo=googlecloud&logoColor=white"/>
  <img src="https://img.shields.io/badge/Vercel-Frontend-000000?style=flat-square&logo=vercel&logoColor=white"/>
  <img src="https://img.shields.io/badge/scikit--learn-ML-F7931E?style=flat-square&logo=scikitlearn&logoColor=white"/>
</p>

---

## Descripción

NutriVigilancia es una plataforma web de vigilancia epidemiológica nutricional para menores de 5 años en Colombia. Integra Machine Learning supervisado para predicción de estados nutricionales, proyecciones temporales con modelos SARIMA, análisis IA con grandes modelos de lenguaje y un asistente clínico de voz (NIVI) basado en Llama 3.3. Los datos históricos provienen del sistema SIVIGILA (Evento 113 — Desnutrición Aguda) y los datos clínicos actuales del registro directo por personal de salud.

---

## Índice

1. [Arquitectura del sistema](#arquitectura-del-sistema)
2. [Stack tecnológico](#stack-tecnológico)
3. [Roles y paneles](#roles-y-paneles)
4. [Funcionalidades por panel](#funcionalidades-por-panel)
5. [Machine Learning](#machine-learning)
6. [Proyecciones epidemiológicas](#proyecciones-epidemiológicas)
7. [Asistente NIVI](#asistente-nivi)
8. [API REST](#api-rest)
9. [Estructura del proyecto](#estructura-del-proyecto)
10. [Base de datos](#base-de-datos)
11. [Despliegue en producción](#despliegue-en-producción)
12. [Instalación local](#instalación-local)
13. [Variables de entorno](#variables-de-entorno)
14. [Estándares normativos](#estándares-normativos)

---

## Arquitectura del sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser)                        │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ Panel CLI │  │ Panel ANL │  │ Panel ADM │   React + Vite     │
│  │ /cli/*   │  │ /anl/*   │  │ /adm/*   │   Tailwind + Framer  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                      │
└───────┼──────────────┼──────────────┼───────────────────────────┘
        │              │              │  HTTPS / REST API
        ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND — Google Cloud Run                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    FastAPI + Uvicorn                    │   │
│  │                                                         │   │
│  │  /auth          /pacientes    /controles   /alertas     │   │
│  │  /estadisticas  /proyecciones /modelos     /modelos_ml  │   │
│  │  /entrenamiento /datasets     /reportes    /chat        │   │
│  │  /analisis-ia   /compartir    /usuarios    /proyecciones │   │
│  └──────────┬──────────────────────────────────────────────┘   │
│             │                                                   │
│  ┌──────────▼──────────┐  ┌───────────────────────────────┐   │
│  │   Capa de servicios  │  │        Capa de ML             │   │
│  │                      │  │                               │   │
│  │  • ETL SIVIGILA      │  │  • scikit-learn (RF/XGB/GB/LR)│   │
│  │  • Entrenamiento ML  │  │  • statsmodels (SARIMA)       │   │
│  │  • Chat IA (Groq)    │  │  • imbalanced-learn (SMOTE)   │   │
│  │  • Análisis IA       │  │  • joblib (persistencia)      │   │
│  │  • Reportes (Gemini) │  │                               │   │
│  └──────────────────────┘  └───────────────────────────────┘   │
└─────────────────┬───────────────────────────────────────────────┘
                  │
     ┌────────────┼────────────┐
     ▼            ▼            ▼
┌─────────┐  ┌─────────┐  ┌────────────────┐
│Supabase │  │  GCS    │  │   APIs externas │
│(PostgreSQL│  │(Storage)│  │                │
│  + Auth)│  │modelos/ │  │ Groq: LLM+STT  │
│         │  │uploads/ │  │ Google: Gemini  │
│         │  │processed│  │                │
└─────────┘  └─────────┘  └────────────────┘
```

### Flujo de autenticación

```
Usuario → Login → Supabase Auth → JWT Token → FastAPI (Bearer)
                                            → Perfil en BD (rol: CLI|ANL|ADM)
                                            → Redirección según rol
```

### Flujo de predicción ML

```
Control clínico → ETL en memoria → Modelo A (con IMC) o B (sin IMC)
               → Z-score OMS → Clasificación (6 clases)
               → Alerta automática si severo/moderado
               → Guardado en BD + notificación en panel
```

---

## Stack tecnológico

### Frontend
| Librería | Versión | Uso |
|---|---|---|
| React | 18 | Framework UI |
| Vite | 5 | Bundler + dev server |
| Tailwind CSS | 3 | Estilos utilitarios |
| Framer Motion | 11 | Animaciones y transiciones |
| Recharts | 2 | Gráficas (barras, líneas, radar, scatter) |
| React Router | 6 | Navegación SPA |
| Axios | 1 | Cliente HTTP |
| @splinetool/react-spline | — | Animación 3D NIVI |
| jsPDF + html2canvas | — | Generación PDF cliente |

### Backend
| Librería | Versión | Uso |
|---|---|---|
| FastAPI | 0.115 | Framework API REST |
| Uvicorn | 0.30 | Servidor ASGI |
| Pydantic | 2.8 | Validación de datos |
| pydantic-settings | 2.4 | Config desde .env |
| supabase | ≥2.10 | Cliente BD + Auth + Storage |
| scikit-learn | ≥1.5 | Modelos ML |
| imbalanced-learn | ≥0.12 | SMOTE |
| statsmodels | ≥0.14 | SARIMA proyecciones |
| pandas | 2.2 | ETL y análisis de datos |
| numpy | ≥1.26 | Operaciones numéricas |
| joblib | ≥1.4 | Serialización de modelos |
| httpx | 0.27 | Cliente HTTP async (Groq/Gemini) |
| google-genai | ≥1.0 | Google Gemini (reportes IA) |
| aiosmtplib | ≥3.0 | Envío de correos SMTP |
| openpyxl | ≥3.1 | Generación Excel |
| python-multipart | 0.0.9 | Upload de archivos |
| python-jose | 3.3 | JWT (verificación complementaria) |

### Infraestructura
| Servicio | Uso |
|---|---|
| Google Cloud Run | Backend containerizado (min-instances=1, timeout=3600s) |
| Google Artifact Registry | Registro de imágenes Docker |
| Google Cloud Storage | Modelos .joblib · datasets CSV · informes PDF |
| Supabase | PostgreSQL · Auth · Storage · Row Level Security |
| Vercel | Frontend React (CDN global) |
| GitHub Actions | CI/CD automático al hacer push a `main` |

---

## Roles y paneles

```
                    ┌─────────────────────────────┐
                    │         Login               │
                    │   /login → Supabase Auth    │
                    └──────────┬──────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │   CLI /cli   │  │   ANL /anl   │  │   ADM /adm   │
    │              │  │              │  │              │
    │ Personal     │  │ Analistas    │  │ Administra-  │
    │ Clínico      │  │ Salud Pública│  │ dores Sistema│
    └──────────────┘  └──────────────┘  └──────────────┘
```

| Rol | Acceso a | No accede a |
|---|---|---|
| **CLI** | Pacientes, controles, alertas, NIVI clínica | Configuración, datasets, modelos, dashboards ANL |
| **ANL** | Dashboard epidemiológico, reportes, proyecciones, modelos (lectura), NIVI ANL | Administración de usuarios, entrenamiento, datasets |
| **ADM** | Todo lo administrativo: usuarios, datasets, entrenamiento, modelos, informe ML | Panel clínico, dashboard epidemiológico ANL |

---

## Funcionalidades por panel

### Panel Clínico — CLI

#### Gestión de pacientes
- Registro completo con datos sociodemográficos (estrato, etnia, área, municipio, establecimiento)
- Datos perinatales: peso al nacer, edad gestacional, lactancia, complementaria
- Indicadores de salud: esquema vacunal, seguimiento C&D, factores de riesgo social
- Búsqueda y filtros por nombre, estado nutricional, municipio, establecimiento

#### Controles nutricionales
- Registro: peso, talla, perímetro braquial, IMC calculado automáticamente
- Z-score P/E calculado con tablas OMS 2006
- Predicción ML automática del estado nutricional (6 clases)
- Signos clínicos: edema, delgadez visible, palidez, piel reseca, hiperpigmentación, cambios cabello
- Historial visual de todos los controles del paciente
- Generación automática de alertas si el resultado es crítico

#### Alertas
- Niveles: severa (rojo), moderada (naranja), riesgo (amarillo)
- Marcar como leída individualmente o todas a la vez
- Contador de no leídas en el sidebar
- Filtro por nivel de severidad

#### Asistente NIVI (CLI)
- Chat con IA especializada en nutrición infantil (Llama 3.3 70B via Groq)
- Detección automática de nombre de paciente en el mensaje → búsqueda en BD → carga de contexto
- Desambiguación visual con tarjetas si hay varios pacientes con el mismo nombre
- Entrada de voz con transcripción automática (Groq Whisper)
- Animación Spline 3D reactiva al volumen del micrófono
- Recomendaciones basadas en OMS/MSPS/ICBF
- Historial persistente durante la sesión
- Ventana flotante redimensionable que emerge del botón con animación spring

---

### Dashboard Analítico — ANL

#### Banner de estado epidemiológico
Se actualiza automáticamente con los filtros activos y muestra:
- **GAM** (Global Acute Malnutrition): % moderada + severa
- **SAM** (Severe Acute Malnutrition): % severa únicamente
- **Hosp.**: tasa de hospitalización
- **Sin C&D**: % sin seguimiento de crecimiento y desarrollo

Niveles con paleta estándar salud: 🔴 Crítica · 🟠 Alta · 🟡 Media · 🟢 Favorable

#### KPIs en tiempo real
- Total casos monitoreados (BD + datasets históricos SIVIGILA)
- Tasa de desnutrición severa + moderada
- Tasa de hospitalización
- Actualización automática cada 2 minutos

#### Filtros geográficos
- Por defecto: CESAR → VALLEDUPAR
- Opciones dinámicas desde BD + datasets procesados
- Los municipios se filtran al departamento seleccionado
- Todos los charts y KPIs respetan el filtro activo

#### Vista Proyecciones (Vista 1)
- Gráfica principal con línea histórica azul sólida y pronóstico morado discontinuo
- Bandas de confianza IC 80% (`#B39DDB`) e IC 95% (`#EDE7F6`)
- Toggle métrica: Casos · Tasa severa · Tasa moderada · Z-score
- Toggle vista: Mensual · Anual (agrega datos por año)
- Banner de nivel de datos (municipio / departamento / departamento-fallback / nacional)
- Alertas normativas automáticas basadas en umbrales OMS/MSPS/ICBF

#### Vista Distribuciones (Vista 2)
- Por estrato socioeconómico (barras apiladas severo/moderado/adecuado)
- Por sexo M/F con barras proporcionales de severidad
- Por grupo etario (0–1, 1, 2, 3, 4, 5+ años)
- Crecimiento y desarrollo (donut con/sin seguimiento + alerta si >30% sin)

#### Análisis IA del dashboard
- NIVI analiza automáticamente al abrir el panel con los datos del filtro activo
- Genera resumen interpretativo, alertas críticas y recomendaciones
- Conversación libre sobre los datos, posibilidad de pedir planes de acción
- Entrada de voz con Spline 3D reactiva (mismo comportamiento que CLI)

#### Informes
- Tipos: Nutricional · Epidemiológico · Clínico de Pacientes
- Gráficas primero, texto después
- Análisis IA con Gemini incluido en el informe
- **Descargar PDF**: `window.print()` con CSS de impresión
- **Compartir**: subir a Supabase Storage → link de descarga → opciones Correo / Outlook / WhatsApp

---

### Panel Administrativo — ADM

#### Gestión de usuarios
- Lista completa de todos los usuarios del sistema (CLI + ANL + ADM)
- KPIs: total, clínicos, analíticos, administradores
- Filtros por rol con estilo clay activo
- Edición de rol inline con dropdown sin confirmación adicional
- Toggle habilitado/inhabilitado (sincronizado con Supabase Auth)
- Creación de nuevos usuarios con selector de rol visual y descripción de permisos

#### Datasets SIVIGILA
- Carga de archivos Excel SIVIGILA Evento 113
- Pipeline ETL completo: filtro pediátrico → outliers → imputación → columnas ML
- Columnas extra para dashboard: `sexo_`, `pac_hos_`, `ndep_resi`, `nmun_resi`, `anio_mes`
- Habilitación/deshabilitación para entrenamiento
- Estado: pendiente → procesando → procesado / error

#### Entrenamiento ML
- Selección de algoritmos: Random Forest · XGBoost (HistGB) · Gradient Boosting · Logistic Regression
- Parámetros configurables por algoritmo (n_estimators, max_depth, learning_rate, etc.)
- Fuentes de datos: datasets SIVIGILA + registros BD con filtros opcionales
- SMOTE opcional para balanceo de clases
- Ejecución en thread pool para no bloquear el servidor durante el entrenamiento
- Estado persistido en tabla `jobs_entrenamiento` (sobrevive reinicios del contenedor)
- **Auto-selección**: al terminar, activa automáticamente el modelo con mejor F1 Weighted
- **1 versión por tipo**: limpieza automática de versiones anteriores del mismo algoritmo

#### Modelos ML
- Comparativa gráfica: barras agrupadas (Accuracy, F1 Weighted, F1 Macro) + radar
- Ranking por F1 Weighted con badge dorado para el mejor
- Lista colapsable (3 visibles → "Ver más" con scroll)
- Multi-selección con checkbox + "Seleccionar todos (excepto activo)"
- Eliminación individual o masiva
- Detalle del modelo seleccionado con métricas A y B
- NIVI explica las métricas en lenguaje no técnico

#### Informe ML
- Radar de métricas del modelo activo
- Tabla con interpretación (Excelente/Bueno/Aceptable/Requiere mejora)
- Modelo A vs Modelo B (barras comparativas)
- Evolución histórica: Accuracy + F1 Weighted + CV por versión
- F1 promedio por tipo de algoritmo
- Scatter: volumen de datos vs rendimiento
- Exportar PDF + Compartir (Supabase Storage)

---

## Machine Learning

### Algoritmos disponibles

| Algoritmo | Clave | Hiperparámetros configurables |
|---|---|---|
| Random Forest | `rf` | n_estimators, max_depth, min_samples_split, max_features |
| XGBoost (HistGB) | `xgb` | max_iter, learning_rate, max_depth |
| Gradient Boosting | `gb` | n_estimators, learning_rate, max_depth, min_samples_leaf |
| Regresión Logística | `lr` | C, max_iter, solver |

### Features del modelo

**Modelo A** (con IMC — 25 features):
`edad_meses, per_etn_, estrato_, area_, cod_dpto_o, niv_educat, menores, gp_pobicbf, peso_nac, edad_ges, peso_act, per_braqui, imc, t_lechem, e_complem, crec_dllo, esq_vac, carne_vac, edema, delgadez, palidez, piel_rese, hiperpigm, cambios_cabello, ruta_atenc`

**Modelo B** (sin IMC — 24 features): igual que A sin `imc`

### Pipeline ETL SIVIGILA

```
Excel SIVIGILA
  → Filtro pediátrico ≤ 5 años (uni_med_ + edad_)
  → Fix coma decimal (formato es-CO)
  → Ceros clínicos → NaN (peso_nac, talla_nac, per_braqui, edad_ges)
  → Outliers físicos: peso_act [1-25kg] · talla_act [45-150cm] · imc [10-30]
  → Eliminar clas_peso == 7
  → Validación coherencia edad vs fecha_nac
  → Calcular edad_meses
  → Imputación estratificada por clas_peso (mediana para continuas)
  → peso_nac por grupo edad_ges · edad_ges → mediana
  → Moda para binarias/categóricas (edema, esq_vac, etc.)
  → Castear a Int64
  → Adjuntar columnas dashboard: sexo_, pac_hos_, edad_, ndep_resi, nmun_resi, anio_mes
  → CSV procesado (features ML + columnas dashboard)
```

### Auto-selección del mejor modelo

Al finalizar cada entrenamiento:
1. Compara F1 Weighted del nuevo modelo con el activo actual
2. Si el nuevo supera al activo → activa el nuevo, desactiva el anterior
3. Si el actual es mejor → lo mantiene
4. Log explícito del resultado en el job

```
✅ Auto-selección: "Random Forest 143256" activado (F1: 0.871 > anterior: 0.843)
ℹ Modelo actual sigue siendo el mejor (F1 actual: 0.871 ≥ nuevo: 0.855)
```

---

## Proyecciones epidemiológicas

### Modelo SARIMA

```
SARIMA(1, 1, 1)(1, 1, 0)[12]
  p=1: autorregresión de orden 1
  d=1: diferenciación de orden 1 (tendencia)
  q=1: media móvil de orden 1
  P=1: autorregresión estacional
  D=1: diferenciación estacional
  Q=0: sin media móvil estacional
  s=12: período estacional anual
```

### Fuentes de datos para proyecciones

| Prioridad | Fuente | Datos |
|---|---|---|
| 1 | Datasets SIVIGILA procesados (`ndep_resi` + `anio_mes`) | Departamento/municipio |
| 2 | BD clínica (`pacientes.dpto_residencia` + `controles.fecha`) | Datos actuales |
| 3 | `serie_temporal_mensual.csv` (73 puntos 2020-2026) | Nacional |

### Fallback jerárquico

```
Municipio (Valledupar) → si insuficiente (<12 meses reales, <20 casos)
  → Departamento (Cesar) → si insuficiente
    → Nacional
```

### Intervalos de confianza

- **IC 80%**: banda más oscura (`#B39DDB`) — 80% de probabilidad de contener el valor real
- **IC 95%**: banda más clara (`#EDE7F6`) — 95% de probabilidad

### Alertas de proyección (estándares OMS/MSPS/ICBF)

| Métrica | Nivel crítico | Nivel alto | Nivel medio |
|---|---|---|---|
| SAM (tasa severa) | ≥ 5% | ≥ 2% | ≥ 1% |
| GAM (tasa moderada) | ≥ 15% | ≥ 10% | ≥ 5% (Caribe) |
| Z-score poblacional | ≤ −3 | ≤ −2 | ≤ −1.5 |
| Casos (tendencia) | ≥ 50/mes + IC95 confirma | ≥ 50/mes | ≥ 20/mes |

---

## Asistente NIVI

### Arquitectura

```
Entrada texto/voz → [Groq Whisper STT] → Texto
Texto + Contexto → [Llama 3.3 70B via Groq] → Respuesta

Contexto inyectado según panel:
  CLI:  datos del paciente (nombre, edad, peso, talla, z-score, estado)
  ANL:  datos del dashboard (GAM, SAM, distribuciones, zona filtrada)
  ADM:  métricas del modelo ML (Accuracy, F1, CV, muestras, fuentes)
```

### Comportamiento por panel

#### NIVI CLI
- Sistema prompt: especialista en nutrición infantil, tono de colega clínico
- Detección de nombre de paciente en el mensaje mediante LLM (Groq, max_tokens=20)
- Si detecta nombre → búsqueda en BD → contexto inyectado automáticamente
- Desambiguación si hay varios pacientes con el mismo nombre (tarjetas seleccionables)
- Ventana flotante que emerge del botón (transform-origin desde esquina)
- Historial persistente en sesión, se resetea al cambiar filtro de paciente

#### NIVI ANL
- Sistema prompt: epidemiología nutricional + toma de decisiones en salud pública
- Al abrir: análisis automático del estado del dashboard (zona, GAM, SAM, distribuciones)
- Permite preguntar sobre tendencias, municipios críticos, planes de acción
- Historial persistente durante la sesión, se resetea al cambiar filtros geo

#### NIVI ADM (Modelos)
- Explica Accuracy, F1 Weighted, F1 Macro, CV Accuracy en lenguaje no técnico
- Diferencia Modelo A (con IMC) vs Modelo B (sin IMC)
- No da recomendaciones técnicas, solo explica los números

### Funciones de voz
- **Transcripción**: Groq Whisper (`whisper-large-v3-turbo`)
- **Formatos**: audio/webm (MediaRecorder del navegador)
- **Límites**: máx 25 MB, mínimo 1000 bytes
- **Idioma**: español (es)
- **Visualización**: Spline 3D reactiva al volumen (Web Audio API + EMA smoothing α=0.18/0.06)

---

## API REST

### Autenticación
```
POST /auth/login        → { email, password } → { access_token, user }
POST /auth/logout
```
Todas las rutas requieren `Authorization: Bearer <token>`

### Pacientes (CLI)
```
GET    /pacientes              → lista con último control
POST   /pacientes              → crear paciente
GET    /pacientes/:id          → detalle con historial completo
```

### Controles (CLI)
```
GET    /controles?paciente_id  → controles de un paciente
POST   /controles              → registrar control + predicción ML + alerta automática
```

### Alertas (CLI)
```
GET    /alertas                → alertas del usuario
PATCH  /alertas/:id/leer       → marcar leída
PATCH  /alertas/marcar-todas   → marcar todas leídas
```

### Estadísticas (ANL)
```
GET  /estadisticas                     → KPIs + distribuciones + tendencia
GET  /estadisticas?dpto=X&municipio=Y  → filtrado geográfico
GET  /estadisticas/detalle             → desglose demográfico (sexo, edad, estrato, C&D)
GET  /estadisticas/geo                 → opciones de filtros disponibles
```

### Proyecciones (ANL)
```
GET  /proyecciones?metrica=casos&dpto=CESAR&municipio=VALLEDUPAR&vista=mensual
     metrica: casos | tasa_severa | tasa_moderada | zscore
     → { datos, fuente, zona_efectiva, modelo, n_train, baja_densidad }
GET  /proyecciones/departamentos  → dptos con datos suficientes para proyectar
```

### Análisis IA
```
POST /analisis-ia?dpto=X&municipio=Y  → análisis IA del dashboard
     → { resumen, alertas[], recomendaciones[], tendencia }
```

### Chat / NIVI
```
POST /chat                    → { mensaje, historial, contexto_paciente }
POST /chat/transcribir        → audio (multipart) → { texto }
```

### Modelos ML (ADM)
```
GET    /modelos               → lista de modelos entrenados
PUT    /modelos/:id/activar   → activar modelo para producción
DELETE /modelos/:id           → eliminar modelo + archivos
POST   /modelos/limpiar-huerfanos → eliminar archivos sin registro en BD
```

### Entrenamiento (ADM)
```
POST /entrenamiento/iniciar   → { modelos, test_size, cv_folds, nombre } → { job_id }
GET  /entrenamiento/:job_id   → estado del job (en memoria o Supabase)
```

### Datasets (ADM)
```
GET    /datasets              → lista de datasets
POST   /datasets/upload       → subir Excel SIVIGILA
POST   /datasets/:id/procesar → ejecutar ETL
PATCH  /datasets/:id/habilitar → habilitar/deshabilitar para entrenamiento
DELETE /datasets/:id          → eliminar
```

### Reportes (ANL/ADM)
```
POST /reportes/generar        → { tipo, fecha_desde, fecha_hasta, zona }
GET  /reportes/historial      → últimos 20 reportes (en memoria)
GET  /reportes/:id            → reporte completo
GET  /reportes/:id/excel      → descargar XLSX
```

### Compartir (ANL)
```
POST /compartir/subir-pdf     → { pdf_base64, nombre_archivo } → { url }
POST /compartir/informe       → { destinatario, asunto, pdf_base64 } (requiere SMTP)
```

### Usuarios (ADM)
```
GET    /usuarios              → todos los usuarios (CLI + ANL + ADM)
POST   /usuarios              → crear usuario con rol
PATCH  /usuarios/:id/habilitar → habilitar/inhabilitar
PATCH  /usuarios/:id/rol      → cambiar rol
```

---

## Estructura del proyecto

```
Project/
├── backend/
│   ├── app/
│   │   ├── auth/
│   │   │   ├── router.py           # login/logout
│   │   │   └── dependencies.py     # get_current_user, require_cli, require_anl, require_adm
│   │   ├── routers/
│   │   │   ├── pacientes.py
│   │   │   ├── controles.py
│   │   │   ├── alertas.py
│   │   │   ├── estadisticas.py     # KPIs + distribuciones + geo
│   │   │   ├── proyecciones.py     # SARIMA
│   │   │   ├── analisis_ia.py      # análisis IA del dashboard
│   │   │   ├── modelos.py
│   │   │   ├── entrenamiento.py
│   │   │   ├── datasets.py
│   │   │   ├── reportes.py
│   │   │   ├── chat.py             # NIVI + Whisper
│   │   │   ├── compartir.py        # PDF → Supabase Storage
│   │   │   └── usuarios.py
│   │   ├── services/
│   │   │   ├── entrenamiento.py    # pipeline ML + auto-selección + thread pool
│   │   │   ├── etl.py              # ETL SIVIGILA
│   │   │   ├── chat_asistente.py   # NIVI (Groq Llama)
│   │   │   ├── ai_reportes.py      # análisis reportes (Gemini)
│   │   │   ├── reportes_data.py    # datos para cada tipo de reporte
│   │   │   └── etl.py
│   │   ├── ml/
│   │   │   ├── loader.py           # carga modelos desde GCS al arrancar
│   │   │   └── predictor.py        # predicción + z-score OMS
│   │   ├── schemas/
│   │   │   ├── paciente.py
│   │   │   └── control.py
│   │   ├── config.py               # Settings (pydantic-settings)
│   │   └── database.py             # clientes Supabase (service + anon)
│   ├── main.py                     # app FastAPI + lifespan (carga modelos)
│   ├── Dockerfile
│   ├── .dockerignore
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   │   ├── Logo.png
│   │   ├── NIVI 1.png              # NIVI ojos abiertos
│   │   └── NIVI 2.png              # NIVI ojos cerrados (parpadeo)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── NotFound.jsx
│   │   │   ├── auth/
│   │   │   │   └── LoginPage.jsx
│   │   │   ├── cli/
│   │   │   │   ├── DashboardCLI.jsx
│   │   │   │   ├── HomeCLI.jsx
│   │   │   │   ├── PacientesCLI.jsx
│   │   │   │   ├── DetallePaciente.jsx
│   │   │   │   └── AlertasCLI.jsx
│   │   │   ├── anl/
│   │   │   │   ├── DashboardANL.jsx
│   │   │   │   ├── HomeANL.jsx     # dashboard epidemiológico completo
│   │   │   │   ├── ModelosANL.jsx  # comparativa + gestión modelos
│   │   │   │   └── ReportesANL.jsx
│   │   │   └── adm/
│   │   │       ├── DashboardADM.jsx
│   │   │       ├── HomeADM.jsx
│   │   │       └── ReportesADM.jsx # informe ML
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   └── ProtectedRoute.jsx
│   │   │   ├── cli/
│   │   │   │   ├── ChatAsistente.jsx   # NIVI CLI (voz + Spline + paciente ctx)
│   │   │   │   └── SidebarCLI.jsx
│   │   │   ├── anl/
│   │   │   │   ├── ChatDashboard.jsx   # NIVI ANL (voz + Spline + dashboard ctx)
│   │   │   │   └── SidebarANL.jsx
│   │   │   └── adm/
│   │   │       └── SidebarADM.jsx
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── services/
│   │   │   └── api.js              # Axios con interceptor JWT
│   │   ├── App.jsx                 # Rutas principales
│   │   ├── main.jsx
│   │   └── index.css               # Tokens Tailwind + clay styles
│   ├── vercel.json                 # SPA rewrites
│   └── vite.config.js              # proxy /api → backend local
│
├── notebooks/
│   ├── 01_estructura_datos.ipynb
│   ├── 02_calidad_datos.ipynb
│   ├── 03_etl_limpieza_datos.ipynb
│   ├── 04_analisis_exploratorio.ipynb
│   ├── 05_modelos_ml.ipynb
│   ├── 06_predicciones.ipynb
│   └── 07_proyecciones_temporales.ipynb  # SARIMA hasta dic 2027
│
├── data/
│   └── processed/
│       ├── serie_temporal_mensual.csv    # 73 meses 2020-2026 (nacional)
│       └── serie_temporal_departamento.csv
│
├── .github/
│   └── workflows/
│       └── deploy-backend.yml    # build → Artifact Registry → Cloud Run
│
└── README.md
```

---

## Base de datos

### Tablas principales

```sql
-- Perfiles de usuario (complementa Supabase Auth)
profiles (
  id uuid PK,           -- mismo id que auth.users
  nombre text,
  email text,
  rol text,             -- 'CLI' | 'ANL' | 'ADM'
  establecimiento text,
  habilitado boolean,
  created_at timestamptz
)

-- Pacientes
pacientes (
  id serial PK,
  nombre, apellidos, dni, fecha_nac, sexo,
  -- Datos sociodemográficos
  per_etn_, estrato_, area_, cod_dpto_o, municipio_res, dpto_residencia,
  zona, establecimiento, niv_educat, menores, factores_sociales,
  -- Datos perinatales
  peso_nac, talla_nac, edad_ges, t_lechem, e_complem,
  -- Indicadores
  crec_dllo, esq_vac, carne_vac, gp_pobicbf,
  registrado_por uuid FK → profiles,
  created_at
)

-- Controles nutricionales
controles (
  id serial PK,
  paciente_id FK → pacientes,
  fecha date,
  peso_act, talla_act, per_braqui, imc, zscore_pt,
  clas_peso_pred int,   -- predicción ML 1-6
  clas_nombre text,     -- 'Desnut. severa' etc.
  prob_desnutrido float,
  -- Signos clínicos
  edema, delgadez, palidez, piel_rese, hiperpigm, cambios_cabello,
  ruta_atenc int,       -- 1=ambulatorio, 2=hospitalario
  observaciones text,
  registrado_por uuid FK → profiles,
  created_at
)

-- Alertas automáticas
alertas (
  id serial PK,
  paciente_id FK → pacientes,
  control_id FK → controles,
  tipo text,            -- 'Desnutrición severa detectada' etc.
  nivel text,           -- 'severe' | 'moderate' | 'risk'
  mensaje text,
  leida boolean DEFAULT false,
  registrado_por uuid FK → profiles,
  created_at
)

-- Modelos ML entrenados
modelos_ml (
  id serial PK,
  nombre text,
  tipo text,            -- 'rf' | 'xgb' | 'gb' | 'lr'
  descripcion text,
  version text,         -- timestamp del entrenamiento
  archivo_a text,       -- nombre del .joblib Modelo A en GCS
  archivo_b text,       -- nombre del .joblib Modelo B en GCS
  scaler_a text,
  scaler_b text,
  metricas jsonb,       -- { modelo_A: {accuracy, f1_weighted, ...}, modelo_B: {...}, n_muestras, ... }
  activo boolean,
  entrenado_por uuid FK → profiles,
  created_at
)

-- Datasets SIVIGILA
datasets_ml (
  id serial PK,
  nombre text,
  archivo_raw text,     -- nombre en GCS/local (Excel original)
  archivo_proc text,    -- nombre CSV procesado
  filas_raw int,
  filas_proc int,
  estado text,          -- 'pendiente' | 'procesando' | 'procesado' | 'error'
  mensaje_etl text,
  habilitado boolean,
  created_at
)

-- Jobs de entrenamiento (persistencia entre reinicios)
jobs_entrenamiento (
  job_id text PK,
  estado text,          -- 'running' | 'done' | 'error'
  progreso int,         -- 0-100
  log_msgs jsonb,       -- últimos 50 mensajes del log
  resultado jsonb,
  created_at, updated_at
)
```

### Bucket Supabase Storage
```
reportes/              ← informes PDF compartidos (bucket público)
```

---

## Despliegue en producción

### Prerequisitos
- Cuenta Google Cloud con proyecto creado
- Cuenta Supabase con proyecto creado
- Repositorio GitHub conectado
- Cuenta Vercel

### 1. Google Cloud (una sola vez)

```bash
export PROJECT_ID=tu-proyecto-gcp
export REGION=us-central1

# APIs necesarias
gcloud services enable run.googleapis.com artifactregistry.googleapis.com storage.googleapis.com

# Repositorio Docker
gcloud artifacts repositories create nutrivigilancia \
  --repository-format=docker --location=$REGION

# Bucket para modelos y datos
gsutil mb -l $REGION gs://$PROJECT_ID-data
gsutil cp gs://vacío/.keep gs://$PROJECT_ID-data/models/.keep
gsutil cp gs://vacío/.keep gs://$PROJECT_ID-data/uploads/.keep
gsutil cp gs://vacío/.keep gs://$PROJECT_ID-data/processed/.keep

# Service account para GitHub Actions (deploy)
gcloud iam service-accounts create github-deploy
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-deploy@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-deploy@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-deploy@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Service account para Cloud Run (accede al bucket)
gcloud iam service-accounts create cloudrun-sa
gsutil iam ch serviceAccount:cloudrun-sa@$PROJECT_ID.iam.gserviceaccount.com:roles/storage.objectAdmin \
  gs://$PROJECT_ID-data

# Clave JSON para GitHub Actions
gcloud iam service-accounts keys create gcp-key.json \
  --iam-account="github-deploy@$PROJECT_ID.iam.gserviceaccount.com"
```

### 2. Configuración post-deploy

```bash
# Mantener instancia activa (necesario para entrenamiento)
gcloud run services update nutrivigilancia-api \
  --region us-central1 --min-instances 1 --timeout 3600

# Actualizar CORS cuando cambia la URL de Vercel
gcloud run services update nutrivigilancia-api \
  --region us-central1 \
  --update-env-vars "CORS_ORIGINS=https://tu-app.vercel.app"
```

### 3. GitHub Secrets requeridos

```
GCP_PROJECT_ID          → ID del proyecto GCP
GCP_SA_KEY              → contenido completo de gcp-key.json
GCP_RUN_SA              → cloudrun-sa@PROJECT_ID.iam.gserviceaccount.com
GCP_DATA_BUCKET         → PROJECT_ID-data
CORS_ORIGINS            → https://tu-app.vercel.app
SUPABASE_URL            → URL del proyecto Supabase
SUPABASE_ANON_KEY       → clave pública anon
SUPABASE_SERVICE_KEY    → clave privada service_role
SUPABASE_JWT_SECRET     → JWT secret del dashboard Supabase
GROQ_API_KEY            → clave API de console.groq.com
GOOGLE_API_KEY          → clave API de Google AI Studio
```

### 4. Vercel

1. Conectar repositorio → Root Directory: `frontend`
2. Variable de entorno: `VITE_API_URL=https://tu-cloud-run-url.run.app`

### 5. Supabase — tabla adicional requerida

```sql
create table if not exists jobs_entrenamiento (
  job_id     text primary key,
  estado     text    not null default 'running',
  progreso   integer not null default 0,
  log_msgs   jsonb            default '[]'::jsonb,
  resultado  jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Constraint de roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_rol_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_rol_check
  CHECK (rol IN ('CLI', 'ANL', 'ADM'));
```

---

## Instalación local

```bash
# Clonar el repositorio
git clone https://github.com/ynavier/Desnutricion-PG.git
cd Desnutricion-PG/Project

# ─── Backend ───────────────────────────────────────────────────────────────
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac

pip install -r requirements.txt
cp .env.example .env           # completar con tus credenciales

uvicorn main:app --reload --port 8000
# API disponible en http://localhost:8000
# Docs en http://localhost:8000/docs

# ─── Frontend ──────────────────────────────────────────────────────────────
cd ../frontend
npm install
npm run dev
# App disponible en http://localhost:3000
# /api se redirige automáticamente a localhost:8000
```

---

## Variables de entorno

### Backend `.env`

```env
# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_JWT_SECRET=tu-jwt-secret

# IA
GROQ_API_KEY=gsk_...
GOOGLE_API_KEY=AIza...

# Rutas (relativas al directorio backend/)
MODELS_DIR=../models
DATA_UPLOADS_DIR=../data/uploads
DATA_PROC_DIR=../data/processed

# App
APP_ENV=development
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# SMTP (opcional — para envío de informes por correo)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu@gmail.com
SMTP_PASS=app-password-16-chars
SMTP_FROM=NutriVigilancia <tu@gmail.com>
```

### Frontend `.env.local` (solo en producción)

```env
VITE_API_URL=https://nutrivigilancia-api-XXX.us-central1.run.app
```

En desarrollo no se necesita — Vite usa el proxy configurado en `vite.config.js`.

---

## Estándares normativos

| Estándar | Organismo | Aplicación en el sistema |
|---|---|---|
| **Tablas de crecimiento 2006** | OMS | Z-score P/E para clasificación nutricional |
| **SAM ≥ 2%** | MSPS 2016 | Activar respuesta urgente territorial |
| **GAM ≥ 10%** | MSPS 2016 | Declarar emergencia nutricional |
| **GAM ≥ 15%** | OMS/OPS — IPC | Emergencia crítica → respuesta humanitaria |
| **SAM ≥ 5%** | OMS/OPS | Emergencia crítica SAM |
| **GAM ≥ 5% (Caribe)** | OPS | Umbral reducido por agravantes regionales |
| **Z < −1.5 poblacional** | ICBF | Intervención preventiva C&D |
| **Z < −2 poblacional** | OMS 2006 | Desnutrición moderada colectiva |
| **Z < −3 poblacional** | OMS 2006 | Desnutrición severa colectiva — AIEPI |
| **SIVIGILA Evento 113** | INS Colombia | Fuente de datos históricos (2020-2026) |
| **Protocolo AIEPI** | OPS/MSPS | Criterios referencia urgente |

---

## Licencia

Proyecto académico — Universidad Popular del Cesar · 2026  
Para uso educativo y de investigación.
