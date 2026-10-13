/** Sesión (videollamada) agendada por el coach con un cliente. */
export interface Appointment {
  id: string;
  clientId: string;
  /** Instante exacto de inicio y de fin (ISO, UTC). */
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  topic: string | null;
  meetingUrl: string | null;
  notes: string | null;
  client: { id: string; fullName: string; phone: string | null; status: string };
}

export type AppointmentDraft = Pick<Appointment, 'clientId' | 'startsAt' | 'durationMinutes' | 'topic' | 'meetingUrl' | 'notes'>;

export const APPOINTMENT_DURATIONS = [15, 30, 45, 60, 90] as const;
export const APPOINTMENT_TOPICS = ['Bienvenida', 'Seguimiento', 'Resolver dudas', 'Ajuste del plan', 'Otro'] as const;

/** Color de una sesión según su motivo: el mismo en la agenda del coach y en el recordatorio del cliente. */
const TOPIC_TONES: Record<string, 'emerald' | 'steel' | 'amber' | 'teal' | 'coral' | 'slate'> = {
  Bienvenida: 'emerald',
  Seguimiento: 'steel',
  'Resolver dudas': 'amber',
  'Ajuste del plan': 'teal',
  Otro: 'slate',
};
export const topicTone = (topic: string | null | undefined) => TOPIC_TONES[topic ?? ''] ?? 'slate';
