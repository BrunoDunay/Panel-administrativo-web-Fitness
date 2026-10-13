import { z } from 'zod';
import { text } from './common.schemas.js';

/** Duraciones que ofrece el formulario; el backend acepta cualquier valor razonable entre ellas. */
export const APPOINTMENT_DURATIONS = [15, 30, 45, 60, 90];
export const APPOINTMENT_TOPICS = ['Bienvenida', 'Seguimiento', 'Resolver dudas', 'Ajuste del plan', 'Otro'];

const instant = z.iso.datetime({ offset: true, message: 'Fecha y hora inválidas' });

export const appointmentBody = z.object({
  clientId: z.uuid('Elige un cliente'),
  startsAt: instant,
  durationMinutes: z.coerce.number().int().min(5, 'Mínimo 5 minutos').max(480, 'Máximo 8 horas').default(30),
  topic: text(60),
  meetingUrl: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => v || null)
    .refine((v) => v === null || /^https?:\/\//i.test(v), 'El enlace debe empezar con http:// o https://'),
  notes: text(2000),
});

export const appointmentListQuery = z.object({
  from: instant.optional(),
  to: instant.optional(),
  clientId: z.uuid().optional(),
});

export const appointmentParams = z.object({ id: z.uuid() });
