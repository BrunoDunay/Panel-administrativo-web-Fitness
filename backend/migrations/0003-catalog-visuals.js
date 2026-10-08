/**
 * Apoyo visual elegible en los catálogos:
 * - alimentos, suplementos y protocolos: ícono elegido por el coach (vacío = automático);
 * - músculos: zona del cuerpo (define su color);
 * - ejercicios: tipo de movimiento (define su dibujo) y descripción de la técnica.
 */
export async function up({ context: sequelize }) {
  await sequelize.query(`
    ALTER TABLE foods            ADD COLUMN icon VARCHAR(16);
    ALTER TABLE supplements      ADD COLUMN icon VARCHAR(16);
    ALTER TABLE cardio_protocols ADD COLUMN icon VARCHAR(30);
    ALTER TABLE warmup_protocols ADD COLUMN icon VARCHAR(30);
    ALTER TABLE muscles          ADD COLUMN region VARCHAR(20);
    ALTER TABLE exercises        ADD COLUMN movement VARCHAR(20);
    ALTER TABLE exercises        ADD COLUMN description TEXT;
  `);
}

export async function down({ context: sequelize }) {
  await sequelize.query(`
    ALTER TABLE foods            DROP COLUMN icon;
    ALTER TABLE supplements      DROP COLUMN icon;
    ALTER TABLE cardio_protocols DROP COLUMN icon;
    ALTER TABLE warmup_protocols DROP COLUMN icon;
    ALTER TABLE muscles          DROP COLUMN region;
    ALTER TABLE exercises        DROP COLUMN movement;
    ALTER TABLE exercises        DROP COLUMN description;
  `);
}
