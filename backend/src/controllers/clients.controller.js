import { Op } from 'sequelize';
import { env } from '../config/env.js';
import { Checkin, Client, NutritionPlan, TrainingPlan, TrainingWeek, WeightLog } from '../models/index.js';
import { sequelize } from '../config/database.js';
import { generateAccessCode } from '../utils/access-code.js';
import { todayInAppTz } from '../utils/dates-mx.js';
import { ageOn, lockedWeekNumber } from '../services/calculations/training.js';
import { loadCatalog } from '../services/catalog.service.js';
import { buildNutritionView, findActiveNutritionPlan } from '../services/nutrition.service.js';
import { changeDueDate, clientPaymentStatus, deletePayment, listPayments, registerPayment, setOverdueAccess } from '../services/payments.service.js';
import { buildTrackingView } from '../services/tracking.service.js';
import { buildTrainingView, findActivePlan } from '../services/training.service.js';

/** El resumen avisa de los pagos que vencen dentro de estos días. */
const PAYMENT_WINDOW_DAYS = 10;

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

  const today = todayInAppTz();
  const clients = await Client.findAll({
    where,
    order: [['fullName', 'ASC']],
    include: [
      { model: TrainingPlan, as: 'trainingPlans', where: { isActive: true }, required: false, attributes: ['id', 'blockPhase', 'objective'] },
      { model: NutritionPlan, as: 'nutritionPlans', where: { isActive: true }, required: false, attributes: ['id', 'inputs'] },
    ],
  });

  // Semana en la que va cada cliente (la última de su plan) y último cuestionario contestado.
  const ids = clients.map((client) => client.id);
  const [weeks, checkins] = await Promise.all([
    TrainingWeek.findAll({ attributes: ['planId', [sequelize.fn('MAX', sequelize.col('number')), 'last']], where: { planId: clients.flatMap((c) => c.trainingPlans.map((p) => p.id)) }, group: ['planId'], raw: true }),
    Checkin.findAll({ attributes: ['clientId', [sequelize.fn('MAX', sequelize.col('week_number')), 'last']], where: { clientId: ids }, group: ['clientId'], raw: true }),
  ]);
  const weekOf = new Map(weeks.map((row) => [row.planId, Number(row.last)]));
  const checkinOf = new Map(checkins.map((row) => [row.clientId, Number(row.last)]));

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
      paymentState: clientPaymentStatus(client, today).state,
      paymentLocked: clientPaymentStatus(client, today).locked,
      overdueAccess: client.overdueAccess,
      currentWeek: weekOf.get(client.trainingPlans[0]?.id) ?? null,
      lastCheckinWeek: checkinOf.get(client.id) ?? null,
      createdAt: client.createdAt,
    })),
  );
}

export async function create(req, res) {
  const { firstPayment, ...data } = req.valid.body;
  const client = await Client.create({ ...data, accessCode: generateAccessCode() });
  // Pago hecho al darse de alta: completo o abono; la fecha capturada es la del siguiente pago (o la del resto).
  if (firstPayment && firstPayment.amount !== null) {
    await registerPayment(client, { paidOn: todayInAppTz(), amount: firstPayment.amount, method: firstPayment.method, notes: 'Pago al darse de alta', nextDueDate: data.profile?.logistics?.paymentDate ?? null }, { first: true });
  }
  res.status(201).json(serializeClient(client, { forCoach: true }));
}

/** Todo lo del cliente en una sola respuesta: lo usan el expediente del coach y el portal. */
export async function overview(req, res) {
  const { client, isCoach } = req;
  // Pago vencido: el enlace abre, pero solo muestra el aviso (sin plan ni seguimiento).
  const status = clientPaymentStatus(client, todayInAppTz());
  if (!isCoach && status.locked) {
    return res.json({ locked: true, client: { fullName: client.fullName }, training: null, nutrition: null, tracking: null, payment: status, today: todayInAppTz() });
  }
  const [catalog, trainingPlan, nutritionPlan] = await Promise.all([loadCatalog(), findActivePlan(client.id), findActiveNutritionPlan(client.id)]);

  const nutrition = nutritionPlan || isCoach ? buildNutritionView(nutritionPlan, client, catalog, todayInAppTz()) : null;
  // Si el coach no quiere que el cliente cambie alimentos, el portal no recibe los equivalentes.
  if (!isCoach && nutrition?.computed && !nutrition.allowClientSwaps) nutrition.computed.equivalents = {};
  const today = todayInAppTz();
  const [tracking, payments] = await Promise.all([
    buildTrackingView(client.id, { weeklyChangeKg: nutrition?.computed?.weeklyChangeKg ?? null }),
    // El historial de pagos es solo para el coach; el cliente recibe el estado (para su aviso).
    isCoach ? listPayments(client.id) : null,
  ]);

  // El cliente no ve su semana nueva hasta contestar el cuestionario de la anterior; el coach siempre ve todo.
  const lockedWeek = isCoach
    ? null
    : lockedWeekNumber(
        (trainingPlan?.weeks ?? []).map((week) => week.number),
        tracking.checkins.map((checkin) => checkin.weekNumber),
      );

  res.json({
    client: serializeClient(client, { forCoach: isCoach }),
    training: buildTrainingView(trainingPlan, catalog, { lockedWeek }),
    nutrition,
    tracking,
    payment: clientPaymentStatus(client, today),
    ...(isCoach ? { payments } : {}),
    today,
  });
}

