/**
 * Agenda del coach: sesiones (videollamadas) acordadas con un cliente.
 * `starts_at` guarda el instante exacto; la duración va en minutos.
 */
export async function up({ context: sequelize }) {
  await sequelize.query(`
    CREATE TABLE appointments (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      starts_at        TIMESTAMPTZ NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 30,
      topic            VARCHAR(60),
      meeting_url      VARCHAR(500),
      notes            TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX appointments_starts_idx ON appointments (starts_at);
    CREATE INDEX appointments_client_idx ON appointments (client_id, starts_at DESC);
  `);
}

export async function down({ context: sequelize }) {
  await sequelize.query('DROP TABLE appointments;');
}
