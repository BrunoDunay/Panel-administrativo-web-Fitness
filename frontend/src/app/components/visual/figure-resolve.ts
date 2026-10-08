import { MovementPattern, movementPattern } from '../../core/utils/visuals';
import { FIGURES, FigureEntry, figureKey } from './exercise-figures';

/** Dibujo representativo de cada tipo de movimiento: para ejercicios nuevos y para lo guardado antes. */
const BY_PATTERN: Record<MovementPattern, string> = {
  squat: 'sentadilla-con-barra-alta',
  legPress: 'prensa-45',
  lunge: 'zancadas-caminando',
  hinge: 'peso-muerto-rumano-con-barra',
  hipThrust: 'hip-thrust-con-barra',
  legExtension: 'extension-de-cuadriceps-bilateral',
  legCurl: 'curl-de-isquiosurales-sentado-en-maquina',
  abduction: 'abduccion-de-cadera-en-maquina',
  calf: 'flexion-plantar-de-pie-en-maquina-rodilla-extendida',
  pushH: 'press-de-banca-plano-con-barra',
  fly: 'cruce-de-poleas-altas',
  dip: 'fondos-en-paralelas-enfasis-triceps',
  pushup: 'flexiones-lastradas',
  pushV: 'press-militar-con-barra-de-pie',
  lateral: 'elevaciones-laterales-con-mancuernas',
  extension: 'extension-de-triceps-en-polea-con-cuerda',
  pull: 'jalon-al-pecho-agarre-prono',
  row: 'remo-con-barra-codos-pegados',
  shrug: 'encogimientos-con-barra',
  curl: 'curl-con-barra-recta',
  core: 'crunch-en-maquina',
  plank: 'plancha',
};

const FALLBACK = BY_PATTERN.squat;
const FILLER = new Set(['de', 'del', 'con', 'en', 'la', 'el', 'los', 'las', 'a', 'al', 'un', 'una', 'para', 'por', 'y']);
const EQUIPMENT = new Set(['barra', 'mancuerna', 'smith', 'polea', 'maquina', 'banda', 'fitball', 'cuerda', 'banco', 'cajon']);

/** Palabras que cuentan de un nombre, en singular. */
const words = (name: string) =>
  figureKey(name)
    .split('-')
    .filter((word) => word.length > 1 && !FILLER.has(word))
    .map((word) => word.replace(/(es|s)$/, ''));

const INDEX = Object.values(FIGURES).map((entry) => ({ entry, words: words(entry.name), pattern: movementPattern(entry.name, entry.group) }));
const cache = new Map<string, FigureEntry>();

/**
 * Para un ejercicio que no está en el catálogo original: el dibujo cuyo nombre más se parece
 * (mismo movimiento y mismo equipo pesan más) o, si nada se parece, el de su tipo de movimiento.
 */
function nearest(exercise: string, muscle: string): FigureEntry {
  const query = words(exercise);
  const pattern = movementPattern(exercise, muscle);
  let best: FigureEntry | null = null;
  let bestScore = 2;
  for (const candidate of INDEX) {
    let score = pattern && candidate.pattern === pattern ? 1.5 : 0;
    for (const word of query) {
      if (!candidate.words.includes(word)) continue;
      score += word === query[0] && word === candidate.words[0] ? 3 : EQUIPMENT.has(word) ? 2 : 1;
    }
    if (score > bestScore) [best, bestScore] = [candidate.entry, score];
  }
  return best ?? FIGURES[pattern ? BY_PATTERN[pattern] : FALLBACK]!;
}

/** Clave guardada en el catálogo → dibujo. Acepta también los tipos de movimiento de antes. */
export function chosenFigure(chosen: string | null | undefined): FigureEntry | null {
  if (!chosen) return null;
  return FIGURES[chosen] ?? FIGURES[BY_PATTERN[chosen as MovementPattern]] ?? null;
}

/** El dibujo de un ejercicio: el que eligió el coach, el suyo propio o el más parecido. */
export function resolveFigure(exercise: string, muscle = '', chosen?: string | null): FigureEntry {
  const picked = chosenFigure(chosen);
  if (picked) return picked;
  const own = FIGURES[figureKey(exercise)];
  if (own) return own;
  const id = `${exercise}|${muscle}`;
  let found = cache.get(id);
  if (!found) cache.set(id, (found = nearest(exercise, muscle)));
  return found;
}
