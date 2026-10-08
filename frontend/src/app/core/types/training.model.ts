export type Trend = 'up' | 'down' | 'same' | null;

export interface LoggedSet {
  load: number | null;
  reps: number | null;
}

export interface WeekExercise {
  id: string;
  day: number;
  position: number;
  muscle: string;
  exercise: string;
  sets: number;
  reps: string | null;
  rir: number | null;
  coachNotes: string | null;
  symbol: string | null;
  logged: LoggedSet[];
  clientNotes: string | null;
  /** Del catálogo: tipo de movimiento elegido y cómo se hace el ejercicio. */
  movement: string | null;
  description: string | null;
  setsDone: number;
  e1rm: number | null;
  tonnage: number | null;
}

export interface WeekDay {
  day: number;
  name: string;
  session: string;
  date: string | null;
  setsPlanned: number;
  setsDone: number;
  cardioDoneMin: number | null;
  exercises: WeekExercise[];
}

export interface TrainingWeek {
  id: string;
  number: number;
  days: WeekDay[];
  cardio: { planned: number; done: number | null; compliance: number | null };
}

export interface CardioDay {
  day: number;
  session: string;
  protocol: string;
  moment: string;
  notes: string;
  type: string | null;
  durationMin: number | null;
  intervals: string | null;
  rpe: string | null;
  hrZone: string | null;
  instructions: string | null;
}

export interface WarmupDay {
  day: number;
  session: string;
  protocol: string;
  notes: string;
  general: string | null;
  mobility: string | null;
  activation: string | null;
  rampUpSets: string | null;
  duration: string | null;
}

export interface PriorityNote {
  sets?: string | null;
  frequency?: string | null;
  strategy?: string | null;
}

export interface Priorities {
  p1: string[];
  p2: string[];
  p3: string[];
  maintenance: string[];
  notes?: Partial<Record<'p1' | 'p2' | 'p3' | 'maintenance', PriorityNote>>;
}

export interface MacroBlock {
  phase: string | null;
  weeks: number | null;
  focus: string | null;
  notes: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface TrainingView {
  id: string;
  name: string;
  objective: { primary?: string | null; secondary?: string | null; startingPoint?: string | null; trajectory?: string | null };
  blockPhase: string | null;
  blockStart: string | null;
  blockWeeks: number | null;
  blockEnd: string | null;
  split: string[];
  trainingDays: number;
  priorities: Priorities;
  macroBlocks: MacroBlock[];
  steps: { trainingDay?: number | null; restDay?: number | null; weeklyAverage: number | null };
  cardio: CardioDay[];
  cardioMinutesPerWeek: number;
  cardioSessions: number;
  warmup: WarmupDay[];
  weeks: TrainingWeek[];
  volume: { muscle: string; priority: string; weeks: { number: number; planned: number; done: number; frequency: number }[] }[];
  progress: {
    day: number;
    muscle: string;
    exercise: string;
    reps: string | null;
    weeks: { number: number; e1rm: number | null; tonnage: number | null; e1rmTrend: Trend; tonnageTrend: Trend }[];
  }[];
}

/** Fila de la pauta que edita el coach. */
export interface PrescriptionRow {
  id?: string;
  day: number;
  muscle: string;
  exercise: string;
  sets: number;
  reps: string | null;
  rir: number | null;
  coachNotes: string | null;
  symbol: string | null;
}

export const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const REST = 'Descanso';
