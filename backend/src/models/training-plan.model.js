import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { json, uuidKey } from '../utils/model-types.js';

export const TrainingPlan = sequelize.define(
  'TrainingPlan',
  {
    id: uuidKey,
    clientId: { type: DataTypes.UUID, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    name: { type: DataTypes.STRING(120), allowNull: false, defaultValue: 'Programa de hipertrofia' },
    objective: json({}),
    blockPhase: DataTypes.STRING(30),
    blockStart: DataTypes.DATEONLY,
    blockWeeks: DataTypes.INTEGER,
    split: json([]),
    priorities: json({}),
    macroBlocks: json([]),
    steps: json({}),
    cardio: json([]),
    warmup: json([]),
  },
  { tableName: 'training_plans' },
);
