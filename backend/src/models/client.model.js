import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { decimal, json, uuidKey } from '../utils/model-types.js';

export const Client = sequelize.define(
  'Client',
  {
    id: uuidKey,
    accessCode: { type: DataTypes.STRING(32), allowNull: false, unique: true },
    portalEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    // El coach permite ver el plan aunque el pago esté vencido (se apaga al registrar un pago).
    overdueAccess: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    status: { type: DataTypes.ENUM('active', 'paused', 'archived'), allowNull: false, defaultValue: 'active' },
    fullName: { type: DataTypes.STRING(160), allowNull: false },
    birthDate: DataTypes.DATEONLY,
    sex: DataTypes.ENUM('male', 'female'),
    heightCm: decimal('heightCm', 5, 1),
    initialWeightKg: decimal('initialWeightKg', 5, 1),
    city: DataTypes.STRING(120),
    occupation: DataTypes.STRING(120),
    phone: DataTypes.STRING(30),
    email: DataTypes.STRING(160),
    // Historia clínica: salud, logística, estilo de vida, experiencia y nutrición.
    profile: json({}),
    coachNotes: DataTypes.TEXT,
  },
  { tableName: 'clients' },
);
