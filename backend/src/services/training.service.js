import { sequelize } from '../config/database.js';
import { TrainingPlan, TrainingWeek, WeekExercise } from '../models/index.js';
import { AppError, notFound } from '../utils/app-error.js';
import {
  blockEndDate,
  cardioCompliance,
  exerciseSummary,
  musclePriority,
  scheduleBlocks,
  trend,
  weeklyStepsTarget,
  weeklyVolume,
} from './calculations/training.js';

export const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const REST = 'Descanso';

const DEFAULT_PLAN = {
  objective: { primary: '', secondary: '', startingPoint: '', trajectory: '' },
  blockPhase: 'Adaptación',
  blockWeeks: 4,
  split: Array(7).fill(REST),
  priorities: { p1: [], p2: [], p3: [], maintenance: [], notes: {} },
  macroBlocks: [],
  steps: { trainingDay: null, restDay: null },
  cardio: Array.from({ length: 7 }, () => ({ protocol: '', moment: '', notes: '' })),
  warmup: Array.from({ length: 7 }, () => ({ protocol: '', notes: '' })),
};

const weekInclude = {
  model: TrainingWeek,
  as: 'weeks',
  include: [{ model: WeekExercise, as: 'exercises' }],
};

export async function findActivePlan(clientId, { withWeeks = true } = {}) {
  return TrainingPlan.findOne({
    where: { clientId, isActive: true },
    include: withWeeks ? [weekInclude] : [],
    order: withWeeks
      ? [
          [{ model: TrainingWeek, as: 'weeks' }, 'number', 'ASC'],
          [{ model: TrainingWeek, as: 'weeks' }, { model: WeekExercise, as: 'exercises' }, 'day', 'ASC'],
          [{ model: TrainingWeek, as: 'weeks' }, { model: WeekExercise, as: 'exercises' }, 'position', 'ASC'],
        ]
      : [],
  });
}

/** Crea o actualiza el plan activo del cliente. */
export async function savePlan(clientId, data) {
  const plan = await findActivePlan(clientId, { withWeeks: false });
  if (plan) return plan.update(data);
  return TrainingPlan.create({ ...DEFAULT_PLAN, ...data, clientId });
}

async function findWeek(clientId, weekId) {
  const week = await TrainingWeek.findByPk(weekId, {
    include: [
      { model: TrainingPlan, as: 'plan', attributes: ['id', 'clientId'] },
      { model: WeekExercise, as: 'exercises' },
    ],
  });
  if (!week || week.plan.clientId !== clientId) throw notFound('La semana');
  return week;
}

/** Semana nueva: hereda la pauta de la anterior, sin el registro del cliente. */
export async function addWeek(clientId) {
  const plan = (await findActivePlan(clientId)) ?? (await savePlan(clientId, {}));
  const previous = plan.weeks?.at(-1);

  return sequelize.transaction(async (transaction) => {
    const week = await TrainingWeek.create({ planId: plan.id, number: (previous?.number ?? 0) + 1 }, { transaction });
    if (previous) {
      await WeekExercise.bulkCreate(
        previous.exercises.map(({ day, position, muscle, exercise, sets, reps, rir, coachNotes, symbol }) => ({
          weekId: week.id,
          day,
          position,
          muscle,
          exercise,
          sets,
          reps,
          rir,
          coachNotes,
          // "Nuevo" solo aplica la primera semana en que aparece el ejercicio.
          symbol: symbol === '🆕' ? null : symbol,
        })),
        { transaction },
      );
    }
    return week;
  });
}

/** Reemplaza la pauta de una semana conservando el registro de los ejercicios que siguen. */
export async function saveWeekPrescription(clientId, weekId, exercises) {
  const week = await findWeek(clientId, weekId);
  const existing = new Map(week.exercises.map((e) => [e.id, e]));
  const position = new Map();

  await sequelize.transaction(async (transaction) => {
    const kept = new Set();
    for (const { id, ...data } of exercises) {
      const next = position.get(data.day) ?? 0;
      position.set(data.day, next + 1);
      const row = id ? existing.get(id) : null;
      if (row) {
        // Si cambia el ejercicio, el registro anterior ya no corresponde.
        const changed = row.exercise !== data.exercise;
        await row.update({ ...data, position: next, ...(changed ? { logged: [], clientNotes: null } : {}) }, { transaction });
        kept.add(row.id);
      } else {
        await WeekExercise.create({ ...data, position: next, weekId: week.id }, { transaction });
      }
    }
    const removed = [...existing.keys()].filter((key) => !kept.has(key));
    if (removed.length) await WeekExercise.destroy({ where: { id: removed }, transaction });
  });
}

