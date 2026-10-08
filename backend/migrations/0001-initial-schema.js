/** Esquema inicial de Fitness by Evidence. */

export async function up({ context: sequelize }) {
  await sequelize.query(`
    CREATE TYPE client_status AS ENUM ('active', 'paused', 'archived');
    CREATE TYPE client_sex    AS ENUM ('male', 'female');

    CREATE TABLE admins (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email         VARCHAR(160) NOT NULL UNIQUE,
      password_hash VARCHAR(100) NOT NULL,
      name          VARCHAR(120) NOT NULL,
      last_login_at TIMESTAMPTZ,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE site_settings (
      key        VARCHAR(40) PRIMARY KEY,
      value      JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- ---------------------------------------------------------------- Catálogos
    CREATE TABLE muscles (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(80) NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE exercises (
      id         SERIAL PRIMARY KEY,
      muscle_id  INTEGER NOT NULL REFERENCES muscles(id) ON DELETE CASCADE,
      name       VARCHAR(160) NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (muscle_id, name)
    );

    CREATE TABLE cardio_protocols (
      id           SERIAL PRIMARY KEY,
      name         VARCHAR(120) NOT NULL UNIQUE,
      type         VARCHAR(20),
      duration_min INTEGER,
      intervals    VARCHAR(120),
      rpe          VARCHAR(40),
      hr_zone      VARCHAR(60),
      notes        TEXT,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE warmup_protocols (
      id           SERIAL PRIMARY KEY,
      name         VARCHAR(120) NOT NULL UNIQUE,
      general      TEXT,
      mobility     TEXT,
      activation   TEXT,
      ramp_up_sets TEXT,
      duration     VARCHAR(40),
      rationale    TEXT,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Valores por porción; los gramos del plan son peso neto.
    CREATE TABLE foods (
      id             SERIAL PRIMARY KEY,
      name           VARCHAR(160) NOT NULL UNIQUE,
      food_group     VARCHAR(80),
      portion_qty    NUMERIC(8,3) NOT NULL DEFAULT 1,
      portion_unit   VARCHAR(40)  NOT NULL DEFAULT 'g',
      gross_weight_g NUMERIC(8,2),
      net_weight_g   NUMERIC(8,2) NOT NULL CHECK (net_weight_g > 0),
      kcal           NUMERIC(8,2) NOT NULL DEFAULT 0,
      protein_g      NUMERIC(8,2) NOT NULL DEFAULT 0,
      fat_g          NUMERIC(8,2) NOT NULL DEFAULT 0,
      carbs_g        NUMERIC(8,2) NOT NULL DEFAULT 0,
      fiber_g        NUMERIC(8,2) NOT NULL DEFAULT 0,
      food_type      VARCHAR(30)  NOT NULL DEFAULT 'Vegetal',
      style          VARCHAR(10)  NOT NULL DEFAULT 'Ambos',
      as_protein     BOOLEAN NOT NULL DEFAULT false,
      as_carb        BOOLEAN NOT NULL DEFAULT false,
      as_fat         BOOLEAN NOT NULL DEFAULT false,
      as_vegetable   BOOLEAN NOT NULL DEFAULT false,
      as_fruit       BOOLEAN NOT NULL DEFAULT false,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE supplements (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(120) NOT NULL UNIQUE,
      ais_group   VARCHAR(4),
      purpose     TEXT,
      dose_text   VARCHAR(200),
      dose_min    NUMERIC(8,3),
      dose_max    NUMERIC(8,3),
      dose_unit   VARCHAR(20),
      timing      TEXT,
      precautions TEXT,
      reference   TEXT,
      brand       VARCHAR(120),
      link        TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- ---------------------------------------------------------------- Clientes
    CREATE TABLE clients (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      access_code       VARCHAR(32) NOT NULL UNIQUE,
      portal_enabled    BOOLEAN NOT NULL DEFAULT true,
      status            client_status NOT NULL DEFAULT 'active',
      full_name         VARCHAR(160) NOT NULL,
      birth_date        DATE,
      sex               client_sex,
      height_cm         NUMERIC(5,1),
      initial_weight_kg NUMERIC(5,1),
      city              VARCHAR(120),
      occupation        VARCHAR(120),
      phone             VARCHAR(30),
      email             VARCHAR(160),
      -- Historia clínica: salud, logística, estilo de vida, experiencia y nutrición.
      profile           JSONB NOT NULL DEFAULT '{}'::jsonb,
      coach_notes       TEXT,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX clients_status_idx ON clients (status, full_name);

    -- ---------------------------------------------------------------- Entrenamiento
    CREATE TABLE training_plans (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      is_active    BOOLEAN NOT NULL DEFAULT true,
      name         VARCHAR(120) NOT NULL DEFAULT 'Programa de hipertrofia',
      objective    JSONB NOT NULL DEFAULT '{}'::jsonb,
      block_phase  VARCHAR(30),
      block_start  DATE,
      block_weeks  INTEGER,
      split        JSONB NOT NULL DEFAULT '[]'::jsonb,
      priorities   JSONB NOT NULL DEFAULT '{}'::jsonb,
      macro_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
      steps        JSONB NOT NULL DEFAULT '{}'::jsonb,
      cardio       JSONB NOT NULL DEFAULT '[]'::jsonb,
      warmup       JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX training_plans_one_active_idx ON training_plans (client_id) WHERE is_active;

    CREATE TABLE training_weeks (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plan_id    UUID NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
      number     INTEGER NOT NULL CHECK (number > 0),
      -- Fecha en que el cliente hizo cada día: { "1": "2026-10-05", ... }
      day_dates  JSONB NOT NULL DEFAULT '{}'::jsonb,
      -- Minutos de cardio realizados por día: { "3": 45, ... }
      cardio_log JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (plan_id, number)
    );

    CREATE TABLE week_exercises (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      week_id      UUID NOT NULL REFERENCES training_weeks(id) ON DELETE CASCADE,
      day          SMALLINT NOT NULL CHECK (day BETWEEN 1 AND 7),
      position     INTEGER NOT NULL DEFAULT 0,
      muscle       VARCHAR(80)  NOT NULL,
      exercise     VARCHAR(160) NOT NULL,
      sets         SMALLINT NOT NULL DEFAULT 3 CHECK (sets BETWEEN 1 AND 10),
      reps         VARCHAR(30),
      rir          SMALLINT CHECK (rir BETWEEN 0 AND 5),
      coach_notes  TEXT,
      symbol       VARCHAR(12),
      -- Registro del cliente por serie: [{ "load": 60, "reps": 10 }, ...]
      logged       JSONB NOT NULL DEFAULT '[]'::jsonb,
      client_notes TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX week_exercises_week_idx ON week_exercises (week_id, day, position);

    -- ---------------------------------------------------------------- Seguimiento
    CREATE TABLE checkins (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL CHECK (week_number > 0),
      date        DATE,
      -- [{ "day": 1, "rpe": 8, "durationMin": 75, "enjoyment": 4 }]
      sessions    JSONB NOT NULL DEFAULT '[]'::jsonb,
      -- { "energy": 4, "sleep": 3, ... } del 1 al 5
      ratings     JSONB NOT NULL DEFAULT '{}'::jsonb,
      answers     JSONB NOT NULL DEFAULT '{}'::jsonb,
      avg_steps   INTEGER,
      avg_weight_kg NUMERIC(5,2),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (client_id, week_number)
    );

    CREATE TABLE measurements (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      date        DATE NOT NULL,
      -- { "weight": 82, "waist": 86, ... }
      "values"    JSONB NOT NULL DEFAULT '{}'::jsonb,
      photos_link TEXT,
      notes       TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (client_id, date)
    );

    CREATE TABLE weight_logs (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      date       DATE NOT NULL,
      weight_kg  NUMERIC(5,2),
      waist_cm   NUMERIC(5,1),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (client_id, date)
    );

    -- ---------------------------------------------------------------- Nutrición
    CREATE TABLE nutrition_plans (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id          UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      is_active          BOOLEAN NOT NULL DEFAULT true,
      start_date         DATE,
      -- Datos, objetivo, macros, días de entreno y reparto de comidas.
      inputs             JSONB NOT NULL DEFAULT '{}'::jsonb,
      -- Alimentos elegidos por comida, intra-entreno y cambios permitidos.
      meals              JSONB NOT NULL DEFAULT '[]'::jsonb,
      intra              JSONB NOT NULL DEFAULT '{}'::jsonb,
      hydration          JSONB NOT NULL DEFAULT '{}'::jsonb,
      supplements        JSONB NOT NULL DEFAULT '[]'::jsonb,
      allow_client_swaps BOOLEAN NOT NULL DEFAULT true,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX nutrition_plans_one_active_idx ON nutrition_plans (client_id) WHERE is_active;
  `);
}

export async function down({ context: sequelize }) {
  await sequelize.query(`
    DROP TABLE IF EXISTS nutrition_plans, weight_logs, measurements, checkins, week_exercises, training_weeks,
      training_plans, clients, supplements, foods, warmup_protocols, cardio_protocols, exercises, muscles,
      site_settings, admins CASCADE;
    DROP TYPE IF EXISTS client_status, client_sex;
  `);
}
