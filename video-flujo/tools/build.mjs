// Arma index.html a partir de la plantilla: inserta el isotipo vectorizado (una pieza por trazo) donde se usa.
// Uso: node tools/build.mjs
import fs from 'node:fs';
const dir = import.meta.dirname;
const { w, h, pieces } = JSON.parse(fs.readFileSync(`${dir}/mark-pieces.json`, 'utf8'));
// Mismo orden de construcción que el componente de la landing: [tipo, retraso ms, dx, dy]
const PLAN = { 3: ['plate', 380, -70, 0], 9: ['plate', 380, 70, 0], 1: ['plate', 470, -70, 0], 2: ['plate', 470, -70, 0], 10: ['plate', 470, 70, 0], 0: ['plate', 560, -70, 0], 11: ['plate', 560, 70, 0], 12: ['plate', 640, 70, 0], 4: ['hex', 720, 0, 0], 5: ['hex', 860, 0, 0], 6: ['hex', 1040, -30, -17], 7: ['hex', 1120, -30, -17], 8: ['hex', 1200, -30, -17] };
const round = (d) => d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n) * 10) / 10));
const mark = (id, animated) => `<svg class="mark" id="${id}-svg" viewBox="0 0 ${w} ${h}" aria-hidden="true">${animated ? `<line class="axis" x1="0" y1="263" x2="${w}" y2="263" pathLength="1" />` : ''}${pieces.map((p, i) => { const [kind, d, dx, dy] = PLAN[i]; return `<path class="${animated ? kind + ' ' : ''}${p.color}" ${animated ? `pathLength="1" data-d="${d}" data-dx="${dx}" data-dy="${dy}" ` : ''}d="${round(p.d)}" />`; }).join('')}</svg>`;
const check = (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>`;
let html = fs.readFileSync(`${dir}/index.template.html`, 'utf8');
html = html.replace('{{MARK:hud}}', mark('hud', false)).replace('{{MARK:s0}}', mark('s0m', true)).replace('{{MARK:s6}}', mark('s6m', true));
html = html.replaceAll('{{CHECK}}', check('#06110f')).replaceAll('{{CHECKW}}', check('#ffffff'));
fs.writeFileSync(`${dir}/../index.html`, html);
console.log('index.html', html.length);

// Versión vertical: mismas escenas y misma línea de tiempo, con los estilos reacomodados en columna.
const vertical = html
  .replace('width=1920, height=1080', 'width=1080, height=1920')
  .replace('data-width="1920" data-height="1080"', 'data-width="1080" data-height="1920"')
  .replace('</style>', `${fs.readFileSync(`${dir}/vertical.css`, 'utf8')}</style>`);
fs.writeFileSync(`${dir}/../../video-flujo-vertical/index.html`, vertical);
console.log('vertical', vertical.length);
