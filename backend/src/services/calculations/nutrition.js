// Cálculo nutricional: gasto, objetivo, macros, reparto por comida, hidratación,
// suplementos y seguimiento. Reproduce las hojas 1, 2, 6, 7 y 8 de la plantilla de nutrición.

import { round } from '../../utils/rounding.js';

export const ACTIVITY_LEVELS = [
  { key: 'sedentary', label: 'Sedentario', factor: 1.2 },
  { key: 'light', label: 'Ligero: 1–3 días/sem', factor: 1.375 },
  { key: 'moderate', label: 'Moderado: 3–5 días/sem', factor: 1.55 },
  { key: 'high', label: 'Alto: 6–7 días/sem', factor: 1.725 },
  { key: 'very_high', label: 'Muy alto / trabajo físico', factor: 1.9 },
];

export const GOALS = ['Mantenimiento', 'Definición', 'Minicut', 'Superávit'];

/** Proporción de la proteína que debe ser vegetal; null = sin regla. */
export const DIET_TYPES = [
  { key: 'omnivore', label: 'Omnívora', vegetableProteinShare: null },
  { key: 'flexitarian_70', label: 'Flexitariana 70 % vegetal / 30 % animal', vegetableProteinShare: 0.7 },
  { key: 'flexitarian_50', label: 'Flexitariana 50 % vegetal / 50 % animal', vegetableProteinShare: 0.5 },
  { key: 'pescatarian', label: 'Pescetariana', vegetableProteinShare: null },
  { key: 'vegetarian', label: 'Vegetariana (con huevo y lácteos)', vegetableProteinShare: null },
  { key: 'vegan', label: 'Vegana', vegetableProteinShare: 1 },
];

const KCAL_PER_KG = 7700;

