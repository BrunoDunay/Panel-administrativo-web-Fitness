import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { decimal } from '../utils/model-types.js';

/** Valores por porción; los gramos del plan son peso neto. */
export const Food = sequelize.define(
  'Food',
  {
    name: { type: DataTypes.STRING(160), allowNull: false, unique: true },
    group: { type: DataTypes.STRING(80), field: 'food_group' },
    portionQty: decimal('portionQty', 8, 3, { allowNull: false, defaultValue: 1 }),
    portionUnit: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'g' },
    grossWeightG: decimal('grossWeightG'),
    netWeightG: decimal('netWeightG', 8, 2, { allowNull: false }),
    kcal: decimal('kcal', 8, 2, { allowNull: false, defaultValue: 0 }),
    proteinG: decimal('proteinG', 8, 2, { allowNull: false, defaultValue: 0 }),
    fatG: decimal('fatG', 8, 2, { allowNull: false, defaultValue: 0 }),
    carbsG: decimal('carbsG', 8, 2, { allowNull: false, defaultValue: 0 }),
    fiberG: decimal('fiberG', 8, 2, { allowNull: false, defaultValue: 0 }),
    foodType: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'Vegetal' },
    style: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'Ambos' },
    asProtein: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    asCarb: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    asFat: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    asVegetable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    asFruit: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // Emoji elegido por el coach; vacío = se deduce del nombre.
    icon: DataTypes.STRING(16),
  },
  { tableName: 'foods' },
);
