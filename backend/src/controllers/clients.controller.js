import { Op } from 'sequelize';
import { env } from '../config/env.js';
import { Checkin, Client, NutritionPlan, TrainingPlan, WeightLog } from '../models/index.js';
import { generateAccessCode } from '../utils/access-code.js';
import { todayInAppTz } from '../utils/dates-mx.js';
import { ageOn } from '../services/calculations/training.js';
import { loadCatalog } from '../services/catalog.service.js';
import { buildNutritionView, findActiveNutritionPlan } from '../services/nutrition.service.js';
import { buildTrackingView } from '../services/tracking.service.js';
import { buildTrainingView, findActivePlan } from '../services/training.service.js';

const portalUrl = (client) => `${env.PUBLIC_SITE_URL.replace(/\/$/, '')}/mi-plan/${client.accessCode}`;

/** Datos del cliente. El portal no recibe las notas del coach ni el código de acceso. */
function serializeClient(client, { forCoach }) {
  const data = {
    id: client.id,
    fullName: client.fullName,
    birthDate: client.birthDate,
    age: ageOn(client.birthDate, todayInAppTz()),
    sex: client.sex,
    heightCm: client.heightCm,
    initialWeightKg: client.initialWeightKg,
    city: client.city,
    occupation: client.occupation,
    phone: client.phone,
    email: client.email,
    profile: client.profile,
  };
  if (!forCoach) return data;
  return {
    ...data,
    status: client.status,
    portalEnabled: client.portalEnabled,
    portalUrl: portalUrl(client),
    coachNotes: client.coachNotes,
    createdAt: client.createdAt,
  };
}

export async function list(req, res) {
  const { search, status } = req.valid.query;
  const where = {};
  if (status !== 'all') where.status = status;
  if (search) where.fullName = { [Op.iLike]: `%${search.replace(/[%_\\]/g, '\\$&')}%` };

  const clients = await Client.findAll({
    where,
    order: [['fullName', 'ASC']],
    include: [
      { model: TrainingPlan, as: 'trainingPlans', where: { isActive: true }, required: false, attributes: ['id', 'blockPhase', 'objective'] },
      { model: NutritionPlan, as: 'nutritionPlans', where: { isActive: true }, required: false, attributes: ['id', 'inputs'] },
    ],
  });

  res.json(
    clients.map((client) => ({
      id: client.id,
      fullName: client.fullName,
      status: client.status,
      age: ageOn(client.birthDate, todayInAppTz()),
      phone: client.phone,
      objective: client.trainingPlans[0]?.objective?.primary ?? null,
      blockPhase: client.trainingPlans[0]?.blockPhase ?? null,
      goal: client.nutritionPlans[0]?.inputs?.goal ?? null,
      hasTraining: client.trainingPlans.length > 0,
      hasNutrition: client.nutritionPlans.length > 0,
      planType: client.profile?.logistics?.planType ?? null,
      paymentDate: client.profile?.logistics?.paymentDate ?? null,
      createdAt: client.createdAt,
    })),
  );
}

export async function create(req, res) {
  const client = await Client.create({ ...req.valid.body, accessCode: generateAccessCode() });
  res.status(201).json(serializeClient(client, { forCoach: true }));
}

/** Todo lo del cliente en una sola respuesta: lo usan el expediente del coach y el portal. */
export async function overview(req, res) {
  const { client, isCoach } = req;
  const [catalog, trainingPlan, nutritionPlan] = await Promise.all([loadCatalog(), findActivePlan(client.id), findActiveNutritionPlan(client.id)]);

  const nutrition = nutritionPlan || isCoach ? buildNutritionView(nutritionPlan, client, catalog, todayInAppTz()) : null;
  const tracking = await buildTrackingView(client.id, { weeklyChangeKg: nutrition?.computed?.weeklyChangeKg ?? null });

  res.json({
    client: serializeClient(client, { forCoach: isCoach }),
    training: buildTrainingView(trainingPlan, catalog),
    nutrition,
    tracking,
    today: todayInAppTz(),
  });
}

export async function update(req, res) {
  await req.client.update(req.valid.body);
  res.json(serializeClient(req.client, { forCoach: true }));
}

export async function remove(req, res) {
  await req.client.destroy();
  res.status(204).end();
}

/** Enlace nuevo: el anterior deja de funcionar de inmediato. */
export async function regenerateAccessCode(req, res) {
  await req.client.update({ accessCode: generateAccessCode() });
  res.json({ portalUrl: portalUrl(req.client) });
}

export async function dashboard(_req, res) {
  const today = todayInAppTz();
  const [active, paused, withTraining, withNutrition, recentCheckins, recentWeights, clients] = await Promise.all([
    Client.count({ where: { status: 'active' } }),
    Client.count({ where: { status: 'paused' } }),
    TrainingPlan.count({ where: { isActive: true } }),
    NutritionPlan.count({ where: { isActive: true } }),
    Checkin.findAll({ order: [['updatedAt', 'DESC']], limit: 8 }),
    WeightLog.findAll({ order: [['updatedAt', 'DESC']], limit: 8 }),
    Client.findAll({ where: { status: 'active' }, attributes: ['id', 'fullName', 'profile', 'createdAt'], order: [['createdAt', 'DESC']] }),
  ]);
  const names = new Map(clients.map((c) => [c.id, c.fullName]));

  const activity = [
    ...recentCheckins.map((c) => ({ clientId: c.clientId, type: 'checkin', label: `Cuestionario de la semana ${c.weekNumber}`, at: c.updatedAt })),
    ...recentWeights.map((w) => ({ clientId: w.clientId, type: 'weight', label: `Registró su peso: ${w.weightKg ?? '—'} kg`, at: w.updatedAt })),
  ]
    .filter((item) => names.has(item.clientId))
    .map((item) => ({ ...item, clientName: names.get(item.clientId) }))
    .sort((a, b) => b.at - a.at)
    .slice(0, 10);

  // Pagos próximos: fecha de pago de la historia clínica dentro de los siguientes 10 días (o vencida).
  const limit = new Date(Date.parse(`${today}T00:00:00Z`) + 10 * 864e5).toISOString().slice(0, 10);
  const payments = clients
    .map((c) => ({ clientId: c.id, clientName: c.fullName, date: c.profile?.logistics?.paymentDate ?? null, planType: c.profile?.logistics?.planType ?? null }))
    .filter((p) => p.date && p.date <= limit)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => ({ ...p, overdue: p.date < today }));

  res.json({
    today,
    counts: { active, paused, withTraining, withNutrition, withoutTraining: Math.max(0, active - withTraining), withoutNutrition: Math.max(0, active - withNutrition) },
    recentClients: clients.slice(0, 5).map((c) => ({ id: c.id, fullName: c.fullName, createdAt: c.createdAt })),
    activity,
    payments,
  });
}
