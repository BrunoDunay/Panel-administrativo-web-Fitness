// Los valores esperados son los que muestra la plantilla "Plantilla Nutricion GCN" con su
// cliente de ejemplo (hombre, 30 años, 80 kg, 175 cm, moderado, definición −500 kcal).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  basalMetabolicRate,
  distributeMeals,
  energyTargets,
  fiberGoalG,
  hydration,
  macroTargets,
  supplementDose,
  sweatRate,
  weeklyCycle,
  weightTracking,
} from '../src/services/calculations/nutrition.js';
import { groceryList, householdMeasure, intraWorkoutAmount, solveMeal, swapGrams } from '../src/services/calculations/meal-plan.js';

const load = (file) => JSON.parse(readFileSync(new URL(`../seeders/data/${file}`, import.meta.url), 'utf8'));
const foods = load('foods.json');
const supplements = load('supplements.json');
const food = (name) => foods.find((f) => f.name === name);
const supplement = (name) => supplements.find((s) => s.name === name);

const client = { sex: 'male', age: 30, weightKg: 80, heightCm: 175 };
const bmr = basalMetabolicRate(client);
const energy = energyTargets({ bmr, activityFactor: 1.55, adjustmentKcal: -500, weightKg: 80 });
const macros = macroTargets({ targetKcal: energy.targetKcal, weightKg: 80, proteinPerKg: 2.2, fatPct: 0.25 });
const cycle = weeklyCycle({ targetKcal: energy.targetKcal, ...macros, trainingDays: 4 });

describe('gasto y objetivo', () => {
  it('Mifflin-St Jeor', () => expect(bmr).toBe(1748.75));
  it('Harris-Benedict revisada', () => {
    expect(basalMetabolicRate({ ...client, formula: 'harris' })).toBeCloseTo(1829.637, 3);
    expect(basalMetabolicRate({ ...client, sex: 'female' })).toBe(1582.75);
  });
  it('mantenimiento, objetivo y cambio de peso esperado', () => {
    expect(energy.maintenanceKcal).toBe(2711);
    expect(energy.targetKcal).toBe(2211);
    expect(energy.weeklyChangeKg).toBeCloseTo(-0.4545, 4);
    expect(energy.weeklyChangePct).toBeCloseTo(-0.005682, 6);
    expect(energy.fourWeekChangeKg).toBeCloseTo(-1.8182, 4);
  });
});

describe('macros', () => {
  it('proteína por kg, grasa por % y carbos con lo que resta', () => {
    expect(macros).toMatchObject({ proteinG: 176, fatG: 61, carbsG: 240, kcal: 2213, carbsNegative: false });
  });
  it('avisa si los carbos quedan negativos', () => {
    expect(macroTargets({ targetKcal: 1200, weightKg: 100, proteinPerKg: 3, fatPct: 0.4 }).carbsNegative).toBe(true);
  });
});

describe('calorías en la semana', () => {
  it('sin ciclado, entreno y descanso son iguales', () => {
    expect(cycle.training).toEqual({ kcal: 2211, proteinG: 176, fatG: 61, carbsG: 240 });
    expect(cycle.rest).toEqual(cycle.training);
  });
  it('con ciclado el promedio semanal se conserva', () => {
    const cycled = weeklyCycle({ targetKcal: 2211, ...macros, trainingDays: 4, cycling: true, extraTrainingKcal: 400 });
    expect(cycled.training.kcal).toBe(2382);
    expect(cycled.rest.kcal).toBe(1982);
    expect((cycled.training.kcal * 4 + cycled.rest.kcal * 3) / 7).toBeCloseTo(2211, 0);
    expect(cycled.training.carbsG).toBe(282);
    expect(cycled.rest.carbsG).toBe(182);
  });
});

describe('reparto por comida', () => {
  it('5 comidas sin pre/post: partes iguales y el intra se resta del entreno', () => {
    const meals = distributeMeals({ mealCount: 5, cycle, intraCarbsG: 30 });
    expect(meals).toHaveLength(5);
    expect(meals[0].rest.proteinG).toBeCloseTo(35.2);
    expect(meals[0].rest.carbsG).toBeCloseTo(48);
    expect(meals[0].rest.fatG).toBeCloseTo(12.2);
    expect(meals[0].training.carbsG).toBeCloseTo(42);
  });
  it('pre y post entreno llevan más carbo y menos grasa', () => {
    const meals = distributeMeals({ mealCount: 4, preWorkoutMeal: 2, postWorkoutMeal: 3, cycle });
    expect(meals.map((m) => m.moment)).toEqual(['', 'Pre', 'Post', '']);
    expect(meals[1].share.carbs).toBeCloseTo(0.3);
    expect(meals[1].share.fat).toBeCloseTo(1 / 6);
    expect(meals[1].share.protein).toBeCloseTo(0.25);
  });
  it('el reparto manual se respeta tal cual y solo se ajusta si pasa de 100 %', () => {
    const short = distributeMeals({ mealCount: 2, cycle, manual: [{ carbsPct: 30 }, { carbsPct: 30 }] });
    expect(short.map((meal) => meal.share.carbs)).toEqual([0.3, 0.3]);
    const meals = distributeMeals({ mealCount: 2, cycle, manual: [{ carbsPct: 90 }, { carbsPct: 90 }] });
    expect(meals[0].share.carbs).toBe(0.5);
    expect(meals[0].share.protein).toBe(0.5);
  });
});

