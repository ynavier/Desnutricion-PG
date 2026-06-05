# Textos para el documento — Diagramas de Componentes y Despliegue

---

## UBICACIÓN EN EL DOCUMENTO

Ambos diagramas van en la **Sección III → Fase I**, justo después del párrafo que dice *"Desde la perspectiva tecnológica, el sistema fue desarrollado mediante una arquitectura web basada en tecnologías como React, FastAPI, PostgreSQL..."*, antes de "Definición del Alcance".

---

## TEXTO 1: DIAGRAMA DE COMPONENTES

**Título** (estilo Ttulo3):
Arquitectura de Componentes del Sistema NIVI

**Párrafo** (estilo Normal):
El sistema NIVI se estructura en tres capas desacopladas comunicadas mediante una API REST con autenticación JWT. La capa de presentación, desarrollada con React 18 y desplegada en Vercel, organiza la interfaz en tres paneles según el rol del usuario: el panel clínico (CLI) para el registro de pacientes, controles y alertas; el panel analítico (ANL) para visualización epidemiológica y generación de reportes; y el panel administrador (ADM) para la gestión de usuarios, datasets, modelos de Machine Learning e infraestructura del sistema. La capa de negocio es una API REST implementada con FastAPI sobre Python 3.11, desplegada en Google Cloud Run, que integra un motor de predicción basado en modelos Random Forest con tablas de referencia de la OMS, y servicios de inteligencia artificial generativa mediante Google Gemini y Groq Llama 3.3. La capa de datos reside en Supabase (PostgreSQL), con seis tablas que almacenan los registros clínicos, epidemiológicos y los artefactos del sistema predictivo.

**[INSERTAR IMAGEN: Ilustración X. Diagrama de Componentes del Sistema NIVI]**
*(pie de figura centrado, cursiva)*

---

## TEXTO 2: DIAGRAMA DE DESPLIEGUE

**Título** (estilo Ttulo3):
Arquitectura de Despliegue del Sistema NIVI

**Párrafo** (estilo Normal):
El sistema NIVI fue desplegado sobre una arquitectura distribuida en la nube basada en servicios administrados de terceros, eliminando la necesidad de gestionar infraestructura propia. La capa de presentación es servida desde Vercel mediante CDN global, con despliegue automatizado ante cada confirmación en el repositorio GitHub. La capa de negocio se ejecuta en Google Cloud Run como un contenedor Docker que escala automáticamente según la demanda y reduce costos al escalar a cero en periodos sin tráfico; las credenciales de acceso a servicios externos se gestionan de forma segura mediante Google Cloud Secret Manager. La capa de datos opera sobre Supabase, que provee una instancia PostgreSQL administrada con autenticación JWT, almacenamiento de archivos y alta disponibilidad. Adicionalmente, el sistema consume dos servicios externos de inteligencia artificial: Google Gemini para recomendaciones clínicas y análisis de reportes, y Groq para el modelo conversacional Llama 3.3 y la transcripción de voz Whisper del asistente NIVI.

**[INSERTAR IMAGEN: Ilustración X. Diagrama de Despliegue del Sistema NIVI]**
*(pie de figura centrado, cursiva)*
