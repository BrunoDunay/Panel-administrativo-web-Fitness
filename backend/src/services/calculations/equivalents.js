// Sistema Mexicano de Alimentos Equivalentes (SMAE): el plan se arma en porciones por grupo.
// Reproduce la hoja "_DIETOCALCULO" (porciones × aporte del grupo, contra el ideal) y el reparto
// de porciones por comida de "MENU SMAE".

/** Aporte de UNA porción de cada grupo. `match` reconoce el grupo en el catálogo de alimentos. */
export const SMAE_GROUPS = [
  { key: 'verduras', label: 'Verduras', family: 'Verduras', kcal: 25, proteinG: 2, fatG: 0, carbsG: 4, tone: 'emerald', match: /^verdura/ },
  { key: 'frutas', label: 'Frutas', family: 'Frutas', kcal: 60, proteinG: 0, fatG: 0, carbsG: 15, tone: 'steel', match: /^fruta/ },
  { key: 'cereales_sg', label: 'Cereales sin grasa', family: 'Cereales', kcal: 70, proteinG: 2, fatG: 0, carbsG: 15, tone: 'steel', match: /^cereales.*sin grasa/ },
  { key: 'cereales_cg', label: 'Cereales con grasa', family: 'Cereales', kcal: 115, proteinG: 2, fatG: 5, carbsG: 15, tone: 'steel', match: /^cereales.*con grasa/ },
  { key: 'leguminosas', label: 'Leguminosas', family: 'Leguminosas', kcal: 120, proteinG: 8, fatG: 1, carbsG: 20, tone: 'teal', match: /^leguminosa/ },
  { key: 'aoa_mb', label: 'Origen animal · muy bajo en grasa', family: 'Origen animal', kcal: 40, proteinG: 7, fatG: 1, carbsG: 0, tone: 'coral', match: /^aoa muy bajo/ },
  { key: 'aoa_b', label: 'Origen animal · bajo en grasa', family: 'Origen animal', kcal: 55, proteinG: 7, fatG: 3, carbsG: 0, tone: 'coral', match: /^aoa bajo/ },
  { key: 'aoa_m', label: 'Origen animal · moderado en grasa', family: 'Origen animal', kcal: 75, proteinG: 7, fatG: 5, carbsG: 0, tone: 'coral', match: /^aoa moderado/ },
  { key: 'aoa_a', label: 'Origen animal · alto en grasa', family: 'Origen animal', kcal: 100, proteinG: 7, fatG: 8, carbsG: 0, tone: 'coral', match: /^aoa alto/ },
  { key: 'leche_d', label: 'Leche descremada', family: 'Leche', kcal: 95, proteinG: 9, fatG: 2, carbsG: 12, tone: 'slate', match: /^leche descremada/ },
  { key: 'leche_s', label: 'Leche semidescremada', family: 'Leche', kcal: 110, proteinG: 9, fatG: 4, carbsG: 12, tone: 'slate', match: /^leche semidescremada/ },
  { key: 'leche_e', label: 'Leche entera', family: 'Leche', kcal: 150, proteinG: 9, fatG: 8, carbsG: 12, tone: 'slate', match: /^leche entera/ },
  { key: 'leche_a', label: 'Leche con azúcar', family: 'Leche', kcal: 200, proteinG: 8, fatG: 5, carbsG: 30, tone: 'slate', match: /^leche con azucar/ },
  { key: 'grasa_sp', label: 'Grasas sin proteína', family: 'Grasas', kcal: 45, proteinG: 0, fatG: 5, carbsG: 0, tone: 'amber', match: /^aceites y grasas sin proteina/ },
  { key: 'grasa_cp', label: 'Grasas con proteína', family: 'Grasas', kcal: 70, proteinG: 3, fatG: 5, carbsG: 3, tone: 'amber', match: /^aceites y grasas con proteina/ },
  { key: 'azucar_sg', label: 'Azúcares sin grasa', family: 'Azúcares', kcal: 40, proteinG: 0, fatG: 0, carbsG: 10, tone: 'slate', match: /^azucares sin grasa/ },
  { key: 'azucar_cg', label: 'Azúcares con grasa', family: 'Azúcares', kcal: 85, proteinG: 0, fatG: 5, carbsG: 10, tone: 'slate', match: /^azucares con grasa/ },
];

