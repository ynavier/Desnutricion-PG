-- ============================================================
-- NutriVigilancia — Schema Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Tabla profiles (extiende auth.users) ─────────────────────
CREATE TABLE IF NOT EXISTS profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre          TEXT NOT NULL,
    email           TEXT NOT NULL,
    rol             TEXT NOT NULL CHECK (rol IN ('ANL', 'CLI')),
    establecimiento TEXT,
    habilitado      BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabla pacientes ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pacientes (
    id                  BIGSERIAL PRIMARY KEY,
    -- Datos personales
    nombre              TEXT NOT NULL,
    apellidos           TEXT NOT NULL,
    dni                 TEXT,
    fecha_nac           DATE NOT NULL,
    sexo                CHAR(1) NOT NULL CHECK (sexo IN ('M', 'F')),
    -- Etnia / per_etn_
    per_etn_            INTEGER,
    -- Neonatales
    peso_nac            FLOAT,
    edad_ges            FLOAT,
    t_lechem            FLOAT,
    e_complem           FLOAT,
    esq_vac             INTEGER,
    carne_vac           INTEGER,
    crec_dllo           INTEGER,
    gp_pobicbf          INTEGER DEFAULT 2,
    -- Procedencia (origen)
    cod_dpto_o          TEXT,              -- departamento de procedencia
    municipio_proc      TEXT,              -- municipio de procedencia
    -- Residencia actual
    area_               INTEGER,           -- 1=Urbana 2=Rural
    dpto_residencia     TEXT,              -- departamento de residencia
    municipio_res       TEXT,              -- municipio de residencia
    zona                TEXT,              -- legacy / zona general
    establecimiento     TEXT,
    -- Social
    estrato_            INTEGER,
    niv_educat          INTEGER,
    menores             FLOAT,
    factores_sociales   TEXT[],
    -- Meta
    registrado_por      UUID REFERENCES profiles(id),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabla controles ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS controles (
    id                  BIGSERIAL PRIMARY KEY,
    paciente_id         BIGINT NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    fecha               DATE DEFAULT CURRENT_DATE,
    -- Antropométrico
    peso_act            FLOAT NOT NULL,
    talla_act           FLOAT,
    per_braqui          FLOAT,
    imc                 FLOAT,
    -- Z-scores (calculados por el backend)
    zscore_pt           FLOAT,
    zscore_te           FLOAT,
    -- Signos clínicos (1=Sí 2=No)
    edema               INTEGER DEFAULT 2,
    delgadez            INTEGER DEFAULT 2,
    palidez             INTEGER DEFAULT 2,
    piel_rese           INTEGER DEFAULT 2,
    hiperpigm           INTEGER DEFAULT 2,
    cambios_cabello     INTEGER DEFAULT 2,
    -- Estado clínico
    ruta_atenc          INTEGER,
    apetito             TEXT,
    micronutrientes     INTEGER,
    enfermedades        TEXT[] DEFAULT '{}',
    factores_sociales   TEXT[] DEFAULT '{}',
    observaciones       TEXT,
    -- Predicción ML
    clas_peso_pred      INTEGER,
    clas_nombre         TEXT,
    prob_desnutrido     FLOAT,
    modelo_usado        TEXT,
    -- Meta
    registrado_por      UUID REFERENCES profiles(id),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabla alertas ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alertas (
    id              BIGSERIAL PRIMARY KEY,
    paciente_id     BIGINT NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    control_id      BIGINT REFERENCES controles(id),
    tipo            TEXT NOT NULL,
    nivel           TEXT NOT NULL CHECK (nivel IN ('severe', 'moderate', 'mild', 'risk')),
    mensaje         TEXT,
    leida           BOOLEAN DEFAULT false,
    registrado_por  UUID REFERENCES profiles(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Índices ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_controles_paciente ON controles(paciente_id);
CREATE INDEX IF NOT EXISTS idx_alertas_paciente   ON alertas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_alertas_leida      ON alertas(leida);
CREATE INDEX IF NOT EXISTS idx_pacientes_nombre   ON pacientes(nombre);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE controles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas     ENABLE ROW LEVEL SECURITY;

-- El backend usa service key (bypasa RLS automáticamente).
-- Estas políticas aplican solo a accesos directos desde el cliente.

CREATE POLICY "Solo el propio usuario ve su perfil"
    ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Backend puede leer todos los perfiles"
    ON profiles FOR ALL USING (true);

-- ── Trigger: crear perfil automático al registrar usuario ─────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO profiles (id, nombre, email, rol)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'rol', 'CLI')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
