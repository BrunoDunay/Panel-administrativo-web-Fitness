/**
 * Acceso con pago vencido: cuando el pago de un cliente vence, su enlace deja de mostrar el plan.
 * El coach puede permitir el acceso de todos modos (por un acuerdo); se apaga solo al registrar un pago.
 */
export async function up({ context: sequelize }) {
  await sequelize.query(`ALTER TABLE clients ADD COLUMN overdue_access BOOLEAN NOT NULL DEFAULT false;`);
}

export async function down({ context: sequelize }) {
  await sequelize.query(`ALTER TABLE clients DROP COLUMN overdue_access;`);
}
