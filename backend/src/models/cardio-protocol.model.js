import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const CardioProtocol = sequelize.define(
  'CardioProtocol',
  {
    name: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    type: DataTypes.STRING(20),
    durationMin: DataTypes.INTEGER,
    intervals: DataTypes.STRING(120),
    rpe: DataTypes.STRING(40),
    hrZone: DataTypes.STRING(60),
    notes: DataTypes.TEXT,
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { tableName: 'cardio_protocols' },
);
