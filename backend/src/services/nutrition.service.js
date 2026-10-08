import { NutritionPlan } from '../models/index.js';
import { round } from '../utils/rounding.js';
import {
  ACTIVITY_LEVELS,
  DIET_TYPES,
  basalMetabolicRate,
  distributeMeals,
  energyTargets,
  fiberGoalG,
  hydration,
  macroTargets,
  supplementDose,
  sweatRate,
  weeklyCycle,
} from './calculations/nutrition.js';
import { groceryList, householdMeasure, intraWorkoutAmount, mealTotals, solveMeal, swapGrams } from './calculations/meal-plan.js';
import { ageOn } from './calculations/training.js';

export const DEFAULT_MEALS = [
  { name: 'Desayuno', time: '08:00' },
  { name: 'Colación AM', time: '11:00' },
  { name: 'Comida', time: '14:00' },
  { name: 'Colación PM', time: '17:00' },
  { name: 'Cena', time: '20:30' },
  { name: 'Colación noche', time: '22:30' },
  { name: 'Comida 7', time: '' },
  { name: 'Comida 8', time: '' },
];

export const DEFAULT_INPUTS = {
  weightKg: null,
  formula: 'mifflin',
  activity: 'moderate',
  dietType: 'omnivore',
  goal: 'Mantenimiento',
  adjustmentKcal: 0,
  proteinPerKg: 2,
  fatPct: 0.25,
  cycling: false,
  extraTrainingKcal: 400,
  trainingDays: [true, true, false, true, true, false, false],
  mealCount: 4,
  preWorkoutMeal: null,
  postWorkoutMeal: null,
  roundTo: 5,
  mealsMeta: DEFAULT_MEALS.map((meal) => ({ ...meal, manual: {} })),
};

/** Con qué macro se iguala cada tipo de alimento al hacer un cambio. */
const SLOTS = [
  { key: 'protein1', role: 'protein', label: 'Proteína 1', basis: 'protein' },
  { key: 'protein2', role: 'protein', label: 'Proteína 2', basis: 'protein' },
  { key: 'carb1', role: 'carb', label: 'Carbo 1', basis: 'carbs' },
  { key: 'carb2', role: 'carb', label: 'Carbo 2', basis: 'carbs' },
  { key: 'fat', role: 'fat', label: 'Grasa', basis: 'fat' },
  { key: 'vegetable', role: 'vegetable', label: 'Verdura', basis: 'kcal' },
  { key: 'fruit', role: 'fruit', label: 'Fruta', basis: 'carbs' },
];

export const findActiveNutritionPlan = (clientId) => NutritionPlan.findOne({ where: { clientId, isActive: true } });

export async function saveNutritionPlan(clientId, data) {
  const plan = await findActiveNutritionPlan(clientId);
  if (plan) return plan.update(data);
  return NutritionPlan.create({ ...data, clientId });
}

/**
 * Calcula todo el plan a partir de lo que el coach capturó. `plan` puede ser el registro
 * guardado o un borrador sin guardar (vista previa mientras edita).
 */
