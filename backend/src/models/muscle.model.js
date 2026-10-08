import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Muscle = sequelize.define(
  'Muscle',
  {
    name: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { tableName: 'muscles' },
);
