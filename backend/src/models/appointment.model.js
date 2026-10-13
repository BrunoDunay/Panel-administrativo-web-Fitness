import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { uuidKey } from '../utils/model-types.js';

/** Sesión agendada por el coach con un cliente (videollamada). */
export const Appointment = sequelize.define(
  'Appointment',
  {
    id: uuidKey,
    clientId: { type: DataTypes.UUID, allowNull: false },
    startsAt: { type: DataTypes.DATE, allowNull: false },
    durationMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
    // Para qué es la sesión: bienvenida, seguimiento, dudas…
    topic: DataTypes.STRING(60),
    meetingUrl: DataTypes.STRING(500),
    notes: DataTypes.TEXT,
  },
  { tableName: 'appointments' },
);