export const SMAE_KEYS = SMAE_GROUPS.map((group) => group.key);
const BY_KEY = new Map(SMAE_GROUPS.map((group) => [group.key, group]));

/** Una cantidad cuadra si queda entre 95 % y 105 % de su ideal. */
export const ADEQUACY_RANGE = { min: 95, max: 105 };

const normalize = (text) =>
  String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

/** Grupo SMAE de un alimento según el grupo con que está en el catálogo; null si no es un equivalente. */
export function smaeGroupOf(food) {
  const name = normalize(food?.group);
  return SMAE_GROUPS.find((group) => group.match.test(name))?.key ?? null;
}

export const smaeGroup = (key) => BY_KEY.get(key) ?? null;

const amount = (value) => (typeof value === 'number' && value > 0 ? value : 0);

/** Dietocálculo: lo que aportan las porciones del día, por grupo y en total. */
export function dietCalculation(portions = {}) {
  const groups = SMAE_GROUPS.map(({ match, ...group }) => {
    const count = amount(portions[group.key]);
    return { ...group, portions: count, totalKcal: count * group.kcal, totalProteinG: count * group.proteinG, totalFatG: count * group.fatG, totalCarbsG: count * group.carbsG };
  });
  const sum = (field) => groups.reduce((total, group) => total + group[field], 0);
  return { groups, totals: { kcal: sum('totalKcal'), proteinG: sum('totalProteinG'), fatG: sum('totalFatG'), carbsG: sum('totalCarbsG') } };
}

/** % de adecuación contra el ideal. Fuera de 95–105 % falta ('low') o sobra ('high'). */
export function adequacy(totals, ideal) {
  const one = (total, goal) => {
    const pct = goal ? (total * 100) / goal : null;
    const state = pct === null ? 'none' : pct < ADEQUACY_RANGE.min ? 'low' : pct > ADEQUACY_RANGE.max ? 'high' : 'ok';
    return { total, ideal: goal, pct, state, diff: total - goal };
  };
  return { kcal: one(totals.kcal, ideal.kcal), proteinG: one(totals.proteinG, ideal.proteinG), fatG: one(totals.fatG, ideal.fatG), carbsG: one(totals.carbsG, ideal.carbsG) };
}

/**
 * Porciones del día ya repartidas entre las comidas y las que quedan por repartir, por grupo.
 * `meals` es la lista de comidas con sus renglones `{ group, portions }`.
 */
export function portionBalance(portions = {}, meals = []) {
  const assigned = Object.fromEntries(SMAE_KEYS.map((key) => [key, 0]));
  for (const meal of meals) for (const item of meal?.items ?? []) if (item.group in assigned) assigned[item.group] += amount(item.portions);
  return Object.fromEntries(SMAE_KEYS.map((key) => [key, { daily: amount(portions[key]), assigned: assigned[key], remaining: amount(portions[key]) - assigned[key] }]));
}

const round = (value, digits = 0) => {
  const factor = 10 ** digits;
  return Math.sign(value) * Math.round(Math.abs(value) * factor) / factor;
};

/** Fracciones comunes de cocina, para escribir "1/3 taza" en vez de "0.33 taza". */
const FRACTIONS = [[0.25, '1/4'], [0.333, '1/3'], [0.5, '1/2'], [0.667, '2/3'], [0.75, '3/4']];

function quantityText(quantity) {
  const whole = Math.floor(quantity + 1e-6);
  const rest = quantity - whole;
  if (rest < 0.06) return String(whole);
  const fraction = FRACTIONS.find(([value]) => Math.abs(value - rest) < 0.045);
  if (!fraction) return String(round(quantity, 1));
  return whole ? `${whole} ${fraction[1]}` : fraction[1];
}

/**
 * Cantidad de un alimento que equivale a `portions` porciones de su grupo: gramos (peso neto)
 * y medida casera. En el catálogo cada alimento está capturado a 1 porción.
 */
export function equivalentAmount(food, portions) {
  if (!food || !portions) return { grams: 0, measure: '' };
  const grams = round(food.netWeightG * portions);
  if (!food.portionUnit || food.portionUnit === 'g') return { grams, measure: '' };
  return { grams, measure: `${quantityText(food.portionQty * portions)} ${food.portionUnit}` };
}
