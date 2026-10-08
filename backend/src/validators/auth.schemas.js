import { z } from 'zod';

export const loginBody = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Escribe un email válido')),
  password: z.string().min(1, 'Escribe tu contraseña').max(200),
});

export const changePasswordBody = z
  .object({
    currentPassword: z.string().min(1, 'Escribe tu contraseña actual'),
    newPassword: z.string().min(10, 'La nueva contraseña debe tener al menos 10 caracteres').max(200),
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    path: ['newPassword'],
    message: 'La nueva contraseña debe ser distinta a la actual',
  });
