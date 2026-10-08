import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';

/** Exige un JWT válido en `Authorization: Bearer <token>`. */
export function requireAuth(req, _res, next) {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'Necesitas iniciar sesión para continuar.', 'UNAUTHENTICATED'));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    req.admin = { id: payload.sub, email: payload.email };
    next();
  } catch (error) {
    const expired = error instanceof jwt.TokenExpiredError;
    next(
      new AppError(
        401,
        expired ? 'Tu sesión expiró. Inicia sesión de nuevo.' : 'Sesión inválida. Inicia sesión de nuevo.',
        expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      ),
    );
  }
}