describe('plan alimenticio', () => {
  const desayuno = (target) =>
    solveMeal({
      target,
      proteins: [food('Clara de huevo'), food('Huevo entero fresco')],
      carbs: [food('Avena en hojuelas')],
      fat: food('Aguacate hass'),
      fruit: { food: food('Fresa entera'), portions: 1 },
    });
  const grams = (meal) => Object.fromEntries(meal.items.map((i) => [i.food.name, i.grams]));

  it('desayuno del día de descanso', () => {
    const meal = desayuno({ proteinG: 35.2, carbsG: 48, fatG: 12.2 });
    expect(grams(meal)).toEqual({
      'Clara de huevo': 120,
      'Huevo entero fresco': 105,
      'Avena en hojuelas': 45,
      'Aguacate hass': 0,
      'Fresa entera': 205,
    });
    expect(Math.round(meal.totals.proteinG)).toBe(35);
    expect(Math.round(meal.totals.carbsG)).toBe(48);
    expect(Math.round(meal.totals.fatG)).toBe(14);
    expect(Math.round(meal.totals.kcal)).toBe(457);
  });
  it('desayuno del día de entreno', () => {
    expect(grams(desayuno({ proteinG: 35.2, carbsG: 42, fatG: 12.2 }))).toMatchObject({
      'Clara de huevo': 130,
      'Huevo entero fresco': 110,
      'Avena en hojuelas': 35,
    });
  });
  it('flexitariana: reparte la proteína entre vegetal y animal', () => {
    const meal = solveMeal({
      target: { proteinG: 40, carbsG: 0, fatG: 0 },
      proteins: [food('Tofu, firme'), food('Pechuga de pollo sin piel cocida')],
      vegetableProteinShare: 0.7,
      roundTo: 1,
    });
    expect(meal.totals.vegetableProteinG / meal.totals.proteinG).toBeCloseTo(0.7, 1);
  });
  it('medida casera', () => {
    expect(householdMeasure(food('Clara de huevo'), 120)).toBe('3.75 pieza');
    expect(householdMeasure(food('Avena en hojuelas'), 45)).toBe('1.25 taza');
    expect(householdMeasure(food('Fresa entera'), 205)).toBe('17 pieza med');
  });
  it('intra-entreno', () => expect(intraWorkoutAmount(food('Gatorade'), 30)).toBe(500));
});

describe('cambios y súper', () => {
  it('equivalencias', () => {
    expect(swapGrams({ from: food('Arroz cocido'), to: food('Papa cocida'), grams: 100, basis: 'carbs', roundTo: 1 })).toBe(140);
    expect(swapGrams({ from: food('Clara de huevo'), to: food('Pechuga de pollo sin piel cocida'), grams: 130, basis: 'protein' })).toBe(50);
  });
  it('lista del súper de la semana', () => {
    const list = groceryList(
      [
        { food: food('Clara de huevo'), trainingGrams: 130, restGrams: 120 },
        { food: food('Huevo entero fresco'), trainingGrams: 110, restGrams: 105 },
      ],
      { trainingDays: 4 },
    );
    expect(list).toEqual([
      { name: 'Clara de huevo', grams: 880, kg: 0.88, measure: '26.5 pieza' },
      { name: 'Huevo entero fresco', grams: 755, kg: 0.755, measure: '17 pieza' },
    ]);
  });
});

describe('hidratación, suplementos y seguimiento', () => {
  it('agua del día y del entreno', () => {
    const h = hydration({ sex: 'male', weightKg: 80, sessionMin: 75, sweatRateLPerH: 0.8 });
    expect(h.restDayL).toBe(2);
    expect(h.trainingDayL).toBeCloseTo(3);
    expect(h.preWorkoutMl).toEqual({ min: 400, max: 560 });
    expect(h.maxLossKg).toBeCloseTo(1.6);
    expect(hydration({ sex: 'female', weightKg: 60, sessionMin: 60, sweatRateLPerH: 0.5 }).restDayL).toBe(1.6);
  });
  it('prueba de sudoración', () => {
    expect(sweatRate({ weightBeforeKg: 80, weightAfterKg: 79.4, fluidIntakeL: 0.5, durationMin: 60 })).toBeCloseTo(1.1);
    expect(sweatRate({ weightBeforeKg: 80 })).toBeNull();
  });
  it('dosis recomendada con el peso del cliente', () => {
    expect(supplementDose(supplement('Cafeína'), 80)).toBe('240–480 mg');
    expect(supplementDose(supplement('Proteína aislada (whey u otra)'), 80)).toBe('24–32 g');
    expect(supplementDose(supplement('Creatina monohidratada'), 80)).toBe('3–5 g/día (carga opcional: 0.3 g/kg/día por 5–7 días)');
  });
  it('meta de fibra', () => expect(fiberGoalG(2211)).toBe(31));
  it('peso real contra esperado', () => {
    const rows = weightTracking([[80, 80.4, 79.9], [79.6, 79.5], []], energy.weeklyChangeKg);
    expect(rows[0]).toMatchObject({ average: 80.1, changeKg: null, expected: 80.1 });
    expect(rows[1].average).toBe(79.55);
    expect(rows[1].changeKg).toBeCloseTo(-0.55);
    expect(rows[1].expected).toBe(79.65);
    expect(rows[2]).toMatchObject({ average: null, changeKg: null, expected: 79.19 });
  });
});
