import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const WarmupProtocol = sequelize.define(
  'WarmupProtocol',
  {
    name: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    general: DataTypes.TEXT,
    mobility: DataTypes.TEXT,
    activation: DataTypes.TEXT,
    rampUpSets: DataTypes.TEXT,
    duration: DataTypes.STRING(40),
    rationale: DataTypes.TEXT,
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { tableName: 'warmup_protocols' },
);
