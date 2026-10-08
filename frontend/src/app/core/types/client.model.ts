import { NutritionView } from './nutrition.model';
import { TrainingView } from './training.model';

export type ClientStatus = 'active' | 'paused' | 'archived';

/** Historia clínica: los mismos apartados de la plantilla original. */
export interface ClientProfile {
  health?: { allergies?: string | null; medicalClearance?: string | null; chronicDiseases?: string | null; surgeries?: string | null; injuries?: string | null; medications?: string | null };
  logistics?: {
    planType?: string | null;
    startDate?: string | null;
    paymentDate?: string | null;
    daysPerWeek?: number | null;
    sessionMinutes?: number | null;
    trainingPlace?: string | null;
    equipment?: string | null;
  };
  lifestyle?: {
    sleepHours?: number | null;
    stressLevel?: number | null;
    dailySteps?: number | null;
    workActivity?: string | null;
    alcoholTobacco?: string | null;
    trainingSchedule?: string | null;
    notes?: string | null;
  };
  experience?: { yearsTraining?: number | null; level?: string | null; masteredExercises?: string | null; avoidedExercises?: string | null; bestLifts?: string | null; previousPrograms?: string | null };
  nutrition?: { mealsPerDay?: number | null; tracksNutrition?: boolean | null; restrictions?: string | null; notes?: string | null; supplements?: string | null; hydration?: string | null };
}

export interface Client {
  id: string;
  fullName: string;
  birthDate: string | null;
  age: number | null;
  sex: 'male' | 'female' | null;
  heightCm: number | null;
  initialWeightKg: number | null;
  city: string | null;
  occupation: string | null;
  phone: string | null;
  email: string | null;
  profile: ClientProfile;
  // Solo para el coach:
  status?: ClientStatus;
  portalEnabled?: boolean;
  portalUrl?: string;
  coachNotes?: string | null;
  createdAt?: string;
}

export interface ClientListItem {
  id: string;
  fullName: string;
  status: ClientStatus;
  age: number | null;
  phone: string | null;
  objective: string | null;
  blockPhase: string | null;
  goal: string | null;
  hasTraining: boolean;
  hasNutrition: boolean;
  planType: string | null;
  paymentDate: string | null;
  paymentState: PaymentState;
  createdAt: string;
}

export interface CheckinSession {
  day: number;
  rpe: number | null;
  durationMin: number | null;
  enjoyment: number | null;
}

export interface Checkin {
  weekNumber: number;
  date: string | null;
  sessions: CheckinSession[];
  ratings: Record<string, number | null>;
  answers: Record<string, string | null>;
  avgSteps: number | null;
  avgWeightKg: number | null;
  avgRpe: number | null;
  avgDurationMin: number | null;
  avgEnjoyment: number | null;
  wellbeingIndex: number | null;
  injuryRating: number | null;
}

export interface MeasurementEntry {
  date: string;
  values: Record<string, number | null>;
  photosLink: string | null;
  notes: string | null;
}

export interface WeightWeek {
  number: number;
  start: string;
  days: { date: string; weightKg: number | null; waistCm: number | null }[];
  average: number | null;
  changeKg: number | null;
  changePct: number | null;
  expected: number | null;
  waistCm: number | null;
}

export interface TrackingView {
  checkins: Checkin[];
  measurements: { entries: MeasurementEntry[]; deltas: Record<string, { delta: number | null; pct: number | null }> };
  weight: { weeklyChangeKg: number | null; latest: number | null; weeks: WeightWeek[] };
}

export type PaymentState = 'none' | 'ok' | 'soon' | 'overdue';

/** Estado del pago hoy. `days` = días que faltan para el vencimiento (negativo si ya venció). */
export interface PaymentStatus {
  state: PaymentState;
  dueDate: string | null;
  days: number | null;
  planType: string | null;
  /** Meses que cubre el tipo de plan: sirve para proponer el siguiente vencimiento. */
  periodMonths: number;
}

export interface Payment {
  id: string;
  paidOn: string;
  amount: number | null;
  method: string | null;
  notes: string | null;
  /** Vencimiento que cubrió y fecha en que quedó el siguiente. */
  dueDate: string | null;
  nextDueDate: string | null;
  /** Días entre el vencimiento y el pago: positivo = pagó tarde, negativo = pagó antes. */
  delayDays: number | null;
}

export interface PaymentDraft {
  paidOn: string;
  amount: number | null;
  method: string | null;
  notes: string | null;
  nextDueDate: string | null;
}

/** Todo lo de un cliente: lo consumen el expediente del coach y el portal. */
export interface ClientOverview {
  client: Client;
  training: TrainingView | null;
  nutrition: NutritionView | null;
  tracking: TrackingView;
  payment: PaymentStatus;
  /** Historial de pagos: solo llega al coach. */
  payments?: Payment[];
  today: string;
}

export interface DashboardPayment {
  clientId: string;
  clientName: string;
  date: string;
  days: number;
  overdue: boolean;
  planType: string | null;
  periodMonths: number;
}

export interface Dashboard {
  today: string;
  counts: { active: number; paused: number; withTraining: number; withNutrition: number; withoutTraining: number; withoutNutrition: number };
  recentClients: { id: string; fullName: string; createdAt: string }[];
  activity: { clientId: string; clientName: string; type: 'checkin' | 'weight'; label: string; at: string }[];
  payments: DashboardPayment[];
}
