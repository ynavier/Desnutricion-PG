# Descripción Técnica del Aplicativo — NutriVigilancia

## 1. Visión general

NutriVigilancia es una plataforma web de vigilancia epidemiológica nutricional para menores de 5 años en Colombia. Fue diseñada como sistema multicapa que integra registro clínico, predicción mediante aprendizaje automático, análisis epidemiológico con inteligencia artificial y un asistente clínico de voz. El sistema cubre el ciclo completo: desde la captura del dato clínico en campo hasta la generación de alertas tempranas, reportes institucionales y proyecciones temporales.

---

## 2. Arquitectura general

El aplicativo sigue una arquitectura cliente-servidor desacoplada de tres capas:

| Capa | Tecnología | Despliegue |
|------|-----------|------------|
| Frontend (SPA) | React 18 + Vite + Tailwind CSS | Vercel |
| Backend (API REST) | FastAPI — Python 3.11 | Google Cloud Run (Docker) |
| Base de datos | PostgreSQL vía Supabase | Supabase Cloud |

La comunicación entre capas se realiza mediante HTTP/REST con autenticación JWT. El backend expone 13 grupos de endpoints; el frontend consume la API a través de un cliente Axios centralizado que gestiona automáticamente el token Bearer y el cierre de sesión ante respuestas 401.

---

## 3. Cómo se construyó el backend

El backend fue desarrollado con **FastAPI**, un framework asíncrono de Python elegido por su alto rendimiento, generación automática de documentación OpenAPI y validación declarativa de datos mediante **Pydantic**.

### Estructura interna

El código está organizado en módulos con responsabilidades bien delimitadas:

- **`app/config.py`**: centraliza todas las variables de entorno usando `BaseSettings` de Pydantic. Gestiona credenciales de Supabase, claves de APIs externas (Google Gemini, Groq), configuración SMTP y rutas de archivos.
- **`app/database.py`**: inicializa dos clientes Supabase: uno con clave de servicio para operaciones del servidor y uno con clave anónima para flujos de autenticación delegada.
- **`app/auth/`**: implementa el flujo de autenticación delegando la verificación de credenciales a Supabase Auth. Las dependencias `require_adm`, `require_anl` y `require_cli` protegen los endpoints según el rol del usuario.
- **`app/routers/`**: cada archivo agrupa los endpoints de un dominio funcional (pacientes, controles, alertas, reportes, etc.). Los routers se montan en `main.py` durante el lifespan de la aplicación, momento en que también se cargan los modelos de ML en memoria para evitar latencia en cada predicción.
- **`app/schemas/`**: define los contratos de entrada y salida de la API. `PacienteCreate` valida 25 campos (datos personales, neonatales, residencia y factores sociales). `ControlCreate` captura medidas antropométricas y signos clínicos; `PrediccionOut` devuelve la clasificación en seis estados nutricionales.
- **`app/services/`**: contiene la lógica de negocio compleja, separada de los routers para mantenibilidad.

### Proceso ETL (ingesta de datos históricos)

El servicio `etl.py` procesa archivos Excel del sistema SIVIGILA (Evento 113 — Desnutrición Aguda). Lee cada archivo con pandas, valida columnas requeridas, limpia valores nulos, imputa campos faltantes con mediana o moda según el tipo de variable, calcula la edad en meses a partir de fecha de nacimiento y fecha de notificación, y exporta el resultado a CSV procesado. Este pipeline puede operar tanto sobre archivos en disco como sobre registros almacenados en la base de datos.

### Motor de predicción ML

El módulo `app/ml/` implementa el núcleo predictivo:

1. **`loader.py`** carga al inicio del servidor los modelos entrenados en formato `joblib`. El sistema mantiene dos variantes: el **Modelo A** (25 características, incluye IMC) para establecimientos con equipamiento completo, y el **Modelo B** (24 características, sin IMC) para entornos rurales o con datos incompletos.
2. **`predictor.py`** realiza el preprocesamiento en tiempo real: codifica el departamento con `LabelEncoder`, imputa campos ausentes, aplica `RobustScaler` sobre variables numéricas y ejecuta la predicción. La salida es un vector de probabilidades para seis clases: desnutrición severa, moderada, normal bajo, normal, sobrepeso y obesidad.
3. **`who_tables.py`** calcula puntajes Z de peso para la edad según las tablas de referencia de la OMS 2006, y clasifica el perímetro braquial (MUAC) según los umbrales de la OPS.

### Entrenamiento supervisado

El servicio `entrenamiento.py` gestiona los jobs de reentrenamiento de modelos. Soporta cuatro algoritmos: **Random Forest**, **Gradient Boosting por histogramas (equivalente a XGBoost)**, **Gradient Boosting clásico** y **Regresión Logística**. Aplica **SMOTE** para corregir el desbalance de clases (los casos de desnutrición severa son minoritarios en el dataset), y evalúa mediante **validación cruzada estratificada de 5 pliegues**. Los modelos resultantes se serializan con `joblib` y sus métricas (accuracy, F1, recall por clase) se registran en la tabla `modelos_ml` de Supabase.

### Integración con IA generativa

El sistema conecta con dos proveedores de LLMs:

