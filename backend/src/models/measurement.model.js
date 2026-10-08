import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { json, uuidKey } from '../utils/model-types.js';

export const Measurement = sequelize.define(
  'Measurement',
  {
    id: uuidKey,
    clientId: { type: DataTypes.UUID, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    // { weight, bodyFat, neck, ... } en kg, % o cm
    values: json({}),
    photosLink: DataTypes.TEXT,
    notes: DataTypes.TEXT,
  },
  { tableName: 'measurements' },
);
