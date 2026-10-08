import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as auth from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/require-auth.js';
import { validate } from '../middlewares/validate.js';
import { changePasswordBody, loginBody } from '../validators/auth.schemas.js';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, res) =>
    res.status(429).json({
      error: { message: 'Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo.', code: 'TOO_MANY_ATTEMPTS' },
    }),
});

export const authRoutes = Router()
  .post('/login', loginLimiter, validate({ body: loginBody }), auth.login)
  .get('/me', requireAuth, auth.me)
  .put('/password', requireAuth, validate({ body: changePasswordBody }), auth.changePassword);
