// Fechas de pago: cuándo vence el siguiente y en qué estado está respecto a hoy.

/** Meses que cubre cada tipo de plan. */
export const PLAN_MONTHS = { Mensual: 1, Trimestral: 3, Semestral: 6, Anual: 12 };

/** Plan con fechas acordadas a mano: no sigue el calendario de ningún periodo fijo. */
export const CUSTOM_PLAN = 'Personalizado';

/** Días antes del vencimiento en que el pago ya se considera "próximo". */
export const PAYMENT_NOTICE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
const toUtc = (iso) => Date.parse(`${iso}T00:00:00Z`);

export const periodMonths = (planType) => PLAN_MONTHS[planType] ?? 1;

/** Suma meses conservando el día; si el mes destino es más corto, usa su último día (31 ene → 28 feb). */
export function addMonths(iso, months) {
  const [year, month, day] = iso.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1 + months, Math.min(day, lastDay))).toISOString().slice(0, 10);
}

/**
 * Próximo vencimiento al registrar un pago: el vencimiento que se está pagando más el periodo
 * del plan. Así, pagar antes o después de lo acordado no recorre el calendario del cliente.
 * Sin vencimiento previo, el periodo cuenta desde el día del pago.
 */
export function nextDueDate({ dueDate, paidOn, planType }) {
  return addMonths(dueDate ?? paidOn, periodMonths(planType));
}

/** Estado del pago hoy: sin fecha, al corriente, próximo o vencido. `days` = días que faltan (negativo si ya venció). */
export function paymentStatus(dueDate, today, noticeDays = PAYMENT_NOTICE_DAYS) {
  if (!dueDate) return { state: 'none', dueDate: null, days: null };
  const days = Math.round((toUtc(dueDate) - toUtc(today)) / DAY_MS);
  return { state: days < 0 ? 'overdue' : days <= noticeDays ? 'soon' : 'ok', dueDate, days };
}

/**
 * Reparto de un pago contra lo que se debe. Con tarifa acordada, un pago menor a lo pendiente es un
 * abono: queda saldo y no empieza un periodo nuevo. Al cubrirlo todo, lo pendiente pasa a ser la
 * tarifa del periodo siguiente. Sin tarifa (o sin monto capturado) el pago se toma como completo.
 */
export function applyPayment({ pending, fee, amount }) {
  if (typeof pending !== 'number' || typeof amount !== 'number') return { partial: false, pendingBefore: pending ?? null, pendingAfter: typeof fee === 'number' ? fee : null };
  if (amount < pending) return { partial: true, pendingBefore: pending, pendingAfter: Math.round((pending - amount) * 100) / 100 };
  return { partial: false, pendingBefore: pending, pendingAfter: typeof fee === 'number' ? fee : null };
}

/** Días de diferencia entre el pago y su vencimiento: positivo = pagó tarde, negativo = pagó antes. */
export function paymentDelay(dueDate, paidOn) {
  return dueDate ? Math.round((toUtc(paidOn) - toUtc(dueDate)) / DAY_MS) : null;
}
