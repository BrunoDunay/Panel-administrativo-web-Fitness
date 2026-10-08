import { z } from 'zod';

/** Texto opcional: recorta y convierte vacío en null. */
export const text = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .nullish()
    .transform((v) => v || null);

export const requiredText = (max = 160, message = 'Este campo es obligatorio') => z.string().trim().min(1, message).max(max);

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (AAAA-MM-DD)');
export const optionalDate = isoDate.nullish().or(z.literal('').transform(() => null)).transform((v) => v ?? null);

/** Número opcional dentro de un rango; vacío = null. */
export const number = (min, max) =>
  z
    .union([z.number(), z.literal(''), z.null()])
    .optional()
    .transform((v) => (typeof v === 'number' ? v : null))
    .refine((v) => v === null || (v >= min && v <= max), `Debe estar entre ${min} y ${max}`);

export const catalogItemParams = z.object({ resource: z.string(), id: z.coerce.number().int().positive() });