- **Google Gemini** (vía `google-genai`): genera recomendaciones clínicas personalizadas por paciente en función del estado nutricional, edad, antecedentes y factores sociales. También analiza reportes epidemiológicos y produce resúmenes en lenguaje natural. Los resultados se cachean en memoria durante 24 horas para reducir latencia y costo. Cuando la API no está disponible, el sistema retorna respuestas estáticas predefinidas según el nivel de severidad.
- **Groq** (Llama 3.3 70B): responde consultas del asistente clínico (NIVI) y genera análisis de estadísticas epidemiológicas para el panel analítico. La transcripción de voz del asistente usa el modelo **Whisper** de Groq.

### Proyecciones temporales

El router `/proyecciones` ajusta modelos **SARIMA** sobre la serie temporal mensual de casos de desnutrición procesada durante el ETL. Genera proyecciones hasta diciembre de 2027, tanto a nivel nacional como por departamento, permitiendo anticipar tendencias y planificar intervenciones.

---

## 4. Cómo se construyó el frontend

El frontend es una **Single Page Application (SPA)** construida con **React 18** y empaquetada con **Vite** para tiempos de compilación rápidos.

### Organización por roles

`App.jsx` define el árbol de rutas mediante **React Router v6**. Cada ruta sensible está envuelta en `ProtectedRoute`, un componente que verifica la existencia de sesión y el rol del usuario antes de renderizar. Si el usuario no está autenticado o no tiene el rol correcto, es redirigido al login.

El sistema define tres paneles:

- **Panel Clínico (CLI)**: permite registrar pacientes, ingresar controles antropométricos, consultar el historial por paciente, y visualizar alertas activas. Incluye el asistente NIVI como componente flotante, que acepta entrada por voz, transcribe con Whisper vía backend, y responde en lenguaje natural con información del paciente buscado.
- **Panel Analítico (ANL)**: ofrece un dashboard epidemiológico con gráficos de distribución, tendencias temporales y comparativas departamentales. Permite cargar nuevos archivos SIVIGILA, administrar datasets habilitados para entrenamiento, configurar y lanzar jobs de entrenamiento, gestionar modelos activos, generar reportes exportables a Excel y visualizar análisis con IA.
- **Panel Administrador (ADM)**: gestión de usuarios y configuración del sistema.

### Estado global y comunicación

El contexto `AuthContext.jsx` mantiene el estado de sesión (usuario, token, rol) en memoria y en `localStorage` para persistencia entre recargas. El servicio `api.js` encapsula todas las llamadas HTTP: adjunta automáticamente el token en el encabezado `Authorization: Bearer`, y ante un error 401 cierra la sesión y redirige al login.

### Visualización y UX

- **Recharts** renderiza los gráficos del dashboard (barras, líneas, pastel).
- **Tailwind CSS** maneja el diseño responsivo con clases utilitarias.
- **Framer Motion** anima las transiciones de página y los elementos de la landing.
- **AnimatedCounter** aplica interpolación numérica a los indicadores KPI para una presentación dinámica de datos.
- **Spline** integra un modelo 3D interactivo como avatar del asistente NIVI.

---

## 5. Pipeline de datos y modelos ML (proceso offline)

Antes del despliegue, se ejecutó un pipeline analítico documentado en siete notebooks de Jupyter:

1. **Exploración de estructura**: identificación de variables, tipos de datos y fuentes.
2. **Calidad de datos**: detección de nulos, outliers, duplicados y consistencia temporal.
3. **ETL y limpieza**: unificación de los archivos SIVIGILA 2020–2025 en un único CSV limpio de 113 columnas.
4. **Análisis exploratorio**: distribuciones por departamento, edad, sexo, estado nutricional y factores asociados.
5. **Entrenamiento de modelos**: selección de características, balanceo con SMOTE, entrenamiento con cuatro algoritmos y validación cruzada. El modelo seleccionado fue **Random Forest** con accuracy del 83,1% y F1 de 0,82 en el conjunto de prueba.
6. **Validación de predicciones**: revisión de casos límite y casos extremos.
7. **Proyecciones SARIMA**: ajuste del modelo de serie temporal para predicciones hasta 2027.

Los artefactos generados (archivos `.joblib` y `.csv`) se incorporaron al repositorio y son cargados por el backend al iniciarse.

---

## 6. Base de datos

La base de datos en **Supabase (PostgreSQL)** contiene seis tablas principales:

| Tabla | Propósito |
|-------|-----------|
| `profiles` | Usuarios del sistema con rol asignado |
| `pacientes` | Ficha completa del menor (datos personales, neonatales, sociales) |
| `controles` | Registro de cada visita clínica con medidas y predicción ML |
| `alertas` | Notificaciones generadas automáticamente por el motor de predicción |
| `modelos_ml` | Registro de modelos entrenados, métricas y estado de activación |
| `datasets_ml` | Archivos SIVIGILA cargados, estado de procesamiento y habilitación |

El esquema fue versionado mediante migraciones SQL almacenadas en `supabase/migrations/`.

---

## 7. Despliegue

| Componente | Plataforma | Mecanismo |
|-----------|-----------|-----------|
| Frontend | Vercel | Build automático desde rama principal (Vite → `dist/`) |
| Backend | Google Cloud Run | Imagen Docker con Python 3.11; escala a cero cuando sin tráfico |
| Base de datos | Supabase | Servicio administrado PostgreSQL; acceso vía SDK oficial |

Las variables de entorno sensibles (claves API, credenciales de base de datos) se gestionan mediante los sistemas de secretos de cada plataforma (Vercel Environment Variables y Cloud Run Secret Manager), sin exponerlas en el repositorio.
