import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { json, uuidKey } from '../utils/model-types.js';

export const WeekExercise = sequelize.define(
  'WeekExercise',
  {
    id: uuidKey,
    weekId: { type: DataTypes.UUID, allowNull: false },
    day: { type: DataTypes.SMALLINT, allowNull: false },
    position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    muscle: { type: DataTypes.STRING(80), allowNull: false },
    exercise: { type: DataTypes.STRING(160), allowNull: false },
    sets: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 3 },
    reps: DataTypes.STRING(30),
    rir: DataTypes.SMALLINT,
    coachNotes: DataTypes.TEXT,
    symbol: DataTypes.STRING(12),
    // Registro del cliente por serie: [{ load, reps }]
    logged: json([]),
    clientNotes: DataTypes.TEXT,
  },
  { tableName: 'week_exercises' },
);
