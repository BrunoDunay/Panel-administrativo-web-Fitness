// Plan alimenticio: a partir de los alimentos elegidos calcula los gramos (peso neto) que
// cumplen la meta de cada comida. Reproduce las hojas 3 (Plan), 4 (Cambios) y 5 (Súper).

import { round, roundGrams } from '../../utils/rounding.js';

/** Macros por gramo de peso neto. */
function perGram(food) {
  if (!food || !food.netWeightG) return { protein: 0, carbs: 0, fat: 0, fiber: 0 };
  const net = food.netWeightG;
  return { protein: food.proteinG / net, carbs: food.carbsG / net, fat: food.fatG / net, fiber: (food.fiberG || 0) / net };
}

const origin = (food) => (food?.foodType === 'Vegetal' ? 'Vegetal' : 'Animal');
const safeDiv = (a, b) => (b ? a / b : 0);

/**
 * Gramos de cada alimento de una comida.
 *
 * Verdura y fruta van en porciones fijas y sus macros se descuentan de la meta. El resto se
 * resuelve en tres pasadas: proteína → carbohidrato → grasa, restando en cada una lo que
 * aportan los otros grupos. Con dos proteínas o dos carbohidratos, el macro se reparte a la
 * mitad (o según el % de proteína vegetal en dietas flexitarianas).
 *
 * @param {object} p
 * @param {{proteinG:number, carbsG:number, fatG:number}} p.target Meta de la comida.
 * @param {object[]} [p.proteins]   Hasta 2 alimentos.
 * @param {object[]} [p.carbs]      Hasta 2 alimentos.
 * @param {object|null} [p.fat]
 * @param {{food:object, portions?:number}|null} [p.vegetable]
 * @param {{food:object, portions?:number}|null} [p.fruit]
 * @param {number|null} [p.vegetableProteinShare] 0–1; solo aplica entre una proteína vegetal y una animal.
 * @param {number} [p.roundTo]      Múltiplo de redondeo (1, 5 o 10 g).
 */
export function solveMeal({ target, proteins = [], carbs = [], fat = null, vegetable = null, fruit = null, vegetableProteinShare = null, roundTo = 5 }) {
  const fixed = [vegetable, fruit].map((slot) =>
    slot?.food ? { food: slot.food, grams: (slot.portions ?? 1) * slot.food.netWeightG } : null,
  );

  const remaining = { ...target };
  for (const item of fixed) {
    if (!item) continue;
    const g = perGram(item.food);
    remaining.proteinG -= item.grams * g.protein;
    remaining.carbsG -= item.grams * g.carbs;
    remaining.fatG -= item.grams * g.fat;
  }
  remaining.proteinG = Math.max(0, remaining.proteinG);
  remaining.carbsG = Math.max(0, remaining.carbsG);
  remaining.fatG = Math.max(0, remaining.fatG);

  // Gramos de cada alimento por cada gramo de su macro principal dentro del grupo.
  const proteinFoods = proteins.filter(Boolean).slice(0, 2).map((food) => ({ food, g: perGram(food) }));
  const usableProteins = proteinFoods.filter((p) => p.g.protein > 0);
  const mixed =
    usableProteins.length === 2 &&
    vegetableProteinShare > 0 &&
    vegetableProteinShare < 1 &&
    origin(usableProteins[0].food) !== origin(usableProteins[1].food);
  for (const p of proteinFoods) {
    const share = mixed ? (origin(p.food) === 'Vegetal' ? vegetableProteinShare : 1 - vegetableProteinShare) : 1 / usableProteins.length;
    p.factor = p.g.protein > 0 ? share / p.g.protein : 0;
  }

  const carbFoods = carbs.filter(Boolean).slice(0, 2).map((food) => ({ food, g: perGram(food) }));
  const usableCarbs = carbFoods.filter((c) => c.g.carbs > 0).length;
  for (const c of carbFoods) c.factor = c.g.carbs > 0 ? 1 / usableCarbs / c.g.carbs : 0;

  const sum = (group, macro) => group.reduce((total, item) => total + item.factor * item.g[macro], 0);
  const P = { protein: sum(proteinFoods, 'protein'), carbs: sum(proteinFoods, 'carbs'), fat: sum(proteinFoods, 'fat') };
  const C = { protein: sum(carbFoods, 'protein'), carbs: sum(carbFoods, 'carbs'), fat: sum(carbFoods, 'fat') };
  const F = perGram(fat);

  // p = g de proteína que aportan las proteínas; c = g de carbos de los carbos; f = g del alimento graso.
  let p = 0;
  let c = 0;
  let f = 0;
  for (let pass = 0; pass < 3; pass++) {
    p = Math.max(0, safeDiv(remaining.proteinG - c * C.protein - f * F.protein, P.protein));
    c = Math.max(0, safeDiv(remaining.carbsG - p * P.carbs - f * F.carbs, C.carbs));
    f = Math.max(0, safeDiv(remaining.fatG - p * P.fat - c * C.fat, F.fat));
  }

  const item = (role, food, grams) => ({ role, food, exactGrams: grams, grams: roundGrams(grams, roundTo) });
  const items = [
    ...proteinFoods.map((x) => item('protein', x.food, p * x.factor)),
    ...carbFoods.map((x) => item('carb', x.food, c * x.factor)),
    ...(fat ? [item('fat', fat, f)] : []),
    ...(fixed[0] ? [item('vegetable', fixed[0].food, fixed[0].grams)] : []),
    ...(fixed[1] ? [item('fruit', fixed[1].food, fixed[1].grams)] : []),
  ];

  return { items, totals: mealTotals(items) };
}

