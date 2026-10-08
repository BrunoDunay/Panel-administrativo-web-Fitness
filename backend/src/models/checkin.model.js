import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { decimal, json, uuidKey } from '../utils/model-types.js';

/** Cuestionario semanal del cliente. */
export const Checkin = sequelize.define(
  'Checkin',
  {
    id: uuidKey,
    clientId: { type: DataTypes.UUID, allowNull: false },
    weekNumber: { type: DataTypes.INTEGER, allowNull: false },
    date: DataTypes.DATEONLY,
    // [{ day, rpe, durationMin, enjoyment }]
    sessions: json([]),
    // { energy, sleep, soreness, stress, mood, nutrition, injury } del 1 al 5
    ratings: json({}),
    answers: json({}),
    avgSteps: DataTypes.INTEGER,
    avgWeightKg: decimal('avgWeightKg', 5, 2),
  },
  { tableName: 'checkins' },
);