export async function update(req, res) {
  // Si cambia la tarifa y todavía no hay abonos del periodo, lo pendiente pasa a ser la tarifa nueva.
  const before = req.client.profile?.logistics ?? {};
  const logistics = req.valid.body.profile?.logistics;
  if (logistics && (logistics.fee ?? null) !== (before.fee ?? null) && (before.pendingAmount == null || before.pendingAmount === before.fee)) {
    logistics.pendingAmount = logistics.fee ?? null;
  }
  await req.client.update(req.valid.body);
  res.json(serializeClient(req.client, { forCoach: true }));
}

/** Pausar, archivar o reactivar desde la lista, sin abrir el expediente. */
export async function setStatus(req, res) {
  await req.client.update({ status: req.valid.body.status });
  res.status(204).end();
}

export async function remove(req, res) {
  await req.client.destroy();
  res.status(204).end();
}

export async function addPayment(req, res) {
  res.status(201).json(await registerPayment(req.client, req.valid.body));
}

/** Permite o bloquea el acceso del cliente mientras su pago está vencido. */
export async function setPaymentAccess(req, res) {
  await setOverdueAccess(req.client, req.valid.body.allow);
  res.status(204).end();
}

/** Cambia a mano la fecha del próximo pago (por ejemplo, si se acordó una prórroga). */
export async function setPaymentDueDate(req, res) {
  // El saldo solo cambia si el coach lo mandó; si no, se queda como está.
  await changeDueDate(req.client, req.valid.body.dueDate, req.body?.pendingAmount === undefined ? undefined : req.valid.body.pendingAmount);
  res.status(204).end();
}

export async function removePayment(req, res) {
  await deletePayment(req.client, req.valid.params.paymentId);
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
    WeightLog.findAll({ order: [['updatedAt', 'DESC']], limit: 40 }),
    Client.findAll({ where: { status: 'active' }, attributes: ['id', 'fullName', 'profile', 'overdueAccess', 'createdAt'], order: [['createdAt', 'DESC']] }),
  ]);
  const names = new Map(clients.map((c) => [c.id, c.fullName]));

  // Del peso, solo el registro más reciente de cada cliente (si no, un cliente constante llena la lista).
  const seen = new Set();
  const latestWeights = recentWeights.filter((w) => !seen.has(w.clientId) && seen.add(w.clientId));

  const activity = [
    ...recentCheckins.map((c) => ({ clientId: c.clientId, type: 'checkin', label: `Cuestionario de la semana ${c.weekNumber}`, at: c.updatedAt })),
    ...latestWeights.map((w) => ({ clientId: w.clientId, type: 'weight', label: `Registró su peso: ${w.weightKg ?? '—'} kg`, at: w.updatedAt })),
  ]
    .filter((item) => names.has(item.clientId))
    .map((item) => ({ ...item, clientName: names.get(item.clientId) }))
    .sort((a, b) => b.at - a.at)
    .slice(0, 10);

  // Pagos por cobrar: vencidos o que vencen dentro de los siguientes 10 días.
  const payments = clients
    .map((c) => ({ clientId: c.id, clientName: c.fullName, ...clientPaymentStatus(c, today) }))
    .filter((p) => p.dueDate && p.days <= PAYMENT_WINDOW_DAYS)
    .sort((a, b) => a.days - b.days)
    .map(({ dueDate, state, ...p }) => ({ ...p, date: dueDate, overdue: state === 'overdue' }));

  res.json({
    today,
    counts: { active, paused, withTraining, withNutrition, withoutTraining: Math.max(0, active - withTraining), withoutNutrition: Math.max(0, active - withNutrition) },
    recentClients: clients.slice(0, 5).map((c) => ({ id: c.id, fullName: c.fullName, createdAt: c.createdAt })),
    activity,
    payments,
  });
}
