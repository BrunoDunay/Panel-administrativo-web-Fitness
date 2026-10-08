import { z } from 'zod';
import { isoDate, number, optionalDate, requiredText, text } from './common.schemas.js';

// Historia clínica: los mismos apartados de la hoja "Historia clínica".
const profile = z
  .object({
    health: z.object({ allergies: text(), medicalClearance: text(40), chronicDiseases: text(), surgeries: text(), injuries: text(), medications: text() }).partial(),
    logistics: z
      .object({
        planType: text(40),
        startDate: optionalDate,
        paymentDate: optionalDate,
        daysPerWeek: number(1, 7),
        sessionMinutes: number(10, 300),
        trainingPlace: text(40),
        equipment: text(),
      })
      .partial(),
    lifestyle: z
      .object({
        sleepHours: number(0, 24),
        stressLevel: number(1, 5),
        dailySteps: number(0, 100000),
        workActivity: text(40),
        alcoholTobacco: text(),
        trainingSchedule: text(120),
        notes: text(),
      })
      .partial(),
    experience: z
      .object({ yearsTraining: number(0, 80), level: text(40), masteredExercises: text(), avoidedExercises: text(), bestLifts: text(), previousPrograms: text() })
      .partial(),
    nutrition: z
      .object({ mealsPerDay: number(1, 12), tracksNutrition: z.boolean().nullish(), restrictions: text(), notes: text(), supplements: text(), hydration: text() })
      .partial(),
  })
  .partial();

export const clientBody = z.object({
  fullName: requiredText(160, 'Escribe el nombre del cliente'),
  birthDate: optionalDate,
  sex: z.enum(['male', 'female']).nullish().transform((v) => v ?? null),
  heightCm: number(80, 250),
  initialWeightKg: number(25, 350),
  city: text(120),
  occupation: text(120),
  phone: text(30),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .nullish()
    .transform((v) => v || null)
    .refine((v) => v === null || z.email().safeParse(v).success, 'Escribe un email válido'),
  status: z.enum(['active', 'paused', 'archived']).default('active'),
  portalEnabled: z.boolean().default(true),
  profile: profile.default({}),
  coachNotes: text(10000),
});

export const clientListQuery = z.object({
  search: z.string().trim().max(80).optional(),
  status: z.enum(['active', 'paused', 'archived', 'all']).default('active'),
});

// ---- Seguimiento (lo llenan el cliente y el coach) ----

export const checkinParams = z.object({ weekNumber: z.coerce.number().int().min(1).max(520) });
export const dateParams = z.object({ date: isoDate });

export const checkinBody = z.object({
  date: optionalDate,
  sessions: z
    .array(z.object({ day: z.number().int().min(1).max(7), rpe: number(1, 10), durationMin: number(10, 300), enjoyment: number(1, 5) }))
    .max(7)
    .default([]),
  ratings: z.partialRecord(z.enum(['energy', 'sleep', 'soreness', 'stress', 'mood', 'nutrition', 'injury']), number(1, 5)).default({}),
  answers: z.partialRecord(z.enum(['discomfort', 'nutrition', 'stress', 'selfPerception', 'comments']), text(3000)).default({}),
  avgSteps: number(0, 100000),
  avgWeightKg: number(25, 350),
});

export const weightBody = z.object({ weightKg: number(25, 350), waistCm: number(30, 250) });

// ---- Pagos (solo coach) ----

export const paymentParams = z.object({ paymentId: z.uuid() });

export const dueDateBody = z.object({ dueDate: optionalDate });

export const paymentBody = z.object({
  paidOn: isoDate,
  amount: number(0, 1000000),
  method: text(40),
  notes: text(500),
  // Vacío = se calcula con el tipo de plan.
  nextDueDate: optionalDate,
});

export const measurementBody = z.object({
  values: z.record(z.string().max(30), number(0, 500)).default({}),
  photosLink: text(500),
  notes: text(),
});
