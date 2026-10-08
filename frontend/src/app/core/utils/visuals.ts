// Apoyo visual de los catálogos. Cada elemento puede llevar el ícono que el coach eligió;
// si no eligió ninguno, se deduce del nombre: cómo se ve un alimento, qué tipo de movimiento
// es un ejercicio y con qué equipo se hace.

/** Familias de color de la interfaz (ver las clases .tone--* en panel-ui.css). */
export type Tone = 'emerald' | 'steel' | 'amber' | 'coral' | 'slate' | 'teal';

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

/** Emoji de un alimento: el elegido por el coach o, si no hay, el que corresponde a su nombre. */
export function foodEmoji(name: string, chosen?: string | null): string {
  return chosen || firstMatch(name, FOOD_EMOJI, '🍽️');
}

export interface EmojiGroup {
  label: string;
  emojis: string[];
}

/** Opciones del selector de ícono de alimentos, por familia. */
export const FOOD_EMOJI_CHOICES: EmojiGroup[] = [
  { label: 'Carnes, huevo y pescado', emojis: ['🥩', '🍗', '🍖', '🥓', '🍔', '🌭', '🥚', '🍳', '🐟', '🍣', '🍤', '🦐', '🦀', '🦑', '🐙'] },
  { label: 'Lácteos y bebidas', emojis: ['🥛', '🧀', '🍦', '🥤', '🧃', '☕', '🍵', '🍶', '🧉', '💧'] },
  { label: 'Cereales y tubérculos', emojis: ['🍚', '🍙', '🍘', '🍞', '🥖', '🥐', '🥯', '🥞', '🧇', '🥣', '🌾', '🌽', '🥔', '🍠', '🍝', '🍜', '🌮', '🌯', '🥨', '🥪', '🍕'] },
  { label: 'Leguminosas y platillos', emojis: ['🍲', '🥘', '🥡', '🥗', '🍛', '🥫', '🍱', '🥙'] },
  { label: 'Verduras', emojis: ['🥦', '🥬', '🥒', '🥕', '🍅', '🧅', '🧄', '🍄', '🌶️', '🍆', '🌵', '🌱'] },
  { label: 'Frutas', emojis: ['🍎', '🍏', '🍌', '🍓', '🍇', '🍊', '🍋', '🍍', '🥭', '🍈', '🍉', '🍐', '🍑', '🍒', '🥝', '🥥'] },
  { label: 'Grasas y otros', emojis: ['🥑', '🥜', '🌰', '🧈', '🍯', '🍫', '🍪', '🧂', '⚡', '🍽️'] },
];

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

export const supplementEmoji = (name: string, chosen?: string | null) => chosen || firstMatch(name, SUPPLEMENT_EMOJI, '💊');

export const SUPPLEMENT_EMOJI_CHOICES: EmojiGroup[] = [
  { label: 'Suplementos', emojis: ['💊', '💪', '⚡', '☕', '🥤', '🧃', '🧪', '💧', '☀️', '🌙', '🍊', '🐟', '🦴', '🦠', '🔩', '🌿', '🍵', '🧂', '❤️', '🧠', '😴', '🛡️', '🔥', '🥛'] },
];

/** Grupo AIS: A = evidencia sólida, B = emergente, C/D = poca o nula. */
export function aisTone(group: unknown): Tone {
  return group === 'A' ? 'emerald' : group === 'B' ? 'steel' : group === 'C' ? 'amber' : group === 'D' ? 'coral' : 'slate';
}

// ---------------------------------------------------------------- Ejercicios

export const MOVEMENT_LABELS = {
  squat: 'Sentadilla',
  legPress: 'Prensa',
  lunge: 'Zancada',
  hinge: 'Peso muerto / bisagra de cadera',
  hipThrust: 'Hip thrust / puente',
  legExtension: 'Extensión de pierna',
  legCurl: 'Curl de pierna',
  abduction: 'Abducción / aducción de cadera',
  calf: 'Elevación de talones',
  pushH: 'Press en banco',
  fly: 'Cruce de poleas / aperturas',
  dip: 'Fondos',
  pushup: 'Flexiones',
  pushV: 'Press sobre la cabeza',
  lateral: 'Elevación lateral',
  extension: 'Extensión de tríceps',
  pull: 'Jalón / dominada',
  row: 'Remo',
  shrug: 'Encogimiento de hombros',
  curl: 'Curl de brazo',
  core: 'Crunch abdominal',
  plank: 'Plancha',
} as const;

export type MovementPattern = keyof typeof MOVEMENT_LABELS;

export const MOVEMENT_PATTERNS = Object.keys(MOVEMENT_LABELS) as MovementPattern[];

