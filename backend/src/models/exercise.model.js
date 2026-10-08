import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Exercise = sequelize.define(
  'Exercise',
  {
    muscleId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(160), allowNull: false },
    // Tipo de movimiento (define el dibujo animado). Vacío = se deduce del nombre.
    movement: DataTypes.STRING(20),
    description: DataTypes.TEXT,
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { tableName: 'exercises' },
);