/** Tasa metabólica basal. `formula`: 'mifflin' (por defecto) o 'harris' (Harris-Benedict revisada). */
export function basalMetabolicRate({ sex, age, weightKg, heightCm, formula = 'mifflin' }) {
  const female = sex === 'female';
  if (formula === 'harris') {
    return female
      ? 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * age
      : 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (female ? -161 : 5);
}

export function energyTargets({ bmr, activityFactor, adjustmentKcal = 0, weightKg }) {
  const maintenanceKcal = round(bmr * activityFactor);
  const weeklyChangeKg = (adjustmentKcal * 7) / KCAL_PER_KG;
  return {
    maintenanceKcal,
    targetKcal: maintenanceKcal + adjustmentKcal,
    weeklyChangeKg,
    weeklyChangePct: weightKg ? weeklyChangeKg / weightKg : 0,
    fourWeekChangeKg: weeklyChangeKg * 4,
  };
}

/** Proteína por kg, grasa como % de las calorías y carbohidratos con lo que resta. */
export function macroTargets({ targetKcal, weightKg, proteinPerKg, fatPct }) {
  const proteinG = round(proteinPerKg * weightKg);
  const fatG = round((targetKcal * fatPct) / 9);
  const carbsG = round((targetKcal - proteinG * 4 - fatG * 9) / 4);
  return { proteinG, fatG, carbsG, kcal: proteinG * 4 + fatG * 9 + carbsG * 4, carbsNegative: carbsG < 0 };
}

/**
 * Calorías del día de entreno y de descanso. Con ciclado, el entreno sube y el descanso baja,
 * pero el promedio semanal sigue siendo el objetivo; solo se mueven los carbohidratos.
 */
export function weeklyCycle({ targetKcal, proteinG, fatG, trainingDays, cycling = false, extraTrainingKcal = 0 }) {
  const restDays = 7 - trainingDays;
  const trainingKcal = cycling ? round(targetKcal + (extraTrainingKcal * restDays) / 7) : targetKcal;
  const restKcal = cycling ? round(targetKcal - (extraTrainingKcal * trainingDays) / 7) : targetKcal;
  const carbs = (kcal) => Math.max(0, round((kcal - proteinG * 4 - fatG * 9) / 4));
  return {
    trainingDays,
    restDays,
    training: { kcal: trainingKcal, proteinG, fatG, carbsG: carbs(trainingKcal) },
    rest: { kcal: restKcal, proteinG, fatG, carbsG: carbs(restKcal) },
  };
}

/**
 * Reparte los macros del día entre las comidas. La proteína va pareja; en pre y post entreno
 * va más carbohidrato (x1.5) y menos grasa (x0.5). Un reparto manual (% por comida) sustituye
 * al automático macro por macro y se respeta tal cual: si suma menos de 100 %, lo que falta queda
 * sin asignar (el plan lo avisa); si suma más, se ajusta a 100 %. Los carbohidratos del intra se
 * restan del día de entreno.
 *
 * @param {object} p
 * @param {number} p.mealCount            Número de comidas.
 * @param {number|null} p.preWorkoutMeal  Número de comida (1..n) o null.
 * @param {number|null} p.postWorkoutMeal Número de comida (1..n) o null.
 * @param {Array<{proteinPct?:number, carbsPct?:number, fatPct?:number}>} [p.manual]
 */
export function distributeMeals({ mealCount, preWorkoutMeal = null, postWorkoutMeal = null, manual = [], cycle, intraCarbsG = 0 }) {
  const meals = Array.from({ length: mealCount }, (_, i) => {
    const number = i + 1;
    const pre = number === preWorkoutMeal;
    const post = number === postWorkoutMeal;
    const aroundWorkout = pre || post;
    return {
      number,
      moment: pre && post ? 'Pre/Post' : pre ? 'Pre' : post ? 'Post' : '',
      weights: { proteinG: 1, carbsG: aroundWorkout ? 1.5 : 1, fatG: aroundWorkout ? 0.5 : 1 },
    };
  });

  const shares = (macro, manualKey) => {
    const hasManual = manual.some((m) => typeof m?.[manualKey] === 'number');
    const raw = meals.map((meal, i) => (hasManual ? Number(manual[i]?.[manualKey]) || 0 : meal.weights[macro]));
    const sum = raw.reduce((a, b) => a + b, 0);
    const total = hasManual ? Math.max(100, sum) : sum;
    return raw.map((value) => (total ? value / total : 0));
  };

  const protein = shares('proteinG', 'proteinPct');
  const carbs = shares('carbsG', 'carbsPct');
  const fat = shares('fatG', 'fatPct');
  const trainingCarbs = Math.max(0, cycle.training.carbsG - intraCarbsG);

  return meals.map(({ number, moment }, i) => ({
    number,
    moment,
    share: { protein: protein[i], carbs: carbs[i], fat: fat[i] },
    training: { proteinG: cycle.training.proteinG * protein[i], carbsG: trainingCarbs * carbs[i], fatG: cycle.training.fatG * fat[i] },
    rest: { proteinG: cycle.rest.proteinG * protein[i], carbsG: cycle.rest.carbsG * carbs[i], fatG: cycle.rest.fatG * fat[i] },
  }));
}

/** Meta de fibra: 14 g por cada 1,000 kcal (IOM 2005). */
export function fiberGoalG(kcal) {
  return round((14 * kcal) / 1000);
}

/** Sudoración medida (L/h) con la prueba de peso antes y después de entrenar. */
export function sweatRate({ weightBeforeKg, weightAfterKg, fluidIntakeL, durationMin }) {
  if (![weightBeforeKg, weightAfterKg, fluidIntakeL, durationMin].every((v) => typeof v === 'number') || !durationMin) return null;
  return (weightBeforeKg - weightAfterKg + fluidIntakeL) / (durationMin / 60);
}

export function hydration({ sex, weightKg, sessionMin, sweatRateLPerH }) {
  const restDayL = sex === 'female' ? 1.6 : 2;
  return {
    restDayL,
    trainingDayL: restDayL + (sweatRateLPerH * sessionMin) / 60,
    preWorkoutMl: { min: round(weightKg * 5, -1), max: round(weightKg * 7, -1) },
    maxLossKg: weightKg * 0.02,
    perKgLostL: { min: 1.25, max: 1.5 },
  };
}

const PER_KG_UNITS = { 'mg/kg': 'mg', 'g/kg': 'g', 'ml/kg': 'ml' };

/** Dosis recomendada: si la unidad es por kg se calcula con el peso del cliente; si no, se muestra el texto de la base. */
export function supplementDose(supplement, weightKg) {
  const unit = PER_KG_UNITS[supplement.doseUnit];
  if (!unit) return supplement.doseText;
  const min = round(supplement.doseMin * weightKg);
  const max = round(supplement.doseMax * weightKg);
  return min === max ? `${min} ${unit}` : `${min}–${max} ${unit}`;
}

/**
 * Seguimiento del peso en ayunas: promedio de cada semana, cambio contra la anterior y
 * peso esperado según el ajuste de calorías. `weeks` es una lista de listas de pesos (kg).
 */
export function weightTracking(weeks, weeklyChangeKg) {
  const averages = weeks.map((days) => {
    const values = days.filter((v) => typeof v === 'number');
    return values.length ? round(values.reduce((a, b) => a + b, 0) / values.length, 2) : null;
  });
  const baseline = averages[0];
  return averages.map((average, i) => {
    const previous = i > 0 ? averages[i - 1] : null;
    const changeKg = average !== null && previous !== null ? average - previous : null;
    return {
      week: i + 1,
      average,
      changeKg,
      changePct: changeKg !== null ? changeKg / previous : null,
      expected: baseline !== null ? round(baseline + weeklyChangeKg * i, 2) : null,
    };
  });
}
