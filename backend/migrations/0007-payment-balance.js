/**
 * Tarifa acordada y pagos parciales: cada pago guarda cuánto se debía antes y cuánto quedó después,
 * para mostrar el saldo en el historial y poder deshacer un pago capturado por error.
 * La tarifa y el saldo pendiente viven en la historia clínica (profile.logistics.fee / pendingAmount).
 */
export async function up({ context: sequelize }) {
  await sequelize.query(`
    ALTER TABLE payments ADD COLUMN pending_before NUMERIC(10,2);
    ALTER TABLE payments ADD COLUMN pending_after  NUMERIC(10,2);
  `);
}

export async function down({ context: sequelize }) {
  await sequelize.query(`
    ALTER TABLE payments DROP COLUMN pending_before;
    ALTER TABLE payments DROP COLUMN pending_after;
  `);
}
