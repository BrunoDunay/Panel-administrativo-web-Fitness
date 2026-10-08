import { CardioProtocol, Exercise, Food, Muscle, Supplement, WarmupProtocol } from '../models/index.js';
import { AppError, notFound } from '../utils/app-error.js';
import { LISTS, loadCatalog } from '../services/catalog.service.js';
import { getSections, saveSection } from '../services/settings.service.js';
import { SETTINGS_SECTIONS, catalogSchemas, settingsSchemas } from '../validators/catalog.schemas.js';

const RESOURCES = {
  muscles: { Model: Muscle, label: 'El músculo' },
  exercises: { Model: Exercise, label: 'El ejercicio' },
  'cardio-protocols': { Model: CardioProtocol, label: 'El protocolo' },
  'warmup-protocols': { Model: WarmupProtocol, label: 'El protocolo' },
  foods: { Model: Food, label: 'El alimento' },
  supplements: { Model: Supplement, label: 'El suplemento' },
};

function resource(req) {
  const found = RESOURCES[req.params.resource];
  if (!found) throw new AppError(404, `El catálogo "${req.params.resource}" no existe.`, 'NOT_FOUND');
  return { ...found, schema: catalogSchemas[req.params.resource] };
}

export async function getCatalog(_req, res) {
  res.json({ ...(await loadCatalog()), lists: LISTS });
}

export async function createItem(req, res) {
  const { Model, schema } = resource(req);
  res.status(201).json(await Model.create(schema.parse(req.body ?? {})));
}

export async function updateItem(req, res) {
  const { Model, schema, label } = resource(req);
  const item = await Model.findByPk(req.valid.params.id);
  if (!item) throw notFound(label);
  res.json(await item.update(schema.parse(req.body ?? {})));
}

export async function deleteItem(req, res) {
  const { Model, label } = resource(req);
  const item = await Model.findByPk(req.valid.params.id);
  if (!item) throw notFound(label);
  await item.destroy();
  res.status(204).end();
}

// ---- Contenido de la landing ----

export async function getPublicSettings(_req, res) {
  res.json(await getSections(SETTINGS_SECTIONS));
}

export async function updateSettings(req, res) {
  const schema = settingsSchemas[req.params.section];
  if (!schema) throw new AppError(404, `La sección "${req.params.section}" no existe.`, 'NOT_FOUND');
  res.json(await saveSection(req.params.section, schema.parse(req.body ?? {})));
}
