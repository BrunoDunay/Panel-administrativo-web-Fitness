import { NutritionPlan } from '../models/index.js';
import { round } from '../utils/rounding.js';
import { ACTIVITY_LEVELS, basalMetabolicRate, energyTargets, hydration, macroTargets, supplementDose, sweatRate } from './calculations/nutrition.js';
import { ADEQUACY_RANGE, SMAE_GROUPS, adequacy, dietCalculation, equivalentAmount, portionBalance, smaeGroupOf } from './calculations/equivalents.js';
import { householdMeasure, intraWorkoutAmount } from './calculations/meal-plan.js';
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
  portions: {},
  mealCount: 4,
  mealsMeta: DEFAULT_MEALS.map((meal) => ({ ...meal })),
};

export const findActiveNutritionPlan = (clientId) => NutritionPlan.findOne({ where: { clientId, isActive: true } });

export async function saveNutritionPlan(clientId, data) {
  const plan = await findActiveNutritionPlan(clientId);
  if (plan) return plan.update(data);
  return NutritionPlan.create({ ...data, clientId });
}

/** Una comida guardada con el formato anterior (gramos automáticos) se lee como vacía. */
const mealOf = (meal) => ({ items: Array.isArray(meal?.items) ? meal.items : [], extras: Array.isArray(meal?.extras) ? meal.extras : [], notes: meal?.notes ?? null });

const KCAL = (food) => food.kcal ?? 4 * food.proteinG + 4 * food.carbsG + 9 * food.fatG;

/**
 * Calcula todo el plan a partir de lo que el coach capturó. `plan` puede ser el registro
 * guardado o un borrador sin guardar (vista previa mientras edita).
 *
 * El plan es un solo menú para todos los días: el coach fija las porciones diarias de cada grupo
 * (dietocálculo), las reparte entre las comidas y elige el alimento de cada renglón.
 */
