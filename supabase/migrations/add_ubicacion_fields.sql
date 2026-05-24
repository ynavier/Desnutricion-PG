-- Migración: agregar campos de procedencia y residencia
-- Ejecutar en: Supabase Dashboard → SQL Editor

ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS municipio_proc  TEXT,
  ADD COLUMN IF NOT EXISTS dpto_residencia TEXT,
  ADD COLUMN IF NOT EXISTS municipio_res   TEXT;

-- Nota: los campos existentes cod_dpto_o, zona y area_ se mantienen.
-- cod_dpto_o  → departamento de procedencia (ya existía, renombrado conceptualmente)
-- municipio_proc → municipio de procedencia (NUEVO)
-- dpto_residencia → departamento de residencia (NUEVO)
-- municipio_res → municipio de residencia (NUEVO)
-- area_ → área de residencia 1=Urbana 2=Rural (ya existía)
