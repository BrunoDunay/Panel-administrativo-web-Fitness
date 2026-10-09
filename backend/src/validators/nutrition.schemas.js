import { z } from 'zod';
import { number, optionalDate, text } from './common.schemas.js';

/** Máximo de comidas al día que admite un plan. */
const MAX_MEALS = 8;

const foodId = z.number().int().positive().nullish().transform((v) => v ?? null);
const pct = number(0, 100);
const swaps = z.array(z.number().int().positive()).max(3);

const inputs = z.object({
  weightKg: number(25, 350),
  formula: z.enum(['mifflin', 'harris']),
  activity: z.enum(['sedentary', 'light', 'moderate', 'high', 'very_high']),
  dietType: z.enum(['omnivore', 'flexitarian_70', 'flexitarian_50', 'pescatarian', 'vegetarian', 'vegan']),
  goal: z.string().trim().max(40),
  adjustmentKcal: z.number().min(-2000).max(2000),
  proteinPerKg: z.number().min(0.5, 'Mínimo 0.5 g/kg').max(4, 'Máximo 4 g/kg'),
  fatPct: z.number().min(0.1, 'Mínimo 10 %').max(0.6, 'Máximo 60 %'),
  cycling: z.boolean(),
  extraTrainingKcal: z.number().min(0).max(1500),
  trainingDays: z.array(z.boolean()).length(7),
  mealCount: z.number().int().min(1).max(MAX_MEALS),
  preWorkoutMeal: z.number().int().min(1).max(MAX_MEALS).nullable(),
  postWorkoutMeal: z.number().int().min(1).max(MAX_MEALS).nullable(),
  roundTo: z.union([z.literal(1), z.literal(5), z.literal(10)]),
  mealsMeta: z
    .array(z.object({ name: z.string().trim().min(1).max(40), time: z.string().trim().max(10).default(''), manual: z.object({ proteinPct: pct, carbsPct: pct, fatPct: pct }).partial().default({}) }))
    .min(6)
    .max(MAX_MEALS),
});

const meal = z.object({
  style: z.enum(['Mixto', 'Dulce', 'Salado']).default('Mixto'),
  protein1: foodId,
  protein2: foodId,
  carb1: foodId,
  carb2: foodId,
  fat: foodId,
  vegetable: foodId,
  vegetablePortions: z.number().min(0).max(10).default(1),
  fruit: foodId,
  fruitPortions: z.number().min(0).max(10).default(1),
  swaps: z.partialRecord(z.enum(['protein1', 'protein2', 'carb1', 'carb2', 'fat', 'vegetable', 'fruit']), swaps).default({}),
});

const SLOT_KEYS = ['protein1', 'protein2', 'carb1', 'carb2', 'fat', 'vegetable', 'fruit'];

/** Para evaluar las opciones de un renglón: el borrador, la comida, el renglón y los alimentos candidatos. */
export const nutritionOptionsBody = z.object({
  draft: z.lazy(() => nutritionPlanBody),
  mealIndex: z.number().int().min(0).max(MAX_MEALS - 1),
  slot: z.enum(SLOT_KEYS),
  foodIds: z.array(z.number().int().positive()).max(400),
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
