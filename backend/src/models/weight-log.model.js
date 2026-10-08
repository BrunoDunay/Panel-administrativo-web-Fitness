import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { decimal, uuidKey } from '../utils/model-types.js';

/** Peso diario en ayunas. */
export const WeightLog = sequelize.define(
  'WeightLog',
  {
    id: uuidKey,
    clientId: { type: DataTypes.UUID, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    weightKg: decimal('weightKg', 5, 2),
    waistCm: decimal('waistCm', 5, 1),
  },
  { tableName: 'weight_logs' },
);
