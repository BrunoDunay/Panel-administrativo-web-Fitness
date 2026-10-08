// Apoyo visual de los catálogos: a partir del nombre se deduce cómo se ve un alimento,
// qué tipo de movimiento es un ejercicio y con qué equipo se hace. Así también lo que el
// coach agregue después recibe su imagen sin capturar nada extra.

/** Familias de color de la interfaz (ver las clases .tone--* en panel-ui.css). */
export type Tone = 'emerald' | 'steel' | 'amber' | 'coral' | 'slate';

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

function firstMatch<T>(text: string, rules: [RegExp, T][], fallback: T): T {
  const value = normalize(text);
  return rules.find(([pattern]) => pattern.test(value))?.[1] ?? fallback;
}

// ---------------------------------------------------------------- Alimentos

// Solo emojis anteriores a 2020 (Emoji 12 o menos): los más nuevos no existen en Windows 10
// y se verían como un recuadro vacío.

const FOOD_EMOJI: [RegExp, string][] = [
  [/aguacate/, '🥑'],
  [/aceite/, '🍶'],
  [/aceituna/, '🥗'],
  [/crema de (cacahuate|almendra)|cacahuate|almendra|nuez|pistache/, '🥜'],
  [/chia|semilla|amaranto/, '🌾'],
  [/chocolate/, '🍫'],
  [/brocoli|coliflor/, '🥦'],
  [/calabacita|pepino/, '🥒'],
  [/cebolla/, '🧅'],
  [/champinon|hongo/, '🍄'],
  [/jitomate|tomate/, '🍅'],
  [/zanahoria/, '🥕'],
  [/pimiento|chile/, '🌶️'],
  [/nopal/, '🌵'],
  [/ejote|chicharo/, '🥒'],
  [/acelga|espinaca|lechuga|apio|col\b|kale/, '🥬'],
  [/arandano|mora/, '🍇'],
  [/fresa|frambuesa/, '🍓'],
  [/manzana/, '🍎'],
  [/platano/, '🍌'],
  [/naranja|mandarina|toronja/, '🍊'],
  [/uva/, '🍇'],
  [/pina/, '🍍'],
  [/mango|papaya/, '🥭'],
  [/melon/, '🍈'],
  [/sandia/, '🍉'],
  [/pera/, '🍐'],
  [/durazno/, '🍑'],
  [/kiwi/, '🥝'],
  [/arroz inflado|galleta/, '🍘'],
  [/arroz/, '🍚'],
  [/avena|cereal|granola/, '🥣'],
  [/bagel/, '🥯'],
  [/tortilla/, '🌮'],
  [/pan\b|pan /, '🍞'],
  [/camote/, '🍠'],
  [/papa/, '🥔'],
  [/pasta|espagueti|fideo/, '🍝'],
  [/elote|maiz/, '🌽'],
  [/frijol|lenteja|garbanzo|soya|haba/, '🍲'],
  [/tofu/, '🥡'],
  [/huevo|clara/, '🥚'],
  [/pollo|pavo/, '🍗'],
  [/jamon/, '🥓'],
  [/res|arrachera|bistec|carne|cecina|cerdo|chuleta|lomo|filete de res/, '🥩'],
  [/camaron/, '🍤'],
  [/surimi/, '🦀'],
  [/atun|sardina|pescado|salmon/, '🐟'],
  [/queso|requeson/, '🧀'],
  [/yoghurt|yogur/, '🥛'],
  [/whey|proteina/, '🥤'],
  [/gatorade|bebida/, '🧃'],
  [/gel/, '⚡'],
  [/miel/, '🍯'],
  [/leche/, '🥛'],
];

export function foodEmoji(name: string): string {
  return firstMatch(name, FOOD_EMOJI, '🍽️');
}

export interface FoodFlags {
  asProtein?: boolean;
  asCarb?: boolean;
  asFat?: boolean;
  asVegetable?: boolean;
  asFruit?: boolean;
}

/** Color del alimento según el papel que juega en el plan. */
export function foodTone(food: FoodFlags): Tone {
  if (food.asVegetable) return 'emerald';
  if (food.asProtein) return 'coral';
  if (food.asFat) return 'amber';
  if (food.asFruit || food.asCarb) return 'steel';
  return 'slate';
}

export function foodRole(food: FoodFlags): string {
  const roles = [food.asProtein && 'Proteína', food.asCarb && 'Carbo', food.asFat && 'Grasa', food.asVegetable && 'Verdura', food.asFruit && 'Fruta'].filter(Boolean);
  return roles.join(' · ') || '—';
}

// ---------------------------------------------------------------- Suplementos

const SUPPLEMENT_EMOJI: [RegExp, string][] = [
  [/creatina/, '💪'],
  [/cafeina/, '☕'],
  [/proteina|whey/, '🥤'],
  [/bicarbonato/, '🧪'],
  [/nitrato|betabel/, '🧃'],
  [/bebida/, '🧃'],
  [/gel|beta-alanina/, '⚡'],
  [/electrolito/, '💧'],
  [/vitamina d/, '☀️'],
  [/vitamina c/, '🍊'],
  [/hierro/, '🔩'],
  [/pescado|omega/, '🐟'],
  [/colageno|gelatina/, '🦴'],
  [/probiotico/, '🦠'],
  [/magnesio/, '🌙'],
];

