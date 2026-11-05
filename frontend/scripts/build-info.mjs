// Al compilar en Netlify o Vercel guarda el commit y la fecha para la página "Acerca del sistema" del panel.
// En local no hace nada: build-info.ts se queda vacío y la página muestra "Compilación local".
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

if (!process.env.NETLIFY && !process.env.VERCEL && !process.env.CI && !process.env.BUILD_INFO) process.exit(0);

let commit = process.env.COMMIT_REF || process.env.VERCEL_GIT_COMMIT_SHA || '';
if (!commit) {
  try {
    commit = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    commit = '';
  }
}
const file = new URL('../src/app/core/system/build-info.ts', import.meta.url);
writeFileSync(
  file,
  `// Generado al compilar por scripts/build-info.mjs.\nexport const BUILD_INFO = { commit: '${commit.slice(0, 7)}', builtAt: '${new Date().toISOString()}' };\n`,
);
console.log(`build-info: ${commit.slice(0, 7) || 'sin commit'}`);
