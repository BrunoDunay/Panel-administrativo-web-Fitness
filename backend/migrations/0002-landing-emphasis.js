/**
 * Los textos de la landing ahora admiten **negritas**. Actualiza el contenido inicial con las
 * palabras clave resaltadas, pero solo en las secciones que siguen provisionales: lo que el
 * coach ya editó desde el panel no se toca.
 */
import { settings } from '../seeders/initial-content.js';

const SECTIONS = ['hero', 'services', 'method', 'about'];

export async function up({ context: sequelize }) {
  for (const key of SECTIONS) {
    await sequelize.query(`UPDATE site_settings SET value = :value::jsonb, updated_at = now() WHERE key = :key AND value->>'isProvisional' = 'true'`, {
      replacements: { key, value: JSON.stringify(settings[key]) },
    });
  }
}

export async function down() {
  // Sin vuelta atrás: los textos anteriores eran los mismos sin el resaltado.
}
