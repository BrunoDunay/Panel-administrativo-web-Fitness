export type DayKind = 'training' | 'rest';
export type MealSlot = 'protein1' | 'protein2' | 'carb1' | 'carb2' | 'fat' | 'vegetable' | 'fruit';

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
  cycling: boolean;
  extraTrainingKcal: number;
  trainingDays: boolean[];
  mealCount: number;
  preWorkoutMeal: number | null;
  postWorkoutMeal: number | null;
  roundTo: 1 | 5 | 10;
  mealsMeta: { name: string; time: string; manual: { proteinPct?: number | null; carbsPct?: number | null; fatPct?: number | null } }[];
}

export interface MealChoice {
  style: 'Mixto' | 'Dulce' | 'Salado';
  protein1: number | null;
  protein2: number | null;
  carb1: number | null;
  carb2: number | null;
  fat: number | null;
  vegetable: number | null;
  vegetablePortions: number;
  fruit: number | null;
  fruitPortions: number;
  swaps: Partial<Record<MealSlot, number[]>>;
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
  meals: MealChoice[];
  intra: { foodId: number | null; carbsG: number | null };
  hydration: HydrationInputs;
  supplements: SupplementInput[];
}

export interface MealTotals extends MacroSet {
  kcal: number;
  fiberG: number;
  vegetableProteinG: number;
}

export interface DayTotals extends MealTotals {
  vegetableProteinPct: number | null;
  fiberGoalG: number;
}

export interface MealItemAmounts {
  foodId: number;
  name: string;
  icon: string | null;
  trainingGrams: number;
  restGrams: number;
  trainingMeasure: string;
  restMeasure: string;
}

export interface MealItem extends MealItemAmounts {
  slot: MealSlot;
  label: string;
  swaps: MealItemAmounts[];
}

export interface ComputedMeal {
  number: number;
  name: string;
  time: string;
  moment: string;
  style: string;
  share: { protein: number; carbs: number; fat: number };
  target: Record<DayKind, MacroSet>;
  totals: Record<DayKind, MealTotals>;
  items: MealItem[];
}

export interface DayTarget extends MacroSet {
  kcal: number;
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
  vegetableProteinTarget: number | null;
  cycle: { trainingDays: number; restDays: number; training: DayTarget; rest: DayTarget };
  week: (DayTarget & { day: number; trains: boolean })[];
  meals: ComputedMeal[];
  dayTotals: Record<DayKind, DayTotals>;
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
  meals: Partial<MealChoice>[];
  intra: { foodId?: number | null; carbsG?: number | null };
  hydrationInputs: Partial<HydrationInputs>;
  supplementInputs: SupplementInput[];
  ready: boolean;
  /** Datos del expediente que faltan para poder calcular. */
  missing: string[];
  computed: NutritionComputed | null;
}
