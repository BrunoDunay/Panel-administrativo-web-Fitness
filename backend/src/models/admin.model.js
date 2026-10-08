import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Admin = sequelize.define(
  'Admin',
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    email: { type: DataTypes.STRING(160), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(100), allowNull: false },
    name: { type: DataTypes.STRING(120), allowNull: false },
    lastLoginAt: DataTypes.DATE,
  },
  {
    tableName: 'admins',
    defaultScope: { attributes: { exclude: ['passwordHash'] } },
    scopes: { withPassword: { attributes: { include: ['passwordHash'] } } },
  },
);
