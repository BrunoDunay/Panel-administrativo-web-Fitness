import pg from 'pg';
import { Sequelize } from 'sequelize';
import { env } from './env.js';

export const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: 'postgres',
  // Explícito para que los empaquetadores (Vercel) incluyan el controlador.
  dialectModule: pg,
  logging: false,
  dialectOptions: env.DATABASE_SSL ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  define: {
    underscored: true,
    timestamps: true,
  },
  pool: { max: 10, min: 0, idle: 10_000 },
});

export async function connectDatabase() {
  await sequelize.authenticate();
}
