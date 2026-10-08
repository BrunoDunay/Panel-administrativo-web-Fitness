import { z } from 'zod';
import { number, requiredText, text } from './common.schemas.js';

const amount = (max = 5000) => z.number().min(0).max(max);

export const catalogSchemas = {
  muscles: z.object({ name: requiredText(80, 'Escribe el nombre del músculo') }),
  exercises: z.object({ muscleId: z.number().int().positive(), name: requiredText(160, 'Escribe el nombre del ejercicio') }),
  'cardio-protocols': z.object({
    name: requiredText(120, 'Escribe el nombre del protocolo'),
    type: text(20),
    durationMin: number(0, 600),
    intervals: text(120),
    rpe: text(40),
    hrZone: text(60),
    notes: text(),
  }),
  'warmup-protocols': z.object({
    name: requiredText(120, 'Escribe el nombre del protocolo'),
    general: text(),
    mobility: text(),
    activation: text(),
    rampUpSets: text(),
    duration: text(40),
    rationale: text(),
  }),
  foods: z.object({
    name: requiredText(160, 'Escribe el nombre del alimento'),
    group: text(80),
    portionQty: amount(1000),
    portionUnit: requiredText(40, 'Escribe la unidad (g, pieza, taza...)'),
    grossWeightG: number(0, 5000),
    netWeightG: z.number().gt(0, 'El peso neto debe ser mayor a 0').max(5000),
    kcal: amount(),
    proteinG: amount(),
    fatG: amount(),
    carbsG: amount(),
    fiberG: amount().default(0),
    foodType: z.enum(['Vegetal', 'Carne/pollo', 'Pescado/marisco', 'Huevo/lácteo', 'Miel']),
    style: z.enum(['Dulce', 'Salado', 'Ambos']),
    asProtein: z.boolean().default(false),
    asCarb: z.boolean().default(false),
    asFat: z.boolean().default(false),
    asVegetable: z.boolean().default(false),
    asFruit: z.boolean().default(false),
  }),
  supplements: z.object({
    name: requiredText(120, 'Escribe el nombre del suplemento'),
    aisGroup: text(4),
    purpose: text(),
    doseText: text(200),
    doseMin: number(0, 100000),
    doseMax: number(0, 100000),
    doseUnit: text(20),
    timing: text(),
    precautions: text(),
    reference: text(),
    brand: text(120),
    link: text(500),
  }),
};

const service = z.object({ title: requiredText(80), description: text(600) });

export const settingsSchemas = {
  brand: z.object({ name: requiredText(80), coachName: requiredText(120), tagline: text(160) }),
  hero: z.object({ eyebrow: text(80), title: requiredText(120), subtitle: text(400), ctaLabel: text(40), isProvisional: z.boolean().default(false) }),
  services: z.object({ title: requiredText(120), items: z.array(service).max(8), isProvisional: z.boolean().default(false) }),
  method: z.object({ title: requiredText(120), intro: text(400), steps: z.array(service).max(6), isProvisional: z.boolean().default(false) }),
  about: z.object({ title: requiredText(120), body: text(3000), credentials: z.array(z.string().trim().min(1).max(200)).max(20), isProvisional: z.boolean().default(false) }),
  contact: z.object({
    whatsapp: text(30),
    whatsappMessage: text(300),
    email: text(160),
    instagram: text(80),
    facebook: text(120),
    tiktok: text(80),
    city: text(120),
    isProvisional: z.boolean().default(false),
  }),
};

export const SETTINGS_SECTIONS = Object.keys(settingsSchemas);