export function buildNutritionView(plan, client, catalog, today) {
  const inputs = { ...DEFAULT_INPUTS, ...(plan?.inputs ?? {}) };
  // Los planes guardados con 6 comidas se completan hasta el máximo actual.
  inputs.mealsMeta = DEFAULT_MEALS.map((meal, i) => inputs.mealsMeta?.[i] ?? { ...meal, manual: {} });
  const foods = new Map(catalog.foods.map((food) => [food.id, food]));
  const supplements = new Map(catalog.supplements.map((s) => [s.id, s]));
  const foodIcons = new Map(catalog.foods.map((food) => [food.name, food.icon]));

  const weightKg = inputs.weightKg ?? client.initialWeightKg;
  const age = client.birthDate ? ageOn(client.birthDate, today) : null;
  const missing = [
    !weightKg && 'peso',
    !client.heightCm && 'estatura',
    age === null && 'fecha de nacimiento',
    !client.sex && 'sexo',
  ].filter(Boolean);

  const base = {
    id: plan?.id ?? null,
    startDate: plan?.startDate ?? null,
    allowClientSwaps: plan?.allowClientSwaps ?? true,
    inputs,
    meals: plan?.meals ?? [],
    intra: plan?.intra ?? {},
    hydrationInputs: plan?.hydration ?? {},
    supplementInputs: plan?.supplements ?? [],
  };
  if (missing.length) return { ...base, ready: false, missing, computed: null };

  const activity = ACTIVITY_LEVELS.find((level) => level.key === inputs.activity) ?? ACTIVITY_LEVELS[2];
  const diet = DIET_TYPES.find((type) => type.key === inputs.dietType) ?? DIET_TYPES[0];
  const bmr = basalMetabolicRate({ sex: client.sex, age, weightKg, heightCm: client.heightCm, formula: inputs.formula });
  const energy = energyTargets({ bmr, activityFactor: activity.factor, adjustmentKcal: inputs.adjustmentKcal, weightKg });
  const macros = macroTargets({ targetKcal: energy.targetKcal, weightKg, proteinPerKg: inputs.proteinPerKg, fatPct: inputs.fatPct });
  const trainingDays = inputs.trainingDays.filter(Boolean).length;
  const cycle = weeklyCycle({
    targetKcal: energy.targetKcal,
    proteinG: macros.proteinG,
    fatG: macros.fatG,
    trainingDays,
    cycling: inputs.cycling,
    extraTrainingKcal: inputs.extraTrainingKcal,
  });

  const intraFood = foods.get(base.intra.foodId);
  const intraCarbsG = intraFood ? Number(base.intra.carbsG) || 0 : 0;
  const intraAmount = intraFood ? intraWorkoutAmount(intraFood, intraCarbsG) : 0;

  const distribution = distributeMeals({
    mealCount: inputs.mealCount,
    preWorkoutMeal: inputs.preWorkoutMeal,
    postWorkoutMeal: inputs.postWorkoutMeal,
    manual: inputs.mealsMeta.slice(0, inputs.mealCount).map((meal) => meal.manual ?? {}),
    cycle,
    intraCarbsG,
  });

  const groceryItems = [];
  const meals = distribution.map((target, index) => {
    const meta = inputs.mealsMeta[index] ?? DEFAULT_MEALS[index];
    const chosen = base.meals[index] ?? {};
    const pick = (key) => foods.get(chosen[key]) ?? null;
    const args = {
      proteins: [pick('protein1'), pick('protein2')],
      carbs: [pick('carb1'), pick('carb2')],
      fat: pick('fat'),
      vegetable: pick('vegetable') ? { food: pick('vegetable'), portions: chosen.vegetablePortions ?? 1 } : null,
      fruit: pick('fruit') ? { food: pick('fruit'), portions: chosen.fruitPortions ?? 1 } : null,
      vegetableProteinShare: diet.vegetableProteinShare,
      roundTo: inputs.roundTo,
    };
    const training = solveMeal({ ...args, target: target.training });
    const rest = solveMeal({ ...args, target: target.rest });
    const gramsOf = (solved, food) => solved.items.find((item) => item.food === food)?.grams ?? 0;

    const items = SLOTS.filter((slot) => pick(slot.key)).map((slot) => {
      const food = pick(slot.key);
      const trainingGrams = gramsOf(training, food);
      const restGrams = gramsOf(rest, food);
      groceryItems.push({ food, trainingGrams, restGrams });
      return {
        slot: slot.key,
        label: slot.label,
        foodId: food.id,
        name: food.name,
        icon: food.icon ?? null,
        trainingGrams,
        restGrams,
        trainingMeasure: householdMeasure(food, trainingGrams),
        restMeasure: householdMeasure(food, restGrams),
        swaps: (chosen.swaps?.[slot.key] ?? [])
          .map((id) => foods.get(id))
          .filter(Boolean)
          .map((to) => {
            const grams = (amount) => swapGrams({ from: food, to, grams: amount, basis: slot.basis, roundTo: inputs.roundTo });
            return {
              foodId: to.id,
              name: to.name,
              icon: to.icon ?? null,
              trainingGrams: grams(trainingGrams),
              restGrams: grams(restGrams),
              trainingMeasure: householdMeasure(to, grams(trainingGrams)),
              restMeasure: householdMeasure(to, grams(restGrams)),
            };
          }),
      };
    });

    return {
      number: target.number,
      name: meta?.name ?? `Comida ${target.number}`,
      time: meta?.time ?? '',
      moment: target.moment,
      style: chosen.style ?? 'Mixto',
      share: target.share,
      target: { training: target.training, rest: target.rest },
      totals: { training: training.totals, rest: rest.totals },
      items,
    };
  });

  const dayTotals = (kind) => {
    const totals = meals.reduce(
      (sum, meal) => {
        for (const key of Object.keys(sum)) sum[key] += meal.totals[kind][key];
        return sum;
      },
      { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, vegetableProteinG: 0 },
    );
    if (kind === 'training' && intraFood) {
      const intra = mealTotals([{ food: intraFood, grams: intraAmount }]);
      for (const key of Object.keys(totals)) totals[key] += intra[key];
    }
    return {
      ...totals,
      vegetableProteinPct: totals.proteinG ? totals.vegetableProteinG / totals.proteinG : null,
      fiberGoalG: fiberGoalG(cycle[kind].kcal),
    };
  };

  const hydrationInputs = { sessionMin: 75, sweatRateLPerH: 0.8, ...base.hydrationInputs };
  const measuredSweat = sweatRate(hydrationInputs.test ?? {});
  const water = hydration({
    sex: client.sex,
    weightKg,
    sessionMin: hydrationInputs.sessionMin,
    sweatRateLPerH: measuredSweat ?? hydrationInputs.sweatRateLPerH,
  });

  return {
    ...base,
    ready: true,
    missing: [],
    computed: {
      client: { weightKg, age, sex: client.sex, heightCm: client.heightCm },
      bmr: round(bmr, 2),
      activityFactor: activity.factor,
      ...energy,
      macros: {
        ...macros,
        proteinPerKg: macros.proteinG / weightKg,
        fatPerKg: macros.fatG / weightKg,
        carbsPerKg: macros.carbsG / weightKg,
      },
      vegetableProteinTarget: diet.vegetableProteinShare,
      cycle,
      week: inputs.trainingDays.map((trains, i) => ({ day: i + 1, trains, ...(trains ? cycle.training : cycle.rest) })),
      meals,
      dayTotals: { training: dayTotals('training'), rest: dayTotals('rest') },
      intra: intraFood
        ? {
            foodId: intraFood.id,
            name: intraFood.name,
            carbsG: intraCarbsG,
            amount: intraAmount,
            unit: /ml/.test(intraFood.portionUnit) ? 'ml' : 'g',
            measure: householdMeasure(intraFood, intraAmount),
          }
        : null,
      grocery: groceryList(groceryItems, { trainingDays, weeks: 1 }).map((item) => ({ ...item, icon: foodIcons.get(item.name) ?? null })),
      hydration: { ...water, measuredSweatRate: measuredSweat },
      supplements: base.supplementInputs
        .map((entry) => ({ entry, supplement: supplements.get(entry.supplementId) }))
        .filter(({ supplement }) => supplement)
        .map(({ entry, supplement }) => ({
          supplementId: supplement.id,
          name: supplement.name,
          icon: supplement.icon ?? null,
          aisGroup: supplement.aisGroup,
          purpose: supplement.purpose,
          recommendedDose: supplementDose(supplement, weightKg),
          assignedDose: entry.assignedDose ?? '',
          timing: entry.timing || supplement.timing,
          precautions: supplement.precautions,
          brand: supplement.brand,
          link: supplement.link,
        })),
    },
  };
}
