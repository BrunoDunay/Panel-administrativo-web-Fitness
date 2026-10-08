// Extrae los trazos SVG de los iconos de itshover (React + Motion) a un archivo TypeScript
// que consume el componente <app-icon> de Angular. Solo LEE los .tsx como texto: no ejecuta
// nada del repositorio.
//
// Uso: node extract.mjs <carpeta-del-repo-itshover> <mapa.json> <salida.ts>
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const [, , repoDir, mapFile, outFile] = process.argv;
if (!repoDir || !mapFile || !outFile) {
  console.error('Uso: node extract.mjs <repo-itshover> <mapa.json> <salida.ts>');
  process.exit(1);
}

const SHAPES = ['path', 'circle', 'line', 'rect', 'polyline', 'polygon', 'ellipse'];
const KEEP = new Set(['d', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'points', 'fill', 'stroke', 'opacity']);

/** Atributos JSX de una etiqueta: name="texto" o name={número}. Las expresiones se ignoran. */
function attributes(source) {
  const attrs = {};
  for (const match of source.matchAll(/([a-zA-Z0-9]+)=(?:"([^"]*)"|\{\s*(-?[\d.]+)\s*\})/g)) {
    const [, name, text, number] = match;
    if (KEEP.has(name)) attrs[name] = text ?? number;
  }
  return attrs;
}

function extract(file) {
  const source = readFileSync(file, 'utf8');
  const svg = source.match(/<(?:motion\.)?svg\b([\s\S]*?)>([\s\S]*?)<\/(?:motion\.)?svg>/);
  if (!svg) return null;
  const viewBox = svg[1].match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 24 24';
  const filled = /\bfill=(?:"currentColor"|\{color\})/.test(svg[1]);

  const nodes = [];
  const shape = new RegExp(`<(?:motion\\.)?(${SHAPES.join('|')})\\b([\\s\\S]*?)\\/?>`, 'g');
  for (const [, tag, body] of svg[2].matchAll(shape)) {
    const attrs = attributes(body);
    // Rectángulo invisible que Tabler usa como caja del icono.
    if (attrs.d === 'M0 0h24v24H0z') continue;
    if (attrs.stroke && attrs.stroke !== 'none') delete attrs.stroke;
    if (attrs.fill && !['none', 'currentColor'].includes(attrs.fill)) delete attrs.fill;
    if (Object.keys(attrs).length) nodes.push({ tag, attrs });
  }
  return nodes.length ? { viewBox, filled, nodes } : null;
}

const map = JSON.parse(readFileSync(mapFile, 'utf8'));
const icons = {};
const missing = [];
for (const [name, source] of Object.entries(map)) {
  const file = path.join(repoDir, 'icons', `${source}.tsx`);
  const icon = existsSync(file) ? extract(file) : null;
  if (icon) icons[name] = { source, ...icon };
  else missing.push(`${name} (${source})`);
}

const body = Object.entries(icons)
  .map(([name, icon]) => `  ${JSON.stringify(name)}: ${JSON.stringify(icon)},`)
  .join('\n');

writeFileSync(
  outFile,
  `// GENERADO por .claude/skills/itshover-icons/scripts/extract.mjs — no editar a mano.
// Trazos de https://github.com/itshover/itshover (licencia MIT). Para agregar un icono,
// añádelo a itshover.map.json y vuelve a correr el script.

export interface IconNode {
  tag: string;
  attrs: Record<string, string>;
}

export interface IconShape {
  source: string;
  viewBox: string;
  /** Icono relleno (no de trazo). */
  filled: boolean;
  nodes: IconNode[];
}

export const ITSHOVER_ICONS = {
${body}
} satisfies Record<string, IconShape>;
`,
);

console.log(`${Object.keys(icons).length} iconos escritos en ${outFile}`);
if (missing.length) console.log(`No encontrados o sin trazos: ${missing.join(', ')}`);
