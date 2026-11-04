// Entrada para Vercel (funciones sin servidor). La instalación real sigue usando src/server.js en Render;
// este archivo solo lo usa la demostración. Hace lo mismo que el arranque normal, pero al recibir la
// primera petición, y en lugar de un temporizador revisa cada tanto si cambió el día.
import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { initializeData } from '../src/config/initialize-data.js';
import { runPendingMigrations } from '../src/config/migrate.js';

const REFRESH_CHECK_MS = 10 * 60 * 1000;
const app = createApp();
let ready = null;
let lastRefreshCheck = 0;

async function prepare() {
  await connectDatabase();
  await runPendingMigrations();
  await initializeData();
}

async function refreshIfNewDay() {
  if (!env.DEMO_MODE || Date.now() - lastRefreshCheck < REFRESH_CHECK_MS) return;
  lastRefreshCheck = Date.now();
  const { refreshDemoData } = await import('../src/config/demo-data.js');
  await refreshDemoData({ log: console.log });
}

export default async function handler(req, res) {
  try {
    ready ??= prepare().catch((error) => {
      ready = null;
      throw error;
    });
    await ready;
    await refreshIfNewDay();
  } catch (error) {
    console.error('No se pudo preparar el servidor:', error);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { message: 'El servidor se está preparando. Intenta de nuevo en unos segundos.', code: 'NOT_READY' } }));
    return;
  }
  return app(req, res);
}
