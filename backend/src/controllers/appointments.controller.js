import * as appointments from '../services/appointments.service.js';

export async function list(req, res) {
  res.json(await appointments.listAppointments(req.valid.query));
}

/** Próximas sesiones del cliente cargado (portal o expediente). */
export async function upcomingForClient(req, res) {
  res.json(await appointments.upcomingForClient(req.client.id, { withNotes: req.isCoach }));
}

export async function create(req, res) {
  res.status(201).json(await appointments.createAppointment(req.valid.body));
}

export async function update(req, res) {
  res.json(await appointments.updateAppointment(req.valid.params.id, req.valid.body));
}

export async function remove(req, res) {
  await appointments.deleteAppointment(req.valid.params.id);
  res.status(204).end();
}
