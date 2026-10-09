import { z } from 'zod';
import { SMAE_KEYS } from '../services/calculations/equivalents.js';
import { number, optionalDate, text } from './common.schemas.js';

/** Máximo de comidas al día que admite un plan. */
const MAX_MEALS = 8;
/** Alimentos adicionales por comida (fuera del dietocálculo). */
const MAX_EXTRAS = 2;

const foodId = z.number().int().positive().nullish().transform((v) => v ?? null);
const group = z.enum(SMAE_KEYS);
const portions = z.number().min(0).max(60);

const inputs = z.object({
  weightKg: number(25, 350),
  formula: z.enum(['mifflin', 'harris']),
  activity: z.enum(['sedentary', 'light', 'moderate', 'high', 'very_high']),
  dietType: z.enum(['omnivore', 'flexitarian_70', 'flexitarian_50', 'pescatarian', 'vegetarian', 'vegan']),
  goal: z.string().trim().max(40),
  adjustmentKcal: z.number().min(-2000).max(2000),
  proteinPerKg: z.number().min(0.5, 'Mínimo 0.5 g/kg').max(4, 'Máximo 4 g/kg'),
  fatPct: z.number().min(0.1, 'Mínimo 10 %').max(0.6, 'Máximo 60 %'),
  // Dietocálculo: porciones al día de cada grupo de alimentos.
  portions: z.partialRecord(group, portions).default({}),
  mealCount: z.number().int().min(1).max(MAX_MEALS),
  mealsMeta: z
    .array(z.object({ name: z.string().trim().min(1).max(40), time: z.string().trim().max(10).default('') }))
    .min(1)
    .max(MAX_MEALS),
});

const meal = z.object({
  // Cada renglón: cuántas porciones de un grupo van en esta comida y con qué alimento.
  items: z.array(z.object({ group, portions, foodId })).max(60).default([]),
  // Alimentos adicionales: no cuentan para el dietocálculo y llevan su nota ("solo días de entreno"…).
  extras: z.array(z.object({ foodId, portions: z.number().min(0).max(30).default(1), note: text(200) })).max(MAX_EXTRAS).default([]),
  // Recomendaciones de preparación (opcional).
  notes: text(3000),
});

export const nutritionPlanBody = z.object({
  startDate: optionalDate,
  allowClientSwaps: z.boolean().default(true),
  inputs,
  meals: z.array(meal).max(MAX_MEALS).default([]),
  intra: z.object({ foodId, carbsG: number(0, 200) }).default({ foodId: null, carbsG: null }),
  hydration: z
    .object({
      sessionMin: z.number().min(0).max(600).default(75),
      sweatRateLPerH: z.number().min(0).max(5).default(0.8),
      test: z.object({ weightBeforeKg: number(25, 350), weightAfterKg: number(25, 350), fluidIntakeL: number(0, 10), durationMin: number(1, 600) }).partial().default({}),
    })
    .default({ sessionMin: 75, sweatRateLPerH: 0.8, test: {} }),
  supplements: z.array(z.object({ supplementId: z.number().int().positive(), assignedDose: text(120), timing: text(300) })).max(30).default([]),
});