export async function deleteWeek(clientId, weekId) {
  const week = await findWeek(clientId, weekId);
  const last = await TrainingWeek.max('number', { where: { planId: week.planId } });
  if (week.number !== last) {
    throw new AppError(409, 'Solo se puede eliminar la última semana del plan.', 'NOT_LAST_WEEK');
  }
  await week.destroy();
}

/** Registro del cliente en un ejercicio: carga y reps por serie, y sus notas. */
export async function logExercise(clientId, exerciseId, { logged, clientNotes }) {
  const row = await WeekExercise.findByPk(exerciseId, {
    include: [{ model: TrainingWeek, as: 'week', include: [{ model: TrainingPlan, as: 'plan', attributes: ['clientId'] }] }],
  });
  if (!row || row.week.plan.clientId !== clientId) throw notFound('El ejercicio');
  const changes = {};
  if (logged !== undefined) changes.logged = logged.slice(0, row.sets);
  if (clientNotes !== undefined) changes.clientNotes = clientNotes;
  await row.update(changes);
  return serializeExercise(row);
}

/** Fechas de cada día y minutos de cardio realizados en la semana. */
export async function logWeek(clientId, weekId, { dayDates, cardioLog }) {
  const week = await findWeek(clientId, weekId);
  await week.update({
    ...(dayDates ? { dayDates: { ...week.dayDates, ...dayDates } } : {}),
    ...(cardioLog ? { cardioLog: { ...week.cardioLog, ...cardioLog } } : {}),
  });
}

function serializeExercise(row, details) {
  const logged = Array.from({ length: row.sets }, (_, i) => row.logged?.[i] ?? { load: null, reps: null });
  return {
    id: row.id,
    day: row.day,
    position: row.position,
    muscle: row.muscle,
    exercise: row.exercise,
    sets: row.sets,
    reps: row.reps,
    rir: row.rir,
    coachNotes: row.coachNotes,
    symbol: row.symbol,
    logged,
    clientNotes: row.clientNotes,
    movement: details?.movement ?? null,
    description: details?.description ?? null,
    ...exerciseSummary(logged),
  };
}

