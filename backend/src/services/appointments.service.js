import { Op } from 'sequelize';
import { Appointment, Client } from '../models/index.js';
import { AppError, notFound } from '../utils/app-error.js';

const MINUTE_MS = 60 * 1000;
const withClient = { model: Client, as: 'client', attributes: ['id', 'fullName', 'phone', 'status'] };

const endOf = (startsAt, durationMinutes) => new Date(new Date(startsAt).getTime() + durationMinutes * MINUTE_MS);

function present(row) {
  const item = row.toJSON();
  return { ...item, endsAt: endOf(item.startsAt, item.durationMinutes).toISOString() };
}

/** Sesiones dentro de un rango (por inicio), de la más próxima a la más lejana. */
export async function listAppointments({ from, to, clientId } = {}) {
  const where = {};
  if (from || to) where.startsAt = { ...(from ? { [Op.gte]: new Date(from) } : {}), ...(to ? { [Op.lt]: new Date(to) } : {}) };
  if (clientId) where.clientId = clientId;
  const rows = await Appointment.findAll({ where, include: [withClient], order: [['startsAt', 'ASC']] });
  return rows.map(present);
}

/** Otra sesión del coach que se empalma con el horario pedido (el coach solo puede estar en una llamada). */
async function overlapping({ startsAt, durationMinutes }, ignoreId) {
  const start = new Date(startsAt);
  const end = endOf(startsAt, durationMinutes);
  // Ninguna sesión dura más de 8 horas: basta revisar las que empiezan en esa ventana.
  const candidates = await Appointment.findAll({
    where: { startsAt: { [Op.gt]: new Date(start.getTime() - 8 * 60 * MINUTE_MS), [Op.lt]: end }, ...(ignoreId ? { id: { [Op.ne]: ignoreId } } : {}) },
    include: [withClient],
  });
  return candidates.find((other) => endOf(other.startsAt, other.durationMinutes) > start) ?? null;
}

async function assertValid(data, ignoreId) {
  if (!(await Client.findByPk(data.clientId, { attributes: ['id'] }))) throw notFound('El cliente');
  const clash = await overlapping(data, ignoreId);
  if (clash) throw new AppError(409, `Ese horario se empalma con la sesión de ${clash.client?.fullName ?? 'otro cliente'}.`, 'APPOINTMENT_OVERLAP');
}

/**
 * Sesiones que el cliente todavía tiene por delante (o en curso). El portal no recibe las notas
 * del coach: son suyas.
 */
export async function upcomingForClient(clientId, { withNotes = false } = {}) {
  const now = Date.now();
  const rows = await Appointment.findAll({ where: { clientId, startsAt: { [Op.gt]: new Date(now - 8 * 60 * MINUTE_MS) } }, order: [['startsAt', 'ASC']] });
  return rows
    .map((row) => row.toJSON())
    .filter((item) => endOf(item.startsAt, item.durationMinutes).getTime() > now)
    .map((item) => ({
      id: item.id,
      startsAt: item.startsAt,
      endsAt: endOf(item.startsAt, item.durationMinutes).toISOString(),
      durationMinutes: item.durationMinutes,
      topic: item.topic,
      meetingUrl: item.meetingUrl,
      ...(withNotes ? { notes: item.notes } : {}),
    }));
}

export async function createAppointment(data) {
  await assertValid(data);
  const row = await Appointment.create(data);
  return present(await row.reload({ include: [withClient] }));
}

export async function updateAppointment(id, data) {
  const row = await Appointment.findByPk(id);
  if (!row) throw notFound('La sesión');
  await assertValid(data, id);
  await row.update(data);
  return present(await row.reload({ include: [withClient] }));
}

export async function deleteAppointment(id) {
  const row = await Appointment.findByPk(id);
  if (!row) throw notFound('La sesión');
  await row.destroy();
}
