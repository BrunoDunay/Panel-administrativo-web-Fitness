import { sequelize } from '../config/database.js';
import { Payment } from '../models/index.js';
import { notFound } from '../utils/app-error.js';
import { applyPayment, nextDueDate, paymentDelay, paymentStatus, periodMonths } from './calculations/payments.js';

const dueDateOf = (client) => client.profile?.logistics?.paymentDate ?? null;
const planTypeOf = (client) => client.profile?.logistics?.planType ?? null;
const feeOf = (client) => client.profile?.logistics?.fee ?? null;
/** Lo que falta por cobrar: el saldo del periodo en curso o, si no se ha tocado, la tarifa completa. */
const pendingOf = (client) => client.profile?.logistics?.pendingAmount ?? feeOf(client);

/**
 * Estado del pago de un cliente hoy. Lo usan el expediente, el portal, la lista y el resumen.
 * `locked`: con el pago vencido el cliente no ve su plan, salvo que el coach lo permita.
 */
export function clientPaymentStatus(client, today) {
  const planType = planTypeOf(client);
  const status = paymentStatus(dueDateOf(client), today);
  const overdueAccess = Boolean(client.overdueAccess);
  return { ...status, planType, periodMonths: periodMonths(planType), fee: feeOf(client), pendingAmount: pendingOf(client), overdueAccess, locked: status.state === 'overdue' && !overdueAccess };
}

/** El coach permite (o vuelve a bloquear) el acceso de un cliente con el pago vencido. */
export const setOverdueAccess = (client, allow) => client.update({ overdueAccess: allow });

function serializePayment(payment) {
  return {
    id: payment.id,
    paidOn: payment.paidOn,
    amount: payment.amount,
    method: payment.method,
    notes: payment.notes,
    dueDate: payment.dueDate,
    nextDueDate: payment.nextDueDate,
    pendingBefore: payment.pendingBefore,
    pendingAfter: payment.pendingAfter,
    // Abono: cubrió solo una parte de lo que se debía.
    partial: payment.pendingBefore !== null && payment.amount !== null && payment.amount < payment.pendingBefore,
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
export function setDueDate(client, date, transaction, pendingAmount) {
  const logistics = { ...client.profile?.logistics, paymentDate: date };
  // `undefined` deja el saldo como está; un número o null lo cambia.
  if (pendingAmount !== undefined) logistics.pendingAmount = pendingAmount;
  const profile = { ...client.profile, logistics };
  // Con fecha nueva termina el permiso especial: si vuelve a vencer, se bloquea otra vez.
  return client.update({ profile, overdueAccess: false }, { transaction });
}

/**
 * Registra un pago. Si cubre todo lo pendiente, el vencimiento se recorre un periodo (o a la fecha
 * que indique el coach) y lo pendiente pasa a ser la tarifa del siguiente. Si es un abono, queda el
 * saldo y la fecha es la acordada para pagar el resto (por defecto, la misma que ya tenía).
 */
export async function registerPayment(client, { paidOn, amount, method, notes, nextDueDate: chosen }) {
  const dueDate = dueDateOf(client);
  const { partial, pendingBefore, pendingAfter } = applyPayment({ pending: pendingOf(client), fee: feeOf(client), amount });
  const next = chosen ?? (partial ? (dueDate ?? paidOn) : nextDueDate({ dueDate, paidOn, planType: planTypeOf(client) }));

  return sequelize.transaction(async (transaction) => {
    const payment = await Payment.create({ clientId: client.id, paidOn, amount, method, notes, dueDate, nextDueDate: next, pendingBefore, pendingAfter }, { transaction });
    await setDueDate(client, next, transaction, pendingAfter);
    return serializePayment(payment);
  });
}

/** Borra un pago capturado por error. Si era el más reciente, el vencimiento y el saldo vuelven a como estaban antes de él. */
export async function deletePayment(client, paymentId) {
  const payment = await Payment.findOne({ where: { id: paymentId, clientId: client.id } });
  if (!payment) throw notFound('El pago');
  const latest = await Payment.findOne({ where: { clientId: client.id }, order: [['createdAt', 'DESC']] });
  const undo = latest.id === payment.id && dueDateOf(client) === payment.nextDueDate;

  await sequelize.transaction(async (transaction) => {
    await payment.destroy({ transaction });
    if (undo) await setDueDate(client, payment.dueDate, transaction, payment.pendingBefore);
  });
}