/** Plan completo con todo lo que las hojas Semana, Volumen, Progreso y Cardio calculaban. */
export function buildTrainingView(plan, catalog) {
  if (!plan) return null;

  const split = Array.from({ length: 7 }, (_, i) => plan.split?.[i] || REST);
  const trainingDays = split.filter((session) => session !== REST).length;
  const protocols = new Map(catalog.cardioProtocols.map((p) => [p.name, p]));
  const warmups = new Map(catalog.warmupProtocols.map((p) => [p.name, p]));
  // Lo que el coach definió en el catálogo para cada ejercicio (se busca por nombre).
  const exerciseDetails = new Map(catalog.muscles.flatMap((muscle) => muscle.exercises.map((e) => [e.name, e])));

  const cardio = split.map((session, i) => {
    const day = plan.cardio?.[i] ?? {};
    const protocol = protocols.get(day.protocol);
    return {
      day: i + 1,
      session,
      protocol: day.protocol || '',
      moment: day.moment || '',
      notes: day.notes || '',
      type: protocol?.type ?? null,
      durationMin: protocol?.durationMin ?? null,
      intervals: protocol?.intervals ?? null,
      rpe: protocol?.rpe ?? null,
      hrZone: protocol?.hrZone ?? null,
      instructions: protocol?.notes ?? null,
    };
  });
  const plannedMinutes = cardio.map((day) => day.durationMin || 0);

  const warmup = split.map((session, i) => {
    const day = plan.warmup?.[i] ?? {};
    const protocol = warmups.get(day.protocol);
    return {
      day: i + 1,
      session,
      protocol: day.protocol || '',
      notes: day.notes || '',
      general: protocol?.general ?? null,
      mobility: protocol?.mobility ?? null,
      activation: protocol?.activation ?? null,
      rampUpSets: protocol?.rampUpSets ?? null,
      duration: protocol?.duration ?? null,
    };
  });

  const weeks = (plan.weeks ?? []).map((week) => {
    const exercises = week.exercises.map((row) => serializeExercise(row, exerciseDetails.get(row.exercise)));
    const doneMinutes = plannedMinutes.map((_, i) => week.cardioLog?.[i + 1] ?? null);
    return {
      id: week.id,
      number: week.number,
      dayDates: week.dayDates,
      days: split.map((session, i) => {
        const rows = exercises.filter((e) => e.day === i + 1);
        return {
          day: i + 1,
          name: WEEK_DAYS[i],
          session,
          date: week.dayDates?.[i + 1] ?? null,
          setsPlanned: rows.reduce((sum, e) => sum + e.sets, 0),
          setsDone: rows.reduce((sum, e) => sum + e.setsDone, 0),
          cardioDoneMin: doneMinutes[i],
          exercises: rows,
        };
      }),
      volume: weeklyVolume(exercises.map((e) => ({ day: e.day, muscle: e.muscle, plannedSets: e.sets, sets: e.logged }))),
      cardio: cardioCompliance(plannedMinutes, doneMinutes),
    };
  });

  // Volumen: una fila por músculo con sus series por semana.
  const muscles = [...new Set(weeks.flatMap((week) => week.volume.map((v) => v.muscle)))];
  const volume = muscles.map((muscle) => ({
    muscle,
    priority: musclePriority(muscle, plan.priorities ?? {}),
    weeks: weeks.map((week) => {
      const entry = week.volume.find((v) => v.muscle === muscle);
      return { number: week.number, planned: entry?.plannedSets ?? 0, done: entry?.doneSets ?? 0, frequency: entry?.frequency ?? 0 };
    }),
  }));

  // Progreso: una fila por ejercicio (día + nombre) con e1RM y tonelaje por semana.
  const progressRows = new Map();
  for (const week of weeks) {
    for (const day of week.days) {
      for (const exercise of day.exercises) {
        const key = `${exercise.day}|${exercise.exercise}`;
        if (!progressRows.has(key)) {
          progressRows.set(key, { day: exercise.day, muscle: exercise.muscle, exercise: exercise.exercise, reps: exercise.reps, byWeek: new Map() });
        }
        progressRows.get(key).byWeek.set(week.number, { e1rm: exercise.e1rm, tonnage: exercise.tonnage });
      }
    }
  }
  const progress = [...progressRows.values()].map(({ byWeek, ...row }) => {
    let previous = null;
    return {
      ...row,
      weeks: weeks.map((week) => {
        const entry = byWeek.get(week.number) ?? { e1rm: null, tonnage: null };
        const result = { number: week.number, ...entry, e1rmTrend: trend(entry.e1rm, previous?.e1rm), tonnageTrend: trend(entry.tonnage, previous?.tonnage) };
        if (entry.e1rm !== null) previous = entry;
        return result;
      }),
    };
  });

  return {
    id: plan.id,
    name: plan.name,
    objective: plan.objective,
    blockPhase: plan.blockPhase,
    blockStart: plan.blockStart,
    blockWeeks: plan.blockWeeks,
    blockEnd: blockEndDate(plan.blockStart, plan.blockWeeks),
    split,
    trainingDays,
    priorities: plan.priorities,
    macroBlocks: scheduleBlocks(plan.blockStart, plan.macroBlocks ?? []),
    steps: {
      ...plan.steps,
      weeklyAverage:
        plan.steps?.trainingDay && plan.steps?.restDay
          ? weeklyStepsTarget({ trainingDaySteps: plan.steps.trainingDay, restDaySteps: plan.steps.restDay, trainingDays })
          : null,
    },
    cardio,
    cardioMinutesPerWeek: plannedMinutes.reduce((a, b) => a + b, 0),
    cardioSessions: cardio.filter((day) => day.durationMin > 0).length,
    warmup,
    weeks,
    volume,
    progress,
  };
}
