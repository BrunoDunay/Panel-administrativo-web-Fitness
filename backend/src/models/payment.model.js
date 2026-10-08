import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { decimal, uuidKey } from '../utils/model-types.js';

/** Pago registrado por el coach. */
export const Payment = sequelize.define(
  'Payment',
  {
    id: uuidKey,
    clientId: { type: DataTypes.UUID, allowNull: false },
    paidOn: { type: DataTypes.DATEONLY, allowNull: false },
    amount: decimal('amount', 10, 2),
    method: DataTypes.STRING(40),
    // Vencimiento que este pago cubrió y fecha en que quedó el siguiente.
    dueDate: DataTypes.DATEONLY,
    nextDueDate: DataTypes.DATEONLY,
    notes: DataTypes.TEXT,
  },
  { tableName: 'payments' },
);
