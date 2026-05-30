FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8080
ENV APP_ENV=production
ENV MODELS_DIR=/app/persistent/models
ENV DATA_UPLOADS_DIR=/app/persistent/uploads
ENV DATA_PROC_DIR=/app/persistent/processed

EXPOSE 8080

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1"]
