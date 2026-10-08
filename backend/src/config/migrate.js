import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Umzug, SequelizeStorage } from 'umzug';
import { sequelize } from './database.js';

const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../migrations');

export const migrator = new Umzug({
  migrations: {
    glob: ['*.js', { cwd: migrationsDir }],
    resolve: ({ name, path: filePath, context }) => ({
      name,
      up: async () => (await import(pathToFileURL(filePath).href)).up({ context }),
      down: async () => (await import(pathToFileURL(filePath).href)).down({ context }),
    }),
  },
  context: sequelize,
  storage: new SequelizeStorage({ sequelize, tableName: 'schema_migrations' }),
  logger: undefined,
});

export async function runPendingMigrations() {
  const applied = await migrator.up();
  return applied.map((m) => m.name);
}

// Uso por CLI: node src/config/migrate.js up|down
const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const command = process.argv[2] ?? 'up';
  try {
    if (command === 'down') {
      const reverted = await migrator.down();
      console.log('Migraciones revertidas:', reverted.map((m) => m.name).join(', ') || 'ninguna');
    } else {
      const applied = await runPendingMigrations();
      console.log('Migraciones aplicadas:', applied.join(', ') || 'ninguna (todo al día)');
    }
  } catch (error) {
    console.error('Error al ejecutar migraciones:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}
