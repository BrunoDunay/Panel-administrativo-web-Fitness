import { defineConfig } from 'vitest/config';

// Las pruebas de integración (tests/*.integration.test.js) solo corren si TEST_DATABASE_URL
// apunta a una base PostgreSQL desechable: la vacían por completo antes de empezar.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://test:test@localhost:5432/fbe_test',
      JWT_SECRET: 'test-secret-test-secret-test-secret-1234',
      ADMIN_EMAIL: 'coach@example.com',
      ADMIN_PASSWORD: 'test-password-123',
    },
  },
});
