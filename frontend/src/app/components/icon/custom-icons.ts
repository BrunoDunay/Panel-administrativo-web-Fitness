import { IconShape } from './itshover-icons';

const stroke = (...paths: string[]): IconShape => ({ source: 'propio', viewBox: '0 0 24 24', filled: false, nodes: paths.map((d) => ({ tag: 'path', attrs: { d } })) });

/**
 * Iconos que no existen en itshover (sobre todo los de fitness), dibujados en el mismo estilo:
 * caja de 24, trazo redondeado de 2. Cada trazo va por separado para que la animación
 * de "dibujado" los recorra en orden.
 */
export const CUSTOM_ICONS = {
  dumbbell: stroke(
    'M9 12h6',
    'M6 7v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z',
    'M15 7v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1a1 1 0 0 0-1 1z',
    'M6 8H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2',
    'M18 8h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2',
    'M2 12h1',
    'M21 12h1',
  ),
  pill: stroke('M4.5 12.5l8-8a4.95 4.95 0 0 1 7 7l-8 8a4.95 4.95 0 0 1-7-7', 'M8.5 8.5l7 7'),
  plus: stroke('M12 5v14', 'M5 12h14'),
  menu: stroke('M4 6h16', 'M4 12h16', 'M4 18h16'),
  calendar: stroke('M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z', 'M16 3v4', 'M8 3v4', 'M4 11h16', 'M8 15h2v2H8z'),
  drop: stroke('M6.8 11.4a6 6 0 1 0 10.4 0L12 3z', 'M9.5 15a2.6 2.6 0 0 0 2.5 2'),
  ruler: stroke('M5 4h14a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-7a1 1 0 0 0-1 1v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1', 'M4 8h2', 'M4 12h3', 'M4 16h2', 'M8 4v2', 'M12 4v3', 'M16 4v2'),
  scale: stroke('M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z', 'M8.5 10.5a3.5 3.5 0 0 1 7 0z', 'M12 10.5l1.4-2'),
  run: stroke('M13 4m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0', 'M4 17l5 1l.75-1.5', 'M15 21v-4l-4-3l1-6', 'M7 12V9l5-1l3 3l3 1'),
  // Caminata y bicicleta: trazos de Tabler Icons (licencia MIT), mismo orden de partes que `run`.
  walk: stroke('M13 4m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0', 'M7 21l3-4', 'M16 21l-2-4l-3-3l1-6', 'M6 12l2-3l4-1l3 3l3 1'),
  bike: stroke('M5 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0', 'M19 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0', 'M12 19v-4l-3-3l5-4l2 3l3 0', 'M17 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0'),
  stretch: stroke('M16 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0', 'M5 20l5-.5l1-2', 'M18 20v-5h-5.5l2.5-6.5l-5.5 1l1.5 2'),
  swap: stroke('M7 10h14l-4-4', 'M17 14H3l4 4'),
  apple: stroke('M12 8c-2.6-1.8-7-.6-7 4.4C5 17 8 21 10 21c.9 0 1.4-.5 2-.5s1.1.5 2 .5c2 0 5-4 5-8.6C19 7.4 14.6 6.2 12 8', 'M12 8c0-2.2 1-3.6 3-4.5'),
  steps: stroke('M4 16v-2.4C4 11.5 5.3 9.5 5.5 8c.2-1.5 0-3 1.5-4s3 0 3.5 1.5c.5 1.4.5 3-.5 5.5-.6 1.5-1 2-1 5z', 'M4 16h5v1.5a2.5 2.5 0 0 1-5 0z', 'M20 20v-2.4c0-2.1-1.3-4.1-1.5-5.6-.2-1.5 0-3-1.5-4s-3 0-3.5 1.5c-.5 1.4-.5 3 .5 5.5.6 1.5 1 2 1 5z', 'M15 20h5v.5a2.5 2.5 0 0 1-5 0z'),
  tiktok: stroke('M21 7.9v4a10 10 0 0 1-5-1.9v4.5a6.5 6.5 0 1 1-8-6.3v4.3a2.5 2.5 0 1 0 4 2V3h4.1A6 6 0 0 0 21 7.9z'),
} satisfies Record<string, IconShape>;
