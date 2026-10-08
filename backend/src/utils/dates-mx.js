import { env } from '../config/env.js';

/** Fecha de hoy (AAAA-MM-DD) en la zona horaria del coach. */
export function todayInAppTz(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: env.APP_TIMEZONE }).format(now);
}

const DAY_MS = 24 * 60 * 60 * 1000;
const toUtc = (iso) => Date.parse(`${iso}T00:00:00Z`);

export function daysBetween(fromIso, toIso) {
  return Math.round((toUtc(toIso) - toUtc(fromIso)) / DAY_MS);
}

export function addDays(iso, days) {
  return new Date(toUtc(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Lunes de la semana de una fecha. */
export function mondayOf(iso) {
  const weekday = (new Date(toUtc(iso)).getUTCDay() + 6) % 7;
  return addDays(iso, -weekday);
}
