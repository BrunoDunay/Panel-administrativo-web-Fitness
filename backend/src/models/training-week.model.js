import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { json, uuidKey } from '../utils/model-types.js';

export const TrainingWeek = sequelize.define(
  'TrainingWeek',
  {
    id: uuidKey,
    planId: { type: DataTypes.UUID, allowNull: false },
    number: { type: DataTypes.INTEGER, allowNull: false },
    // Fecha en que el cliente hizo cada día: { "1": "2026-10-05" }
    dayDates: json({}),
    // Minutos de cardio realizados por día: { "3": 45 }
    cardioLog: json({}),
  },
  { tableName: 'training_weeks' },
);
