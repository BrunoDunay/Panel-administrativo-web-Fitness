import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { json, uuidKey } from '../utils/model-types.js';

export const NutritionPlan = sequelize.define(
  'NutritionPlan',
  {
    id: uuidKey,
    clientId: { type: DataTypes.UUID, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    startDate: DataTypes.DATEONLY,
    // Datos, objetivo, macros, días de entreno y reparto de comidas.
    inputs: json({}),
    // Alimentos elegidos por comida y sus cambios.
    meals: json([]),
    intra: json({}),
    hydration: json({}),
    supplements: json([]),
    allowClientSwaps: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { tableName: 'nutrition_plans' },
);
