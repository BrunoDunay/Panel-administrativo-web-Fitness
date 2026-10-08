import { readFileSync } from 'node:fs';
import bcrypt from 'bcrypt';
import { env } from './env.js';
import { sequelize } from './database.js';
import { Admin, CardioProtocol, Exercise, Food, Muscle, SiteSetting, Supplement, WarmupProtocol } from '../models/index.js';
import { BCRYPT_ROUNDS } from '../controllers/auth.controller.js';
import * as content from '../../seeders/initial-content.js';

const data = (file) => JSON.parse(readFileSync(new URL(`../../seeders/data/${file}`, import.meta.url), 'utf8'));

/** Crea la cuenta del coach si todavía no existe ninguna. */
async function ensureAdmin() {
  if (await Admin.count()) return false;
  await Admin.create({
    email: env.ADMIN_EMAIL.toLowerCase(),
    name: env.ADMIN_NAME,
    passwordHash: await bcrypt.hash(env.ADMIN_PASSWORD, BCRYPT_ROUNDS),
  });
  return true;
}

/** Inserta solo las secciones de configuración que falten (nunca sobrescribe lo editado). */
async function seedSettings(transaction) {
  const existing = new Set((await SiteSetting.findAll({ attributes: ['key'], transaction })).map((s) => s.key));
  const missing = Object.entries(content.settings).filter(([key]) => !existing.has(key));
  await SiteSetting.bulkCreate(missing.map(([key, value]) => ({ key, value })), { transaction });
  return missing.length;
}

async function seedTable(Model, rows, transaction) {
  if (await Model.count({ transaction })) return false;
  await Model.bulkCreate(rows, { transaction });
  return true;
}

async function seedExercises(transaction) {
  if (await Muscle.count({ transaction })) return false;
  for (const [index, { name, exercises }] of data('exercises.json').entries()) {
    const muscle = await Muscle.create({ name, sortOrder: index }, { transaction });
    await Exercise.bulkCreate(exercises.map((exercise, i) => ({ muscleId: muscle.id, name: exercise, sortOrder: i })), { transaction });
  }
  return true;
}

const ordered = (rows) => rows.map((row, index) => ({ ...row, sortOrder: index }));

/** Idempotente: se puede ejecutar en cada arranque sin duplicar ni pisar datos. */
export async function initializeData() {
  const adminCreated = await ensureAdmin();

  const seeded = await sequelize.transaction(async (transaction) => ({
    settings: await seedSettings(transaction),
    ejercicios: await seedExercises(transaction),
    alimentos: await seedTable(Food, data('foods.json'), transaction),
    suplementos: await seedTable(Supplement, data('supplements.json'), transaction),
    'protocolos de cardio': await seedTable(CardioProtocol, ordered(data('cardio-protocols.json')), transaction),
    'protocolos de calentamiento': await seedTable(WarmupProtocol, ordered(data('warmup-protocols.json')), transaction),
  }));

  const { settings, ...catalogs } = seeded;
  return { adminCreated, settings, catalogs: Object.keys(catalogs).filter((key) => catalogs[key]) };
}
