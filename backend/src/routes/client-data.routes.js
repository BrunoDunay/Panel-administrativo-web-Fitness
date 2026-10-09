import { Router } from 'express';
import * as clients from '../controllers/clients.controller.js';
import * as plans from '../controllers/plans.controller.js';
import { coachOnly, portalUnlocked } from '../middlewares/load-client.js';
import { validate } from '../middlewares/validate.js';
import { checkinBody, checkinParams, clientBody, dateParams, dueDateBody, measurementBody, overdueAccessBody, paymentBody, paymentParams, weightBody } from '../validators/client.schemas.js';
import { nutritionPlanBody } from '../validators/nutrition.schemas.js';
import { exerciseLogBody, trainingPlanBody, weekLogBody, weekPrescriptionBody } from '../validators/training.schemas.js';

/**
 * Rutas de un cliente ya cargado en `req.client`. Se montan dos veces:
 * en /clients/:clientId (coach, con sesión) y en /portal/:code (cliente, con su enlace privado).
 * El cliente solo puede registrar su avance; lo marcado con `coachOnly` es exclusivo del coach.
 */
export function clientDataRoutes() {
  return (
    Router({ mergeParams: true })
      .get('/', clients.overview)
      // Con el pago vencido el cliente solo puede ver el aviso: nada más responde.
      .use(portalUnlocked)
      .put('/', coachOnly, validate({ body: clientBody }), clients.update)
      .delete('/', coachOnly, clients.remove)
      .post('/access-code', coachOnly, clients.regenerateAccessCode)

      // Pagos
      .put('/payments/access', coachOnly, validate({ body: overdueAccessBody }), clients.setPaymentAccess)
      .put('/payments/due-date', coachOnly, validate({ body: dueDateBody }), clients.setPaymentDueDate)
      .post('/payments', coachOnly, validate({ body: paymentBody }), clients.addPayment)
      .delete('/payments/:paymentId', coachOnly, validate({ params: paymentParams }), clients.removePayment)

      // Entrenamiento
      .put('/training', coachOnly, validate({ body: trainingPlanBody }), plans.saveTrainingPlan)
      .post('/training/weeks', coachOnly, plans.addWeek)
      .put('/training/weeks/:weekId', coachOnly, validate({ body: weekPrescriptionBody }), plans.saveWeek)
      .delete('/training/weeks/:weekId', coachOnly, plans.deleteWeek)
      .patch('/training/weeks/:weekId/log', validate({ body: weekLogBody }), plans.logWeek)
      .patch('/training/exercises/:exerciseId/log', validate({ body: exerciseLogBody }), plans.logExercise)

      // Nutrición
      .put('/nutrition', coachOnly, validate({ body: nutritionPlanBody }), plans.saveNutrition)
      .post('/nutrition/preview', coachOnly, validate({ body: nutritionPlanBody }), plans.previewNutrition)

      // Seguimiento
      .put('/checkins/:weekNumber', validate({ params: checkinParams, body: checkinBody }), plans.saveCheckin)
      .put('/weights/:date', validate({ params: dateParams, body: weightBody }), plans.saveWeight)
      .put('/measurements/:date', validate({ params: dateParams, body: measurementBody }), plans.saveMeasurement)
      .delete('/measurements/:date', coachOnly, validate({ params: dateParams }), plans.deleteMeasurement)
  );
}
