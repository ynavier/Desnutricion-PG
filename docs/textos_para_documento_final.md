# Textos para el documento — Diagramas de Componentes y Despliegue

---

## UBICACIÓN EN EL DOCUMENTO

### Diagrama de Componentes → va en: **Sección III · Fase I · después del punto "Análisis de la Información del Sistema"**

En Fase I ya existe un párrafo que dice:
> *"Desde la perspectiva tecnológica, el sistema fue desarrollado mediante una arquitectura web basada en tecnologías como React, FastAPI, PostgreSQL..."*

Justo después de ese párrafo, agrega el subtítulo y el texto siguiente, luego inserta la imagen del diagrama.

---

### Diagrama de Despliegue → va en: **Sección III · Fase I · después del Diagrama de Componentes**

Ambos diagramas quedan agrupados al final del punto "Análisis de la Información del Sistema", formando un bloque de arquitectura técnica dentro de la Fase I antes de pasar a "Definición del Alcance".

---

## TEXTO 1: DIAGRAMA DE COMPONENTES

### Título (estilo Ttulo3 / Heading 3):
Arquitectura de Componentes del Sistema NIVI

### Párrafo 1 (estilo Normal):
El sistema NIVI se estructura en tres capas desacopladas que se comunican mediante una API REST con autenticación basada en tokens JWT. Esta organización permite que cada capa evolucione de forma independiente y facilita la escalabilidad de la plataforma.

### [INSERTAR IMAGEN: Ilustración X. Diagrama de Componentes del Sistema NIVI]
*(pie de figura con estilo Normal, centrado, cursiva)*

### Párrafo 2 (estilo Normal):
La capa de presentación es una aplicación web de página única desarrollada con React 18 y Vite, desplegada en Vercel, que organiza la interfaz en tres paneles según el rol del usuario. El panel clínico (CLI) concentra el registro de pacientes, la captura de controles antropométricos, la gestión de alertas y el asistente de voz NIVI. El panel analítico (ANL) está destinado exclusivamente a la visualización epidemiológica y la generación de reportes nutricionales, epidemiológicos y de seguimiento de pacientes con exportación en Excel. El panel administrador (ADM) gestiona las cuentas de usuario, la carga de archivos SIVIGILA, el entrenamiento y activación de modelos de Machine Learning, y la generación del reporte de métricas de modelos.

### Párrafo 3 (estilo Normal):
La capa de negocio es una API REST implementada con FastAPI sobre Python 3.11, contenedorizada en Docker y desplegada en Google Cloud Run. Expone trece grupos de endpoints y, al iniciarse, carga en memoria los modelos serializados para garantizar baja latencia en cada predicción. El módulo de predicción aplica las tablas de referencia de la OMS, codificación de variables, imputación y escalado robusto antes de clasificar el estado nutricional en seis categorías clínicas. Para las funciones de inteligencia artificial generativa, el sistema se conecta con Google Gemini para recomendaciones clínicas personalizadas y análisis de reportes, y con Groq Llama 3.3 para el asistente conversacional NIVI y el análisis epidemiológico del panel analítico.

### Párrafo 4 (estilo Normal):
La capa de datos reside en Supabase, un servicio administrado de PostgreSQL estructurado en seis tablas: perfiles de usuario, pacientes, controles clínicos, alertas, modelos de Machine Learning y datasets de entrenamiento. Los registros históricos provienen de archivos Excel del Evento 113 del SIVIGILA, procesados mediante un pipeline ETL que unifica y limpia los datos del periodo 2020–2025. Los modelos predictivos fueron desarrollados en siete notebooks de Jupyter y exportados como artefactos joblib consumidos por el backend en producción.

---

## TEXTO 2: DIAGRAMA DE DESPLIEGUE

### Título (estilo Ttulo3 / Heading 3):
Arquitectura de Despliegue del Sistema NIVI

### Párrafo 1 (estilo Normal):
El sistema NIVI fue desplegado sobre una arquitectura distribuida en la nube sustentada en servicios administrados de terceros, eliminando la necesidad de gestionar infraestructura propia y permitiendo escalar los recursos de forma automática según la demanda.

### [INSERTAR IMAGEN: Ilustración X. Diagrama de Despliegue del Sistema NIVI]
*(pie de figura con estilo Normal, centrado, cursiva)*

### Párrafo 2 (estilo Normal):
La capa de presentación es servida desde Vercel mediante una red de distribución de contenido (CDN) de cobertura global. Cada confirmación de cambios en la rama principal del repositorio GitHub activa automáticamente un pipeline que compila el proyecto con Vite y publica los artefactos estáticos resultantes. Las variables de entorno sensibles son gestionadas por la plataforma sin exponerse en el código fuente.

### Párrafo 3 (estilo Normal):
La capa de negocio se ejecuta en Google Cloud Run como un contenedor Docker basado en Python 3.11 que incluye el framework FastAPI, el servidor ASGI Uvicorn y los modelos serializados en formato joblib. Cloud Run instancia contenedores bajo demanda y los escala a cero en ausencia de tráfico, lo que elimina costos de cómputo en periodos de inactividad. Las credenciales de acceso a servicios externos son gestionadas mediante Google Cloud Secret Manager y montadas como variables de entorno en tiempo de ejecución.

### Párrafo 4 (estilo Normal):
La capa de datos reside en Supabase, que provee una instancia PostgreSQL con alta disponibilidad, autenticación JWT con control de acceso a nivel de fila (Row Level Security) y almacenamiento de archivos para los Excel del SIVIGILA y los datasets procesados. El sistema integra adicionalmente dos servicios externos de inteligencia artificial generativa: la API de Google Gemini para recomendaciones clínicas y análisis de reportes, y la plataforma Groq para el modelo de lenguaje Llama 3.3 y el modelo de transcripción de voz Whisper, ambos invocados exclusivamente desde el backend para proteger las claves de acceso.