export const supplementEmoji = (name: string) => firstMatch(name, SUPPLEMENT_EMOJI, '💊');

/** Grupo AIS: A = evidencia sólida, B = emergente, C/D = poca o nula. */
export function aisTone(group: unknown): Tone {
  return group === 'A' ? 'emerald' : group === 'B' ? 'steel' : group === 'C' ? 'amber' : group === 'D' ? 'coral' : 'slate';
}

// ---------------------------------------------------------------- Ejercicios

export type MovementPattern = 'squat' | 'hinge' | 'pushH' | 'pushV' | 'pull' | 'row' | 'curl' | 'extension' | 'lateral' | 'core' | 'calf';

export const MOVEMENT_LABELS: Record<MovementPattern, string> = {
  squat: 'Sentadilla / empuje de pierna',
  hinge: 'Bisagra de cadera',
  pushH: 'Empuje horizontal',
  pushV: 'Empuje vertical',
  pull: 'Jalón vertical',
  row: 'Remo / tracción horizontal',
  curl: 'Flexión (curl)',
  extension: 'Extensión',
  lateral: 'Elevación / abducción',
  core: 'Core',
  calf: 'Flexión plantar',
};

// El orden importa: los casos específicos van antes que los generales.
const PATTERNS: [RegExp, MovementPattern][] = [
  [/plancha|plank|crunch|rueda abdominal|pallof|elevacion de (piernas|rodillas)|encogimiento de piernas|flexion de tronco/, 'core'],
  [/flexion plantar/, 'calf'],
  [/extension de cuadriceps|sissy/, 'extension'],
  [/curl de isquio|curl nordico/, 'curl'],
  [/sentadilla|prensa|zancada|step up/, 'squat'],
  [/peso muerto|buenos dias|hip thrust|puente|hiperextension|patada de gluteo/, 'hinge'],
  [/abduccion|adduccion|aduccion|elevaciones laterales|pajaros|apertura posterior|face pull|remo al menton/, 'lateral'],
  [/jalon|dominadas|pulldown|pullover/, 'pull'],
  [/remo|encogimientos/, 'row'],
  [/press frances|press cerrado|extension|patada de triceps|fondos en maquina|enfasis triceps/, 'extension'],
  [/press militar|press de hombro|press arnold|press tras nuca|elevaciones frontales/, 'pushV'],
  [/press|aperturas|cruce de poleas|fondos|flexiones/, 'pushH'],
  [/curl|paseo del granjero/, 'curl'],
];

const MUSCLE_PATTERN: [RegExp, MovementPattern][] = [
  [/abdomen/, 'core'],
  [/gastrocnemio|soleo/, 'calf'],
  [/cuadriceps/, 'squat'],
  [/isquio|gluteo/, 'hinge'],
  [/aductor|deltoides (lateral|posterior)/, 'lateral'],
  [/dorsal/, 'pull'],
  [/espalda|trapecio/, 'row'],
  [/deltoides anterior/, 'pushV'],
  [/pectoral/, 'pushH'],
  [/triceps/, 'extension'],
  [/biceps|antebrazo/, 'curl'],
];

/** Naturaleza del movimiento, deducida del nombre del ejercicio (o del músculo si el nombre no lo dice). */
export function movementPattern(exercise: string, muscle = ''): MovementPattern | null {
  const byName = firstMatch<MovementPattern | null>(exercise, PATTERNS, null);
  return byName ?? firstMatch<MovementPattern | null>(muscle, MUSCLE_PATTERN, null);
}

const EQUIPMENT: [RegExp, string][] = [
  [/smith/, 'Smith'],
  [/polea|jalon|pulldown|face pull|cruce/, 'Polea'],
  [/maquina|hack|prensa|pec deck|pendulo/, 'Máquina'],
  [/mancuerna/, 'Mancuernas'],
  [/barra|peso muerto|hip thrust con|press de banca/, 'Barra'],
  [/banda/, 'Banda'],
  [/fitball/, 'Fitball'],
  [/dominadas|fondos|flexiones|plancha|plank|nordico|colgado|rueda|sissy|zancadas|step up|invertido/, 'Peso corporal'],
];

export const exerciseEquipment = (exercise: string) => firstMatch(exercise, EQUIPMENT, '');

/** Zona del cuerpo de cada músculo: da color a las tarjetas del catálogo de ejercicios. */
export function muscleTone(muscle: string): Tone {
  return firstMatch<Tone>(
    muscle,
    [
      [/abdomen/, 'coral'],
      [/cuadriceps|isquio|gluteo|aductor|gastrocnemio|soleo/, 'amber'],
      [/pectoral|deltoides (anterior|lateral)|triceps/, 'steel'],
      [/espalda|dorsal|trapecio|deltoides posterior|biceps|antebrazo/, 'emerald'],
    ],
    'slate',
  );
}

export function muscleRegion(muscle: string): string {
  return { coral: 'Core', amber: 'Tren inferior', steel: 'Empuje · tren superior', emerald: 'Tracción · tren superior', slate: 'Otros' }[muscleTone(muscle)];
}