// El orden importa: los casos específicos van antes que los generales.
const PATTERNS: [RegExp, MovementPattern][] = [
  [/plancha|plank|pallof|rueda abdominal/, 'plank'],
  [/crunch|flexion de tronco|elevacion de (piernas|rodillas)|encogimiento de piernas/, 'core'],
  [/flexion plantar/, 'calf'],
  [/extension de cuadriceps|sissy/, 'legExtension'],
  [/curl de isquio|curl nordico/, 'legCurl'],
  [/hip thrust|puente/, 'hipThrust'],
  [/prensa/, 'legPress'],
  [/zancada|bulgara|step up/, 'lunge'],
  [/sentadilla|hack/, 'squat'],
  [/peso muerto|buenos dias|hiperextension/, 'hinge'],
  [/patada de gluteo|abduccion|adduccion|aduccion|copenhagen/, 'abduction'],
  [/elevaciones laterales|pajaros|apertura posterior|face pull|remo al menton/, 'lateral'],
  [/encogimientos/, 'shrug'],
  [/jalon|dominadas|pulldown|pullover/, 'pull'],
  [/remo/, 'row'],
  [/fondos/, 'dip'],
  [/flexiones/, 'pushup'],
  [/aperturas|cruce de poleas|pec deck/, 'fly'],
  [/press frances|press cerrado|extension|patada de triceps/, 'extension'],
  [/press militar|press de hombro|press arnold|press tras nuca|elevaciones frontales/, 'pushV'],
  [/press/, 'pushH'],
  [/curl|paseo del granjero/, 'curl'],
];

const MUSCLE_PATTERN: [RegExp, MovementPattern][] = [
  [/abdomen/, 'core'],
  [/gastrocnemio|soleo/, 'calf'],
  [/cuadriceps/, 'squat'],
  [/isquio/, 'hinge'],
  [/gluteo/, 'hipThrust'],
  [/aductor/, 'abduction'],
  [/deltoides (lateral|posterior)/, 'lateral'],
  [/dorsal/, 'pull'],
  [/trapecio/, 'shrug'],
  [/espalda/, 'row'],
  [/deltoides anterior/, 'pushV'],
  [/pectoral/, 'pushH'],
  [/triceps/, 'extension'],
  [/biceps|antebrazo/, 'curl'],
];

/**
 * Tipo de movimiento de un ejercicio: el que eligió el coach o, si no eligió, el que se deduce
 * del nombre (y del músculo cuando el nombre no lo dice).
 */
export function movementPattern(exercise: string, muscle = '', chosen?: string | null): MovementPattern | null {
  if (chosen && chosen in MOVEMENT_LABELS) return chosen as MovementPattern;
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

/** Nombres de sesión que se sugieren al armar el split. */
export const SESSION_NAMES = ['Torso', 'Pierna', 'Empuje', 'Tracción', 'Full body', 'Brazos', 'Glúteo', 'Pecho / espalda', 'Hombro / brazo'];

/** Color de una sesión según lo que entrena; así los días se distinguen de un vistazo. */
export function sessionTone(session: string | null | undefined): Tone {
  return firstMatch<Tone>(
    session ?? '',
    [
      [/descanso/, 'slate'],
      [/pierna|gluteo|inferior|cuadriceps|femoral|isquio/, 'amber'],
      [/traccion|espalda|dorsal|pull|jalon/, 'emerald'],
      [/empuje|pecho|push|hombro|torso|superior/, 'steel'],
      [/brazo|biceps|triceps/, 'coral'],
      [/full|completo|cuerpo|circuito/, 'teal'],
    ],
    'emerald',
  );
}

/** Zonas del cuerpo en que se clasifican los músculos; cada una tiene su color. */
export const MUSCLE_REGIONS: { key: MuscleRegion; label: string; tone: Tone }[] = [
  { key: 'push', label: 'Empuje · tren superior', tone: 'steel' },
  { key: 'pull', label: 'Tracción · tren superior', tone: 'emerald' },
  { key: 'legs', label: 'Tren inferior', tone: 'amber' },
  { key: 'core', label: 'Core', tone: 'coral' },
];

export type MuscleRegion = 'push' | 'pull' | 'legs' | 'core';

/** Zona de un músculo: la que eligió el coach o la que corresponde a su nombre. */
export function muscleRegionKey(muscle: string, chosen?: string | null): MuscleRegion | null {
  if (chosen && MUSCLE_REGIONS.some((region) => region.key === chosen)) return chosen as MuscleRegion;
  return firstMatch<MuscleRegion | null>(
    muscle,
    [
      [/abdomen|core|oblicuo|lumbar/, 'core'],
      [/cuadriceps|isquio|gluteo|aductor|abductor|gastrocnemio|soleo|pierna|pantorrilla/, 'legs'],
      [/pectoral|deltoides (anterior|lateral)|triceps|hombro/, 'push'],
      [/espalda|dorsal|trapecio|deltoides posterior|biceps|antebrazo/, 'pull'],
    ],
    null,
  );
}

export function muscleTone(muscle: string, chosen?: string | null): Tone {
  const key = muscleRegionKey(muscle, chosen);
  return MUSCLE_REGIONS.find((region) => region.key === key)?.tone ?? 'slate';
}

export function muscleRegion(muscle: string, chosen?: string | null): string {
  const key = muscleRegionKey(muscle, chosen);
  return MUSCLE_REGIONS.find((region) => region.key === key)?.label ?? 'Sin categoría';
}
