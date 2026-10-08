import { sequelize } from '../config/database.js';
import { Payment } from '../models/index.js';
import { notFound } from '../utils/app-error.js';
import { nextDueDate, paymentDelay, paymentStatus, periodMonths } from './calculations/payments.js';

const dueDateOf = (client) => client.profile?.logistics?.paymentDate ?? null;
const planTypeOf = (client) => client.profile?.logistics?.planType ?? null;

/** Estado del pago de un cliente hoy. Lo usan el expediente, el portal, la lista y el resumen. */
export function clientPaymentStatus(client, today) {
  const planType = planTypeOf(client);
  return { ...paymentStatus(dueDateOf(client), today), planType, periodMonths: periodMonths(planType) };
}

function serializePayment(payment) {
  return {
    id: payment.id,
    paidOn: payment.paidOn,
    amount: payment.amount,
    method: payment.method,
    notes: payment.notes,
    dueDate: payment.dueDate,
    nextDueDate: payment.nextDueDate,
    delayDays: paymentDelay(payment.dueDate, payment.paidOn),
  };
}

export async function listPayments(clientId) {
  const payments = await Payment.findAll({
    where: { clientId },
    order: [
      ['paidOn', 'DESC'],
      ['createdAt', 'DESC'],
    ],
  });
  return payments.map(serializePayment);
}

/** La fecha del próximo pago vive en la historia clínica del cliente. */
export function setDueDate(client, date, transaction) {
  const profile = { ...client.profile, logistics: { ...client.profile?.logistics, paymentDate: date } };
  return client.update({ profile }, { transaction });
}

/**
 * Registra un pago y recorre el vencimiento. Si el coach no indica la fecha del siguiente pago,
 * se calcula con el tipo de plan.
 */
export async function registerPayment(client, { paidOn, amount, method, notes, nextDueDate: chosen }) {
  const dueDate = dueDateOf(client);
  const next = chosen ?? nextDueDate({ dueDate, paidOn, planType: planTypeOf(client) });

  return sequelize.transaction(async (transaction) => {
    const payment = await Payment.create({ clientId: client.id, paidOn, amount, method, notes, dueDate, nextDueDate: next }, { transaction });
    await setDueDate(client, next, transaction);
    return serializePayment(payment);
  });
}

/** Borra un pago capturado por error. Si era el más reciente, el vencimiento vuelve al que ese pago cubría. */
export async function deletePayment(client, paymentId) {
  const payment = await Payment.findOne({ where: { id: paymentId, clientId: client.id } });
  if (!payment) throw notFound('El pago');
  const latest = await Payment.findOne({ where: { clientId: client.id }, order: [['createdAt', 'DESC']] });
  const undo = latest.id === payment.id && dueDateOf(client) === payment.nextDueDate;

  await sequelize.transaction(async (transaction) => {
    await payment.destroy({ transaction });
    if (undo) await setDueDate(client, payment.dueDate, transaction);
  });
}
