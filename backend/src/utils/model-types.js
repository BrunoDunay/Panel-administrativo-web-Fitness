import { DataTypes } from 'sequelize';

/** NUMERIC de PostgreSQL llega como texto; este tipo lo entrega como número. */
export function decimal(field, precision = 8, scale = 2, options = {}) {
  return {
    type: DataTypes.DECIMAL(precision, scale),
    ...options,
    get() {
      const value = this.getDataValue(field);
      return value === null || value === undefined ? null : Number(value);
    },
  };
}

export const uuidKey = { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 };
export const json = (defaultValue) => ({ type: DataTypes.JSONB, allowNull: false, defaultValue });
