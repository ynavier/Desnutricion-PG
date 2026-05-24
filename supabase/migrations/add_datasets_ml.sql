CREATE TABLE IF NOT EXISTS datasets_ml (
  id           SERIAL PRIMARY KEY,
  nombre       TEXT NOT NULL,
  anio         INT,
  archivo_raw  TEXT NOT NULL,
  archivo_proc TEXT,
  filas_raw    INT DEFAULT 0,
  filas_proc   INT DEFAULT 0,
  estado       TEXT DEFAULT 'pendiente',
  habilitado   BOOLEAN DEFAULT FALSE,
  mensaje_etl  TEXT,
  subido_por   TEXT,
  created_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

NOTIFY pgrst, 'reload schema';
