-- Migración: tabla de registro de modelos ML
-- Ejecutar en: Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS modelos_ml (
  id           SERIAL PRIMARY KEY,
  nombre       TEXT NOT NULL,
  tipo         TEXT NOT NULL DEFAULT 'rf',
  descripcion  TEXT,
  version      TEXT NOT NULL DEFAULT '1.0',
  archivo_A    TEXT NOT NULL DEFAULT 'modelo_A_rf.joblib',
  archivo_B    TEXT NOT NULL DEFAULT 'modelo_B_rf.joblib',
  scaler_A     TEXT NOT NULL DEFAULT 'scaler_A.joblib',
  scaler_B     TEXT NOT NULL DEFAULT 'scaler_B.joblib',
  metricas     JSONB,
  activo       BOOLEAN NOT NULL DEFAULT FALSE,
  entrenado_por TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE modelos_ml IS 'Registro de modelos ML entrenados. El activo = TRUE es el que usa el panel CLI.';