export function buildNutritionView(plan, client, catalog, today) {
  const stored = plan?.inputs ?? {};
  const inputs = Object.fromEntries(Object.keys(DEFAULT_INPUTS).map((key) => [key, stored[key] ?? DEFAULT_INPUTS[key]]));
  // Los planes guardados con menos comidas se completan hasta el máximo actual.
  inputs.mealsMeta = DEFAULT_MEALS.map((meal, i) => ({ name: inputs.mealsMeta?.[i]?.name ?? meal.name, time: inputs.mealsMeta?.[i]?.time ?? meal.time }));

  const foods = new Map(catalog.foods.map((food) => [food.id, food]));
  const supplements = new Map(catalog.supplements.map((s) => [s.id, s]));
  const draftMeals = Array.from({ length: inputs.mealCount }, (_, i) => mealOf(plan?.meals?.[i]));

  const weightKg = inputs.weightKg ?? client.initialWeightKg;
  const age = client.birthDate ? ageOn(client.birthDate, today) : null;
  const missing = [!weightKg && 'peso', !client.heightCm && 'estatura', age === null && 'fecha de nacimiento', !client.sex && 'sexo'].filter(Boolean);

  const base = {
    id: plan?.id ?? null,
    startDate: plan?.startDate ?? null,
    allowClientSwaps: plan?.allowClientSwaps ?? true,
    inputs,
    meals: draftMeals,
    intra: plan?.intra ?? {},
    hydrationInputs: plan?.hydration ?? {},
    supplementInputs: plan?.supplements ?? [],
  };
  if (missing.length) return { ...base, ready: false, missing, computed: null };

  // 1 · Gasto, objetivo y macros ideales.
  const activity = ACTIVITY_LEVELS.find((level) => level.key === inputs.activity) ?? ACTIVITY_LEVELS[2];
  const bmr = basalMetabolicRate({ sex: client.sex, age, weightKg, heightCm: client.heightCm, formula: inputs.formula });
  const energy = energyTargets({ bmr, activityFactor: activity.factor, adjustmentKcal: inputs.adjustmentKcal, weightKg });
  const macros = macroTargets({ targetKcal: energy.targetKcal, weightKg, proteinPerKg: inputs.proteinPerKg, fatPct: inputs.fatPct });
  const ideal = { kcal: energy.targetKcal, proteinG: macros.proteinG, fatG: macros.fatG, carbsG: macros.carbsG };

  // 2 · Dietocálculo: porciones del día contra el ideal.
  const diet = dietCalculation(inputs.portions);
  const balance = portionBalance(inputs.portions, draftMeals);
  const groups = diet.groups.map((group) => ({ ...group, ...balance[group.key] }));

  // 3 · Menú: cada renglón es porciones de un grupo con su alimento y la cantidad que le toca.
  const labels = new Map(SMAE_GROUPS.map((group) => [group.key, group]));
  const grocery = new Map();
  const meals = draftMeals.map((meal, index) => {
    const meta = inputs.mealsMeta[index];
    const items = meal.items.map((item) => {
      const food = foods.get(item.foodId) ?? null;
      const { grams, measure } = equivalentAmount(food, item.portions);
      if (food && grams) {
        const entry = grocery.get(food.id) ?? { food, grams: 0 };
        entry.grams += grams * 7;
        grocery.set(food.id, entry);
      }
      const group = labels.get(item.group);
      return { group: item.group, groupLabel: group?.label ?? '', tone: group?.tone ?? 'slate', portions: item.portions, foodId: food?.id ?? null, name: food?.name ?? '', icon: food?.icon ?? null, grams, measure };
    });
    const extras = meal.extras
      .map((extra) => ({ extra, food: foods.get(extra.foodId) }))
      .filter(({ food }) => food)
      .map(({ extra, food }) => {
        const { grams, measure } = equivalentAmount(food, extra.portions || 1);
        return { foodId: food.id, name: food.name, icon: food.icon ?? null, portions: extra.portions || 1, grams, measure, note: extra.note ?? null, kcal: round(KCAL(food) * (extra.portions || 1)) };
      });
    return {
      number: index + 1,
      name: meta.name,
      time: meta.time,
      notes: meal.notes,
      // Calorías de la comida con el aporte estándar de cada grupo (igual que el dietocálculo).
      kcal: items.reduce((sum, item) => sum + (labels.get(item.group)?.kcal ?? 0) * item.portions, 0),
      items,
      extras,
    };
  });

  // Alimentos equivalentes de cada grupo: con ellos el cliente cambia uno por otro sin alterar las porciones.
  const equivalents = {};
  for (const food of catalog.foods) {
    const key = smaeGroupOf(food);
    if (key) (equivalents[key] ??= []).push({ foodId: food.id, name: food.name, icon: food.icon ?? null, grams: food.netWeightG, qty: food.portionQty, unit: food.portionUnit, foodType: food.foodType });
  }

  const intraFood = foods.get(base.intra.foodId);
  const intraCarbsG = intraFood ? Number(base.intra.carbsG) || 0 : 0;
  const intraAmount = intraFood ? intraWorkoutAmount(intraFood, intraCarbsG) : 0;

  const hydrationInputs = { sessionMin: 75, sweatRateLPerH: 0.8, ...base.hydrationInputs };
  const measuredSweat = sweatRate(hydrationInputs.test ?? {});
  const water = hydration({ sex: client.sex, weightKg, sessionMin: hydrationInputs.sessionMin, sweatRateLPerH: measuredSweat ?? hydrationInputs.sweatRateLPerH });

  return {
    ...base,
    ready: true,
    missing: [],
    computed: {
      client: { weightKg, age, sex: client.sex, heightCm: client.heightCm },
      bmr: round(bmr, 2),
      activityFactor: activity.factor,
      ...energy,
      macros: { ...macros, proteinPerKg: macros.proteinG / weightKg, fatPerKg: macros.fatG / weightKg, carbsPerKg: macros.carbsG / weightKg },
      ideal,
      diet: {
        groups,
        totals: diet.totals,
        adequacy: adequacy(diet.totals, ideal),
        range: ADEQUACY_RANGE,
        // Porciones del día que todavía no están en ninguna comida (negativo = se repartieron de más).
        pending: groups.reduce((sum, group) => sum + Math.max(0, group.remaining), 0),
        exceeded: groups.filter((group) => group.remaining < 0).map((group) => group.label),
      },
      meals,
      equivalents,
      intra: intraFood
        ? { foodId: intraFood.id, name: intraFood.name, carbsG: intraCarbsG, amount: intraAmount, unit: /ml/.test(intraFood.portionUnit) ? 'ml' : 'g', measure: householdMeasure(intraFood, intraAmount) }
        : null,
      grocery: [...grocery.values()]
        .sort((a, b) => a.food.name.localeCompare(b.food.name, 'es'))
        .map(({ food, grams }) => ({ name: food.name, icon: food.icon ?? null, grams: round(grams), kg: round(grams) / 1000, measure: equivalentAmount(food, grams / food.netWeightG).measure })),
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
