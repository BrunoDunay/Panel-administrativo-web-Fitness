import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Muscle = sequelize.define(
  'Muscle',
  {
    name: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    // Zona del cuerpo: push, pull, legs o core. Vacío = se deduce del nombre.
    region: DataTypes.STRING(20),
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { tableName: 'muscles' },
);
