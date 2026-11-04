import { AppError } from '../utils/app-error.js';

/** Peticiones que no son de lectura pero no guardan nada: entrar y recalcular el borrador de nutrición. */
const ALLOWED = [/^\/api\/auth\/(login|demo)\/?$/, /^\/api\/clients\/[^/]+\/nutrition\/preview\/?$/];

/**
 * Instalación de demostración: se puede ver todo, pero ningún cambio llega a la base.
 * Solo se monta con DEMO_MODE=true.
 */
export function demoReadOnly(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || ALLOWED.some((path) => path.test(req.path))) return next();
  next(new AppError(403, 'Esto es una demostración: puedes recorrer todo, pero los cambios no se guardan.', 'DEMO_READ_ONLY'));
}
