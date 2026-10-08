import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const SiteSetting = sequelize.define(
  'SiteSetting',
  {
    key: { type: DataTypes.STRING(40), primaryKey: true },
    value: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  },
  { tableName: 'site_settings' },
);
