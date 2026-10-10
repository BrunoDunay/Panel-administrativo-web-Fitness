// Cálculo de entrenamiento: series, e1RM, tonelaje, volumen por músculo, progreso,
// cardio y mediciones. Reproduce las hojas Semana n, Volumen, Progreso, Cardio y Mediciones.

import { round } from '../../utils/rounding.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const isNumber = (v) => typeof v === 'number' && !Number.isNaN(v);

/** Series realizadas: las que tienen repeticiones registradas. */
export function setsDone(sets) {
  return sets.filter((set) => isNumber(set.reps)).length;
}

/** 1RM estimado (Epley) con la mejor serie. null si no hay ninguna serie con carga. */
export function estimatedOneRepMax(sets) {
  const best = Math.max(0, ...sets.map((set) => (set.load || 0) * (1 + (set.reps || 0) / 30)));
  return best > 0 ? best : null;
}

/** Tonelaje: Σ carga × repeticiones. */
export function tonnage(sets) {
  const total = sets.reduce((sum, set) => sum + (set.load || 0) * (set.reps || 0), 0);
  return total > 0 ? total : null;
}

export function exerciseSummary(sets) {
  return { setsDone: setsDone(sets), e1rm: estimatedOneRepMax(sets), tonnage: tonnage(sets) };
}

/**
 * Volumen semanal por músculo. `exercises` son las filas de la semana:
 * `{ day, muscle, plannedSets, sets }`. La frecuencia es el número de días en que aparece el músculo.
 */
export function weeklyVolume(exercises) {
  const byMuscle = new Map();
  for (const exercise of exercises) {
    if (!exercise.muscle) continue;
    const entry = byMuscle.get(exercise.muscle) ?? { muscle: exercise.muscle, plannedSets: 0, doneSets: 0, days: new Set() };
    entry.plannedSets += exercise.plannedSets || 0;
    entry.doneSets += setsDone(exercise.sets || []);
    entry.days.add(exercise.day);
    byMuscle.set(exercise.muscle, entry);
  }
  return [...byMuscle.values()].map(({ days, ...rest }) => ({ ...rest, frequency: days.size }));
}

/** Etiqueta de prioridad del músculo en el bloque: P1, P2, P3, Mant. o ''. */
export function musclePriority(muscle, priorities) {
  if (priorities.p1?.includes(muscle)) return 'P1';
  if (priorities.p2?.includes(muscle)) return 'P2';
  if (priorities.p3?.includes(muscle)) return 'P3';
  if (priorities.maintenance?.includes(muscle)) return 'Mant.';
  return '';
}

/** Tendencia contra la semana anterior: 'up', 'down', 'same' o null si falta un dato. */
export function trend(current, previous) {
  if (!isNumber(current) || !isNumber(previous)) return null;
  return current > previous ? 'up' : current < previous ? 'down' : 'same';
}

/** Último día del bloque (ISO) a partir de su inicio (ISO) y sus semanas. */
export function blockEndDate(startDate, weeks) {
  if (!startDate || !weeks) return null;
  return new Date(Date.parse(`${startDate}T00:00:00Z`) + (weeks * 7 - 1) * DAY_MS).toISOString().slice(0, 10);
}

/** Encadena los bloques del macrociclo: cada uno empieza al día siguiente del anterior. */
export function scheduleBlocks(firstStartDate, blocks) {
  let start = firstStartDate;
  return blocks.map((block) => {
    const end = blockEndDate(start, block.weeks);
    const scheduled = { ...block, startDate: end ? start : null, endDate: end };
    start = end ? new Date(Date.parse(`${end}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10) : null;
    return scheduled;
  });
}

/** Promedio semanal de pasos objetivo según los días de entreno. */
export function weeklyStepsTarget({ trainingDaySteps, restDaySteps, trainingDays }) {
  return round((trainingDaySteps * trainingDays + restDaySteps * (7 - trainingDays)) / 7);
}

/** Minutos de cardio pautados contra realizados en la semana. */
export function cardioCompliance(plannedMinutes, doneMinutes) {
  const planned = plannedMinutes.reduce((sum, v) => sum + (v || 0), 0);
  const logged = doneMinutes.filter(isNumber);
  const done = logged.length ? logged.reduce((sum, v) => sum + v, 0) : null;
  return { planned, done, compliance: done !== null && planned ? done / planned : null };
}

/** Cambio de una medida entre la medición inicial y la más reciente. */
/**
 * Semana que el cliente todavía no puede ver: la más reciente del plan, mientras no conteste
 * el cuestionario de la anterior. Devuelve su número, o null si no hay ninguna bloqueada.
 */
export function lockedWeekNumber(weekNumbers, answeredWeeks) {
  const last = Math.max(0, ...weekNumbers);
  if (last <= 1 || !weekNumbers.includes(last - 1)) return null;
  return answeredWeeks.includes(last - 1) ? null : last;
}

export function measurementDelta(values) {
  const taken = values.filter(isNumber);
  if (taken.length < 2 || !isNumber(values[0])) return { delta: null, pct: null };
  const delta = taken[taken.length - 1] - values[0];
  return { delta, pct: values[0] ? delta / values[0] : null };
}

export function ageOn(birthDate, today = new Date().toISOString().slice(0, 10)) {
  if (!birthDate) return null;
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}
