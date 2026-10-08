export interface Exercise {
  id: number;
  name: string;
  sortOrder: number;
  /** Tipo de movimiento elegido por el coach; null = se deduce del nombre. */
  movement: string | null;
  description: string | null;
}

export interface Muscle {
  id: number;
  name: string;
  /** Zona del cuerpo elegida por el coach; null = se deduce del nombre. */
  region: string | null;
  exercises: Exercise[];
}

export interface CardioProtocol {
  id: number;
  name: string;
  type: string | null;
  durationMin: number | null;
  intervals: string | null;
  rpe: string | null;
  hrZone: string | null;
  notes: string | null;
  icon: string | null;
}

export interface WarmupProtocol {
  id: number;
  name: string;
  general: string | null;
  mobility: string | null;
  activation: string | null;
  rampUpSets: string | null;
  duration: string | null;
  rationale: string | null;
  icon: string | null;
}

/** Valores por porción; los gramos del plan son peso neto. */
export interface Food {
  id: number;
  name: string;
  group: string | null;
  portionQty: number;
  portionUnit: string;
  grossWeightG: number | null;
  netWeightG: number;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
  foodType: string;
  style: 'Dulce' | 'Salado' | 'Ambos';
  asProtein: boolean;
  asCarb: boolean;
  asFat: boolean;
  asVegetable: boolean;
  asFruit: boolean;
  icon: string | null;
}

export interface Supplement {
  id: number;
  name: string;
  aisGroup: string | null;
  purpose: string | null;
  doseText: string | null;
  doseMin: number | null;
  doseMax: number | null;
  doseUnit: string | null;
  timing: string | null;
  precautions: string | null;
  reference: string | null;
  brand: string | null;
  link: string | null;
  icon: string | null;
}

export interface KeyLabel {
  key: string;
  label: string;
}

export interface CatalogLists {
  activityLevels: (KeyLabel & { factor: number })[];
  goals: string[];
  dietTypes: (KeyLabel & { vegetableProteinShare: number | null; foodTypes: string[] | null })[];
  formulas: KeyLabel[];
  foodTypes: string[];
  foodStyles: string[];
  mealStyles: string[];
  roundTo: number[];
  mealCounts: number[];
  blockPhases: string[];
  cardioTypes: string[];
  cardioMoments: string[];
  symbols: { symbol: string; label: string; hint: string }[];
  planTypes: string[];
  trainingPlaces: string[];
  levels: string[];
  workActivity: string[];
  medicalClearance: string[];
  checkinRatings: (KeyLabel & { options: string[] })[];
  checkinQuestions: KeyLabel[];
  measurements: (KeyLabel & { unit: string })[];
}

export interface Catalog {
  muscles: Muscle[];
  cardioProtocols: CardioProtocol[];
  warmupProtocols: WarmupProtocol[];
  foods: Food[];
  supplements: Supplement[];
  lists: CatalogLists;
}

export type CatalogResource = 'muscles' | 'exercises' | 'cardio-protocols' | 'warmup-protocols' | 'foods' | 'supplements';
