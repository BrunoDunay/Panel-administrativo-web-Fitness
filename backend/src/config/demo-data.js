import { Op } from 'sequelize';
import { Client, SiteSetting } from '../models/index.js';
import { todayInAppTz } from '../utils/dates-mx.js';
import { seedDemoClients } from '../../seeders/demo-clients.js';
import { env } from './env.js';
import { sequelize } from './database.js';

const DEMO_DOMAIN = '@demo.fbe';
const CHECK_EVERY_MS = 30 * 60 * 1000;

/**
 * Candado: la demostración borra y vuelve a crear sus clientes cada día. Si la base tiene
 * un solo cliente que no sea de ejemplo, es la base real (o una equivocada) y no se toca nada.
 */
async function assertDemoDatabase() {
  const real = await Client.count({ where: { email: { [Op.or]: [{ [Op.is]: null }, { [Op.notLike]: `%${DEMO_DOMAIN}` }] } } });
  if (real) {
    throw new Error(`DEMO_MODE está activo pero la base tiene ${real} cliente(s) que no son de ejemplo. La demostración necesita su propia base de datos: revisa DATABASE_URL.`);
  }
}

// Registro interno de la demostración (la landing no lo lee: solo expone sus secciones).
const MARKER_KEY = 'demo';

/**
 * Aparta la regeneración de hoy. Es atómico: si corren varias copias del servidor a la vez
 * (por ejemplo en Vercel), solo una gana y las demás siguen mostrando los datos.
 * Sin clientes (base nueva o regeneración fallida) siempre se regenera.
 */
async function claimTodaysRefresh(today) {
  const force = !(await Client.count());
  const [rows] = await sequelize.query(
    `INSERT INTO site_settings (key, value, created_at, updated_at) VALUES (:key, :value, now(), now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
     WHERE :force OR site_settings.value->>'seededOn' IS DISTINCT FROM :today
     RETURNING key`,
    { replacements: { key: MARKER_KEY, value: JSON.stringify({ seededOn: today }), today, force } },
  );
  return rows.length > 0;
}

/** La landing de la demostración se muestra como ya confirmada (sin avisos de "Pendiente de confirmar"). */
async function confirmLandingContent() {
  for (const setting of await SiteSetting.findAll({ where: { key: { [Op.ne]: MARKER_KEY } } })) {
    if (setting.value?.isProvisional) await setting.update({ value: { ...setting.value, isProvisional: false } });
  }
}

let running = null;

/** Regenera los datos de ejemplo si son de otro día. Devuelve true si los volvió a crear. */
export async function refreshDemoData({ log = console.log } = {}) {
  if (!env.DEMO_MODE) return false;
  // Si ya se está regenerando (arranque y temporizador a la vez), espera a esa misma vuelta.
  running ??= (async () => {
    await assertDemoDatabase();
    if (!(await claimTodaysRefresh(todayInAppTz()))) return false;
    const started = Date.now();
    try {
      await seedDemoClients({ reset: true, showcase: true });
      await confirmLandingContent();
    } catch (error) {
      // Libera el turno para que el siguiente intento vuelva a regenerar.
      await SiteSetting.destroy({ where: { key: MARKER_KEY } });
      throw error;
    }
    log(`Demostración: datos de ejemplo regenerados en ${((Date.now() - started) / 1000).toFixed(1)} s.`);
    return true;
  })().finally(() => {
    running = null;
  });
  return running;
}

/** Revisa cada media hora si cambió el día para regenerar los datos (agenda y pagos relativos a hoy). */
export function startDemoRefresh() {
  const timer = setInterval(() => {
    refreshDemoData().catch((error) => console.error('Demostración: no se pudieron regenerar los datos:', error.message));
  }, CHECK_EVERY_MS);
  timer.unref();
  return timer;
}
