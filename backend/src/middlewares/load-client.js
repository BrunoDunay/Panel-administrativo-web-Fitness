import { Client } from '../models/index.js';
import { clientPaymentStatus } from '../services/payments.service.js';
import { AppError, notFound } from '../utils/app-error.js';
import { todayInAppTz } from '../utils/dates-mx.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Panel del coach: carga el cliente de `:clientId`. Requiere `requireAuth` antes. */
export async function loadClientForCoach(req, _res, next) {
  const client = UUID.test(req.params.clientId) ? await Client.findByPk(req.params.clientId) : null;
  if (!client) throw notFound('El cliente');
  req.client = client;
  req.isCoach = true;
  next();
}

/** Portal del cliente: el código del enlace privado identifica al cliente. */
export async function loadClientByCode(req, _res, next) {
  const code = String(req.params.code ?? '').toUpperCase();
  const client = /^[2-9A-Z]{20}$/.test(code) ? await Client.findOne({ where: { accessCode: code } }) : null;
  // Mismo mensaje si el código no existe o el acceso está desactivado: no se revela cuál es el caso.
  if (!client || !client.portalEnabled || client.status === 'archived') {
    throw new AppError(404, 'Este enlace no es válido o ya no está activo. Pídele a tu coach uno nuevo.', 'PORTAL_NOT_FOUND');
  }
  req.client = client;
  req.isCoach = false;
  next();
}

/** Portal con el pago vencido: el plan no se puede consultar ni modificar hasta regularizarlo. */
export function portalUnlocked(req, _res, next) {
  if (!req.isCoach && clientPaymentStatus(req.client, todayInAppTz()).locked) {
    return next(new AppError(402, 'Tu acceso está en pausa por un pago pendiente. Ponte en contacto con tu coach.', 'PAYMENT_REQUIRED'));
  }
  next();
}

/** Bloquea al cliente en las acciones que solo corresponden al coach. */
export function coachOnly(req, _res, next) {
  if (!req.isCoach) return next(new AppError(403, 'Solo tu coach puede modificar esta parte del plan.', 'COACH_ONLY'));
  next();
}
