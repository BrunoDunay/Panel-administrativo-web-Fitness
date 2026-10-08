import { Checkin, Measurement, WeightLog } from '../models/index.js';
import { round } from '../utils/rounding.js';
import { addDays, daysBetween, mondayOf } from '../utils/dates-mx.js';
import { measurementDelta } from './calculations/training.js';
import { LISTS } from './catalog.service.js';

const average = (values) => {
  const numbers = values.filter((v) => typeof v === 'number');
  return numbers.length ? numbers.reduce((a, b) => a + b, 0) / numbers.length : null;
};

/** Mantiene un registro por cliente y clave (semana o fecha): lo crea o lo actualiza. */
async function upsert(Model, where, data) {
  const row = await Model.findOne({ where });
  return row ? row.update(data) : Model.create({ ...where, ...data });
}

export const saveCheckin = (clientId, weekNumber, data) => upsert(Checkin, { clientId, weekNumber }, data);
export const saveMeasurement = (clientId, date, data) => upsert(Measurement, { clientId, date }, data);
export const deleteMeasurement = (clientId, date) => Measurement.destroy({ where: { clientId, date } });

/** Sin peso ni cintura, el registro del día se borra. */
export async function saveWeight(clientId, date, { weightKg = null, waistCm = null }) {
  if (weightKg === null && waistCm === null) return WeightLog.destroy({ where: { clientId, date } });
  return upsert(WeightLog, { clientId, date }, { weightKg, waistCm });
}

function serializeCheckin(row) {
  const ratings = LISTS.checkinRatings.map((item) => row.ratings?.[item.key] ?? null);
  return {
    weekNumber: row.weekNumber,
    date: row.date,
    sessions: row.sessions,
    ratings: row.ratings,
    answers: row.answers,
    avgSteps: row.avgSteps,
    avgWeightKg: row.avgWeightKg,
    avgRpe: average(row.sessions.map((s) => s.rpe)),
    avgDurationMin: average(row.sessions.map((s) => s.durationMin)),
    avgEnjoyment: average(row.sessions.map((s) => s.enjoyment)),
    wellbeingIndex: average(ratings),
    injuryRating: row.ratings?.injury ?? null,
  };
}

/**
 * Peso en ayunas agrupado por semana (lunes a domingo) desde el primer registro:
 * promedio semanal, cambio contra la semana anterior y peso esperado según el plan.
 */
function weightWeeks(logs, weeklyChangeKg) {
  const withWeight = logs.filter((log) => log.weightKg !== null);
  if (!withWeight.length) return [];
  const start = mondayOf(withWeight[0].date);
  const count = Math.floor(daysBetween(start, withWeight.at(-1).date) / 7) + 1;
  const byDate = new Map(logs.map((log) => [log.date, log]));

  let baseline = null;
  let previous = null;
  return Array.from({ length: count }, (_, week) => {
    const days = Array.from({ length: 7 }, (_, day) => {
      const date = addDays(start, week * 7 + day);
      const log = byDate.get(date);
      return { date, weightKg: log?.weightKg ?? null, waistCm: log?.waistCm ?? null };
    });
    const mean = average(days.map((d) => d.weightKg));
    const avg = mean === null ? null : round(mean, 2);
    if (baseline === null && avg !== null) baseline = { avg, week };
    const changeKg = avg !== null && previous !== null ? round(avg - previous, 2) : null;
    const row = {
      number: week + 1,
      start: days[0].date,
      days,
      average: avg,
      changeKg,
      changePct: changeKg !== null ? changeKg / previous : null,
      expected: baseline && typeof weeklyChangeKg === 'number' ? round(baseline.avg + weeklyChangeKg * (week - baseline.week), 2) : null,
      waistCm: days.map((d) => d.waistCm).findLast((v) => v !== null) ?? null,
    };
    if (avg !== null) previous = avg;
    return row;
  });
}

export async function buildTrackingView(clientId, { weeklyChangeKg = null } = {}) {
  const [checkins, measurements, weights] = await Promise.all([
    Checkin.findAll({ where: { clientId }, order: [['weekNumber', 'ASC']] }),
    Measurement.findAll({ where: { clientId }, order: [['date', 'ASC']] }),
    WeightLog.findAll({ where: { clientId }, order: [['date', 'ASC']] }),
  ]);

  return {
    checkins: checkins.map(serializeCheckin),
    measurements: {
      entries: measurements.map((m) => ({ date: m.date, values: m.values, photosLink: m.photosLink, notes: m.notes })),
      // Cambio de cada medida entre la medición inicial y la más reciente.
      deltas: Object.fromEntries(
        LISTS.measurements.map((item) => [item.key, measurementDelta(measurements.map((m) => m.values?.[item.key] ?? null))]),
      ),
    },
    weight: {
      weeklyChangeKg,
      latest: weights.findLast((log) => log.weightKg !== null)?.weightKg ?? null,
      weeks: weightWeeks(
        weights.map((log) => ({ date: log.date, weightKg: log.weightKg, waistCm: log.waistCm })),
        weeklyChangeKg,
      ),
    },
  };
}
