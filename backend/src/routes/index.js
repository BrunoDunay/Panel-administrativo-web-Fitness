import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as catalog from '../controllers/catalog.controller.js';
import * as clients from '../controllers/clients.controller.js';
import { loadClientByCode, loadClientForCoach } from '../middlewares/load-client.js';
import { requireAuth } from '../middlewares/require-auth.js';
import { validate } from '../middlewares/validate.js';
import { clientCreateBody, clientListQuery } from '../validators/client.schemas.js';
import { catalogItemParams } from '../validators/common.schemas.js';
import { authRoutes } from './auth.routes.js';
import { clientDataRoutes } from './client-data.routes.js';

// El portal no tiene contraseña: se limita la frecuencia para que no se puedan probar códigos.
const portalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({ error: { message: 'Demasiadas solicitudes. Espera unos minutos e inténtalo de nuevo.', code: 'TOO_MANY_REQUESTS' } }),
});

const catalogRoutes = Router()
  .use(requireAuth)
  .get('/', catalog.getCatalog)
  .post('/:resource', catalog.createItem)
  .put('/:resource/:id', validate({ params: catalogItemParams }), catalog.updateItem)
  .delete('/:resource/:id', validate({ params: catalogItemParams }), catalog.deleteItem);

const clientsRoutes = Router()
  .use(requireAuth)
  .get('/', validate({ query: clientListQuery }), clients.list)
  .post('/', validate({ body: clientCreateBody }), clients.create)
  .use('/:clientId', loadClientForCoach, clientDataRoutes());

export const apiRoutes = Router()
  .get('/health', (_req, res) => res.json({ status: 'ok' }))
  .use('/auth', authRoutes)
  .get('/settings', catalog.getPublicSettings)
  .put('/settings/:section', requireAuth, catalog.updateSettings)
  .get('/dashboard', requireAuth, clients.dashboard)
  .use('/catalog', catalogRoutes)
  .use('/clients', clientsRoutes)
  .use('/portal/:code', portalLimiter, loadClientByCode, clientDataRoutes());
