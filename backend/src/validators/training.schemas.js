import { z } from 'zod';
import { number, optionalDate, requiredText, text } from './common.schemas.js';

const week = (item) => z.array(item).length(7, 'Deben ser los 7 días de la semana');
const muscles = z.array(z.string().trim().max(80)).max(4).default([]);

export const trainingPlanBody = z
  .object({
    name: requiredText(120),
    objective: z.object({ primary: text(300), secondary: text(300), startingPoint: text(), trajectory: text() }),
    blockPhase: text(30),
    blockStart: optionalDate,
    blockWeeks: number(1, 26),
    split: week(z.string().trim().max(40).transform((v) => v || 'Descanso')),
    priorities: z.object({
      p1: muscles,
      p2: muscles,
      p3: muscles,
      maintenance: muscles,
      // Series/sem, frecuencia y estrategia por nivel de prioridad.
      notes: z.partialRecord(z.enum(['p1', 'p2', 'p3', 'maintenance']), z.object({ sets: text(20), frequency: text(20), strategy: text(500) }).partial()).default({}),
    }),
    macroBlocks: z.array(z.object({ phase: text(30), weeks: number(1, 52), focus: text(200), notes: text(500) })).max(12),
    steps: z.object({ trainingDay: number(0, 100000), restDay: number(0, 100000) }),
    cardio: week(z.object({ protocol: text(120), moment: text(40), notes: text(500) })),
    warmup: week(z.object({ protocol: text(120), notes: text(500) })),
  })
  .partial();

export const weekPrescriptionBody = z.object({
  exercises: z
    .array(
      z.object({
        id: z.uuid().optional(),
        day: z.number().int().min(1).max(7),
        muscle: requiredText(80, 'Elige el músculo'),
        exercise: requiredText(160, 'Elige el ejercicio'),
        sets: z.number().int().min(1, 'Mínimo 1 serie').max(10, 'Máximo 10 series'),
        reps: text(30),
        rir: number(0, 5),
        coachNotes: text(500),
        symbol: text(12),
      }),
    )
    .max(200),
});

export const exerciseLogBody = z.object({
  logged: z.array(z.object({ load: number(0, 1500), reps: number(0, 200) })).max(10).optional(),
  clientNotes: text(1000).optional(),
});

const byDay = (value) => z.partialRecord(z.enum(['1', '2', '3', '4', '5', '6', '7']), value);

export const weekLogBody = z.object({
  dayDates: byDay(optionalDate).optional(),
  cardioLog: byDay(number(0, 600)).optional(),
});
