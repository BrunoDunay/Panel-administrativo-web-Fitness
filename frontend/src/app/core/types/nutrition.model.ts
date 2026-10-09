import { Tone } from '../utils/visuals';

/** Grupos del Sistema Mexicano de Alimentos Equivalentes; las claves las define el servidor. */
export type SmaeGroupKey = string;

export interface MacroSet {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface NutritionInputs {
  weightKg: number | null;
  formula: 'mifflin' | 'harris';
  activity: string;
  dietType: string;
  goal: string;
  adjustmentKcal: number;
  proteinPerKg: number;
  fatPct: number;
  /** Dietocálculo: porciones al día de cada grupo. */
  portions: Record<SmaeGroupKey, number>;
  mealCount: number;
  mealsMeta: { name: string; time: string }[];
}

/** Renglón de una comida: porciones de un grupo y el alimento con que se cubren. */
export interface MealItemDraft {
  group: SmaeGroupKey;
  portions: number;
  foodId: number | null;
}

/** Alimento adicional: no cuenta para el dietocálculo y lleva su nota. */
export interface MealExtraDraft {
  foodId: number | null;
  portions: number;
  note: string | null;
}

export interface MealDraft {
  items: MealItemDraft[];
  extras: MealExtraDraft[];
  notes: string | null;
}

export interface HydrationInputs {
  sessionMin: number;
  sweatRateLPerH: number;
  test?: { weightBeforeKg?: number | null; weightAfterKg?: number | null; fluidIntakeL?: number | null; durationMin?: number | null };
}

export interface SupplementInput {
  supplementId: number;
  assignedDose: string | null;
  timing: string | null;
}

/** Lo que el coach captura; el servidor calcula el resto. */
export interface NutritionDraft {
  startDate: string | null;
  allowClientSwaps: boolean;
  inputs: NutritionInputs;
  meals: MealDraft[];
  intra: { foodId: number | null; carbsG: number | null };
  hydration: HydrationInputs;
  supplements: SupplementInput[];
}

export type AdequacyState = 'ok' | 'low' | 'high' | 'none';

export interface Adequacy {
  total: number;
  ideal: number;
  /** % de adecuación: total × 100 / ideal. */
  pct: number | null;
  state: AdequacyState;
  diff: number;
}

/** Un grupo en el dietocálculo: aporte por porción, porciones del día y cuántas faltan por repartir. */
export interface DietGroup extends MacroSet {
  key: SmaeGroupKey;
  label: string;
  family: string;
  tone: Tone;
  kcal: number;
  portions: number;
  totalKcal: number;
  totalProteinG: number;
  totalFatG: number;
  totalCarbsG: number;
  daily: number;
  assigned: number;
  remaining: number;
}

export interface ComputedItem {
  group: SmaeGroupKey;
  groupLabel: string;
  tone: Tone;
  portions: number;
  foodId: number | null;
  name: string;
  icon: string | null;
  grams: number;
  measure: string;
}

export interface ComputedExtra {
  foodId: number;
  name: string;
  icon: string | null;
  portions: number;
  grams: number;
  measure: string;
  note: string | null;
  kcal: number;
}

export interface ComputedMeal {
  number: number;
  name: string;
  time: string;
  notes: string | null;
  kcal: number;
  items: ComputedItem[];
  extras: ComputedExtra[];
}

/** Alimento de un grupo a 1 porción: con él se calcula cualquier cambio equivalente. */
export interface EquivalentFood {
  foodId: number;
  name: string;
  icon: string | null;
  grams: number;
  qty: number;
  unit: string;
  foodType: string;
}

export interface NutritionComputed {
  client: { weightKg: number; age: number; sex: 'male' | 'female'; heightCm: number };
  bmr: number;
  activityFactor: number;
  maintenanceKcal: number;
  targetKcal: number;
  weeklyChangeKg: number;
  weeklyChangePct: number;
  fourWeekChangeKg: number;
  macros: MacroSet & { kcal: number; carbsNegative: boolean; proteinPerKg: number; fatPerKg: number; carbsPerKg: number };
  ideal: MacroSet & { kcal: number };
  diet: {
    groups: DietGroup[];
    totals: MacroSet & { kcal: number };
    adequacy: Record<'kcal' | 'proteinG' | 'fatG' | 'carbsG', Adequacy>;
    range: { min: number; max: number };
    /** Porciones del día que aún no están en ninguna comida. */
    pending: number;
    /** Grupos en los que se repartieron más porciones de las del día. */
    exceeded: string[];
  };
  meals: ComputedMeal[];
  equivalents: Record<SmaeGroupKey, EquivalentFood[]>;
  intra: { foodId: number; name: string; carbsG: number; amount: number; unit: string; measure: string } | null;
  grocery: { name: string; icon: string | null; grams: number; kg: number; measure: string }[];
  hydration: {
    restDayL: number;
    trainingDayL: number;
    preWorkoutMl: { min: number; max: number };
    maxLossKg: number;
    perKgLostL: { min: number; max: number };
    measuredSweatRate: number | null;
  };
  supplements: {
    supplementId: number;
    name: string;
    icon: string | null;
    aisGroup: string | null;
    purpose: string | null;
    recommendedDose: string | null;
    assignedDose: string;
    timing: string | null;
    precautions: string | null;
    brand: string | null;
    link: string | null;
  }[];
}

export interface NutritionView {
  id: string | null;
  startDate: string | null;
  allowClientSwaps: boolean;
  inputs: NutritionInputs;
  meals: MealDraft[];
  intra: { foodId?: number | null; carbsG?: number | null };
  hydrationInputs: Partial<HydrationInputs>;
  supplementInputs: SupplementInput[];
  ready: boolean;
  /** Datos del expediente que faltan para poder calcular. */
  missing: string[];
  computed: NutritionComputed | null;
}
