-- Migración: agregar columnas faltantes a modelos_ml
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- (usa IF NOT EXISTS para ser idempotente)

ALTER TABLE modelos_ml
  ADD COLUMN IF NOT EXISTS tipo          TEXT NOT NULL DEFAULT 'rf',
  ADD COLUMN IF NOT EXISTS archivo_A     TEXT NOT NULL DEFAULT 'modelo_A_rf.joblib',
  ADD COLUMN IF NOT EXISTS archivo_B     TEXT NOT NULL DEFAULT 'modelo_B_rf.joblib',
  ADD COLUMN IF NOT EXISTS scaler_A      TEXT NOT NULL DEFAULT 'scaler_A.joblib',
  ADD COLUMN IF NOT EXISTS scaler_B      TEXT NOT NULL DEFAULT 'scaler_B.joblib',
  ADD COLUMN IF NOT EXISTS entrenado_por TEXT;