/** Bebida o alimento del intra-entreno: gramos (o ml) para aportar los carbohidratos indicados. */
export function intraWorkoutAmount(food, carbsG) {
  const carbsPerGram = perGram(food).carbs;
  return carbsPerGram ? round(carbsG / carbsPerGram / 5) * 5 : 0;
}

/** Totales de una lista de `{ food, grams }`. Las kcal salen de los macros (4/4/9), igual que en la plantilla. */
export function mealTotals(items) {
  const totals = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, vegetableProteinG: 0 };
  for (const { food, grams } of items) {
    const g = perGram(food);
    totals.proteinG += grams * g.protein;
    totals.carbsG += grams * g.carbs;
    totals.fatG += grams * g.fat;
    totals.fiberG += grams * g.fiber;
    if (origin(food) === 'Vegetal') totals.vegetableProteinG += grams * g.protein;
  }
  totals.kcal = 4 * totals.proteinG + 4 * totals.carbsG + 9 * totals.fatG;
  return totals;
}

/** Medida casera aproximada en cuartos ("3.75 pieza"). Vacía si el alimento se mide en gramos. */
export function householdMeasure(food, grams, step = 4) {
  if (!food || !grams || !food.portionUnit || food.portionUnit === 'g') return '';
  const quantity = round((grams * food.portionQty * step) / food.netWeightG) / step;
  return quantity ? `${quantity} ${food.portionUnit}` : '';
}

const SWAP_BASIS = {
  protein: (g) => g.protein,
  carbs: (g) => g.carbs,
  fat: (g) => g.fat,
  kcal: (g) => 4 * g.protein + 4 * g.carbs + 9 * g.fat,
};

/**
 * Equivalencia: gramos de `to` que igualan a `grams` de `from` en el macro elegido.
 * Proteína se iguala por proteína, carbo y fruta por carbos, grasa por grasa y verdura por kcal.
 */
export function swapGrams({ from, to, grams, basis, roundTo = 5 }) {
  const pick = SWAP_BASIS[basis];
  const target = pick(perGram(to));
  return target ? roundGrams((grams * pick(perGram(from))) / target, roundTo) : 0;
}

/**
 * Lista del súper: suma por alimento lo de la semana (gramos de entreno × días de entreno +
 * gramos de descanso × días de descanso) por las semanas a comprar.
 *
 * @param {Array<{food:object, trainingGrams:number, restGrams:number}>} items
 */
export function groceryList(items, { trainingDays, weeks = 1 }) {
  const restDays = 7 - trainingDays;
  const byFood = new Map();
  for (const { food, trainingGrams, restGrams } of items) {
    const grams = (trainingGrams * trainingDays + restGrams * restDays) * weeks;
    const entry = byFood.get(food.name) ?? { food, grams: 0 };
    entry.grams += grams;
    byFood.set(food.name, entry);
  }
  return [...byFood.values()]
    .filter((entry) => entry.grams > 0)
    .map(({ food, grams }) => ({
      name: food.name,
      grams: round(grams),
      kg: round(grams) / 1000,
      measure: householdMeasure(food, round(grams), 2),
    }));
}
