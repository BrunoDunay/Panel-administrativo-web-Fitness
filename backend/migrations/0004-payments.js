/**
 * Pagos: cada pago que el coach registra queda en el historial del cliente.
 * La fecha del próximo pago sigue en la historia clínica (profile.logistics.paymentDate)
 * y avanza sola al registrar un pago. `due_date` guarda el vencimiento que ese pago cubrió,
 * para saber si se pagó antes o después de lo acordado.
 */
export async function up({ context: sequelize }) {
  await sequelize.query(`
    CREATE TABLE payments (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      paid_on       DATE NOT NULL,
      amount        NUMERIC(10,2),
      method        VARCHAR(40),
      due_date      DATE,
      next_due_date DATE,
      notes         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX payments_client_idx ON payments (client_id, paid_on DESC);

    -- El dibujo de un ejercicio ahora puede ser uno propio (clave más larga que el tipo de movimiento).
    ALTER TABLE exercises ALTER COLUMN movement TYPE VARCHAR(60);
  `);
}

export async function down({ context: sequelize }) {
  await sequelize.query(`
    DROP TABLE payments;
    UPDATE exercises SET movement = NULL WHERE length(movement) > 20;
    ALTER TABLE exercises ALTER COLUMN movement TYPE VARCHAR(20);
  `);
}
