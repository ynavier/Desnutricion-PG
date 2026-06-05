# Texto para insertar en el documento — Diagrama de Despliegue

> Instrucciones de inserción:
> - Título con estilo **Ttulo3** (Heading 3)
> - Párrafos con estilo **Normal**
> - Insertar el diagrama como imagen exportada desde draw.io (PNG o SVG) entre el primer y segundo párrafo

---

## Título (estilo Ttulo3):
Arquitectura de Despliegue del Sistema NIVI

## Párrafos (estilo Normal):

El sistema NIVI fue diseñado bajo una arquitectura de despliegue distribuida en la nube, sustentada en servicios administrados de terceros que eliminan la necesidad de gestionar infraestructura propia y permiten escalar los recursos de manera automática en función de la demanda. La elección de esta estrategia responde a los criterios de disponibilidad, costo operativo reducido y facilidad de mantenimiento que requiere una plataforma de vigilancia en salud pública orientada a entornos con recursos tecnológicos limitados.

[INSERTAR AQUÍ: Ilustración X. Diagrama de Despliegue del Sistema NIVI]

La capa de presentación es servida desde la plataforma Vercel mediante una red de distribución de contenido (CDN) de cobertura global. El proceso de despliegue es completamente automatizado: cada confirmación de cambios sobre la rama principal del repositorio en GitHub activa un pipeline de integración continua que compila el proyecto con Vite, genera la carpeta de distribución estática y publica los artefactos resultantes (HTML, JavaScript, CSS y recursos estáticos) en los servidores perimetrales de Vercel. Las variables de entorno sensibles, como la URL de la API del backend, son gestionadas mediante el sistema de variables de entorno de la plataforma, sin exponerse en el código fuente del repositorio. El usuario accede a la aplicación desde cualquier dispositivo con navegador web moderno a través del protocolo HTTPS, recibiendo los archivos de la SPA desde el nodo CDN geográficamente más próximo.

La capa de negocio se ejecuta sobre Google Cloud Run, un servicio de contenedores sin servidor (serverless) de Google Cloud Platform. El backend fue empaquetado en una imagen Docker basada en Python 3.11 que incluye todas las dependencias del framework FastAPI, el servidor ASGI Uvicorn, las bibliotecas de Machine Learning (scikit-learn, pandas, statsmodels) y los artefactos de modelos serializados en formato joblib. Cloud Run instancia contenedores bajo demanda y los escala a cero cuando no hay tráfico, lo que elimina costos de cómputo en periodos de inactividad. Durante el inicio del contenedor, el mecanismo de ciclo de vida del servidor carga los modelos predictivos en memoria para garantizar tiempos de respuesta bajos en las solicitudes de predicción. Las credenciales de acceso a servicios externos, como las claves de las APIs de Google Gemini y Groq, son gestionadas mediante el servicio de secretos de Google Cloud Secret Manager y montadas como variables de entorno en tiempo de ejecución, evitando su inclusión en la imagen del contenedor.

La capa de datos reside en Supabase, un servicio administrado que provee una instancia de PostgreSQL con alta disponibilidad, autenticación basada en tokens JWT con soporte para control de acceso a nivel de fila (Row Level Security), y almacenamiento de archivos. El backend se comunica con Supabase utilizando el SDK oficial a través de dos claves de acceso: la clave de servicio (service_role key) para operaciones administrativas del servidor, y la clave anónima (anon key) para los flujos de autenticación delegada de usuarios. Los archivos Excel del SIVIGILA cargados por el administrador y los datasets procesados en CSV son almacenados en el servicio de almacenamiento de objetos de Supabase, accesibles desde el backend durante la ejecución del pipeline ETL.

El sistema integra dos servicios externos de inteligencia artificial generativa accesibles mediante sus respectivos SDK sobre HTTPS. La API de Google Gemini es invocada por el backend para la generación de recomendaciones clínicas personalizadas por paciente y el análisis narrativo de reportes epidemiológicos, implementando un mecanismo de caché en memoria con vigencia de veinticuatro horas y respuestas de contingencia estáticas ante indisponibilidad del servicio. La plataforma Groq provee dos capacidades: el modelo de lenguaje grande Llama 3.3 70B para la respuesta conversacional del asistente NIVI y el análisis de estadísticas epidemiológicas en el panel analítico, y el modelo de transcripción de voz Whisper para la conversión del audio del usuario a texto dentro del flujo del asistente clínico. Ambos servicios son consumidos exclusivamente desde la capa de negocio, de manera que las claves de acceso nunca son expuestas al cliente.

La gestión del ciclo de vida del software es soportada por GitHub como repositorio central de código fuente. El repositorio centraliza tanto el código del frontend como el del backend, los scripts de entrenamiento de modelos y la definición de esquemas de base de datos mediante migraciones SQL versionadas. Los cambios en la rama principal desencadenan automáticamente el despliegue del frontend en Vercel, mientras que la actualización del backend requiere la construcción y publicación manual de la imagen Docker en Google Container Registry, seguida del despliegue de la nueva revisión en Cloud Run.
