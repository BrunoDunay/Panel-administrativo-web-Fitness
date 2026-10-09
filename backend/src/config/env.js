import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  DATABASE_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('12h'),
  ADMIN_EMAIL: z.email('ADMIN_EMAIL debe ser un email válido'),
  ADMIN_PASSWORD: z.string().min(10, 'ADMIN_PASSWORD debe tener al menos 10 caracteres'),
  ADMIN_NAME: z.string().default('Germain Camarillo'),
  // Segunda cuenta, opcional: acceso de soporte de quien da mantenimiento al sistema.
  SUPPORT_ADMIN_EMAIL: z.email('SUPPORT_ADMIN_EMAIL debe ser un email válido').optional().or(z.literal('').transform(() => undefined)),
  SUPPORT_ADMIN_PASSWORD: z.string().min(10, 'SUPPORT_ADMIN_PASSWORD debe tener al menos 10 caracteres').optional().or(z.literal('').transform(() => undefined)),
  SUPPORT_ADMIN_NAME: z.string().default('Soporte'),
  CORS_ORIGINS: z.string().default('http://localhost:4200'),
  PUBLIC_SITE_URL: z.string().default('http://localhost:4200'),
  APP_TIMEZONE: z.string().default('America/Mexico_City'),
});

const parsed = schema
  .refine((v) => Boolean(v.SUPPORT_ADMIN_EMAIL) === Boolean(v.SUPPORT_ADMIN_PASSWORD), { path: ['SUPPORT_ADMIN_PASSWORD'], message: 'SUPPORT_ADMIN_EMAIL y SUPPORT_ADMIN_PASSWORD van juntas: define las dos o ninguna' })
  .refine((v) => !v.SUPPORT_ADMIN_EMAIL || v.SUPPORT_ADMIN_EMAIL.toLowerCase() !== v.ADMIN_EMAIL.toLowerCase(), { path: ['SUPPORT_ADMIN_EMAIL'], message: 'SUPPORT_ADMIN_EMAIL debe ser distinto de ADMIN_EMAIL' })
  .safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`\nConfiguración inválida en variables de entorno:\n${details}\n\nRevisa backend/.env (usa .env.example como guía).\n`);
  process.exit(1);
}

// Producción: avisos de configuración insegura o incompleta (no detienen el arranque).
if (parsed.data.NODE_ENV === 'production') {
  const warnings = [];
  if (/localhost|127\.0\.0\.1/.test(parsed.data.CORS_ORIGINS)) warnings.push('CORS_ORIGINS incluye localhost: deja solo el dominio real del sitio.');
  if (/localhost/.test(parsed.data.PUBLIC_SITE_URL)) warnings.push('PUBLIC_SITE_URL apunta a localhost: usa el dominio real (enlaces de los clientes).');
  if (parsed.data.JWT_SECRET.length < 48) warnings.push('JWT_SECRET es corto: usa al menos 48 caracteres aleatorios.');
  for (const w of warnings) console.warn(`⚠ Producción: ${w}`);
}

export const env = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  corsOrigins: parsed.data.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
};
