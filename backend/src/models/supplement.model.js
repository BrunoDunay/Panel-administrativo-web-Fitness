import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { decimal } from '../utils/model-types.js';

export const Supplement = sequelize.define(
  'Supplement',
  {
    name: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    aisGroup: DataTypes.STRING(4),
    purpose: DataTypes.TEXT,
    doseText: DataTypes.STRING(200),
    doseMin: decimal('doseMin', 8, 3),
    doseMax: decimal('doseMax', 8, 3),
    doseUnit: DataTypes.STRING(20),
    timing: DataTypes.TEXT,
    precautions: DataTypes.TEXT,
    reference: DataTypes.TEXT,
    brand: DataTypes.STRING(120),
    link: DataTypes.TEXT,
  },
  { tableName: 'supplements' },
);
