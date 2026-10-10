import { CardioProtocol, Exercise, Food, Muscle, Supplement, WarmupProtocol } from '../models/index.js';
import { ACTIVITY_LEVELS, DIET_TYPES, GOALS } from './calculations/nutrition.js';

/** Tipos de alimento que admite cada tipo de alimentación; null = todos. */
const DIET_FOOD_TYPES = {
  omnivore: null,
  flexitarian_70: null,
  flexitarian_50: null,
  pescatarian: ['Huevo/lácteo', 'Miel', 'Vegetal', 'Pescado/marisco'],
  vegetarian: ['Huevo/lácteo', 'Miel', 'Vegetal'],
  vegan: ['Vegetal'],
};

export const LISTS = {
  activityLevels: ACTIVITY_LEVELS,
  goals: GOALS,
  dietTypes: DIET_TYPES.map((type) => ({ ...type, foodTypes: DIET_FOOD_TYPES[type.key] })),
  formulas: [
    { key: 'mifflin', label: 'Mifflin-St Jeor' },
    { key: 'harris', label: 'Harris-Benedict' },
  ],
  foodTypes: ['Vegetal', 'Carne/pollo', 'Pescado/marisco', 'Huevo/lácteo', 'Miel'],
  foodStyles: ['Dulce', 'Salado', 'Ambos'],
  mealStyles: ['Mixto', 'Dulce', 'Salado'],
  roundTo: [1, 5, 10],
  mealCounts: [1, 2, 3, 4, 5, 6, 7, 8],
  blockPhases: ['Adaptación', 'Acumulación', 'Descarga', 'Mantenimiento'],
  cardioTypes: ['Continuo', 'Intervalos', 'NEAT', 'Mixto'],
  cardioMoments: ['Antes del entreno', 'Después del entreno', 'Sesión aparte', 'Día de descanso'],
  symbols: [
    { symbol: '🎥', label: 'Video', hint: 'Mándame video del ejercicio en tu primer set efectivo desde una posición conveniente, con el peso que usas típicamente.' },
    { symbol: '🔥', label: 'Fallo', hint: 'Última serie al fallo muscular con la misma carga de las series previas. Grábate para evaluar técnica y esfuerzo.' },
    { symbol: '🆕', label: 'Nuevo', hint: 'Ejercicio nuevo o modificado. Empieza conservador y prioriza técnica.' },
    { symbol: '⬆️', label: 'Subir carga', hint: 'Aumenta la carga para respetar las repeticiones pautadas y el RIR indicado.' },
  ],
  planTypes: ['Mensual', 'Trimestral', 'Semestral', 'Anual', 'Personalizado'],
  trainingPlaces: ['Gym comercial', 'Gym privado', 'Casa', 'Mixto'],
  levels: ['Principiante', 'Intermedio', 'Avanzado'],
  workActivity: ['Sedentaria', 'Ligera', 'Activa', 'Muy activa'],
  medicalClearance: ['No requiere', 'Sí', 'Pendiente'],
  checkinRatings: [
    { key: 'energy', label: 'Nivel de energía / fatiga', options: ['Con mucha energía', 'Con energía', 'Normal', 'Más cansado de lo normal', 'Siempre cansado'] },
    { key: 'sleep', label: 'Calidad del sueño', options: ['Muy descansado, 8+ h', 'Descansado, 7–8 h', 'Dificultad para dormir, ~6 h', 'Sueño irregular, < 5 h o intermitente', 'Insomnio'] },
    { key: 'soreness', label: 'Dolor muscular general', options: ['Sin dolor y con capacidad aumentada', 'Sin dolor', 'Normal', 'Más dolor y tensión de lo habitual', 'Con dolor la mayor parte del tiempo'] },
    { key: 'stress', label: 'Nivel de estrés', options: ['Muy relajado', 'Relajado', 'Normal', 'Estresado', 'Muy estresado'] },
    { key: 'mood', label: 'Estado de ánimo', options: ['Muy positivo', 'Bueno en general', 'Falta de interés', 'Apático con los demás', 'Irritado y molesto'] },
    { key: 'nutrition', label: 'Alimentación (adherencia)', options: ['Muy buena, 90–100 %', 'Buena, 80–90 %', 'Irregular, 70–80 %', 'Mala, 50–60 %', 'Pésima'] },
    { key: 'injury', label: 'Vulnerabilidad a lesiones', options: ['Cero molestias', 'Molestia leve que no limita', 'Molestia que ajusto en algún ejercicio', 'Dolor que me limita en varios ejercicios', 'Dolor que me impide entrenar'] },
  ],
  checkinQuestions: [
    { key: 'discomfort', label: 'Si marcaste molestias: ¿dónde las percibes, desde cuándo y en qué movimientos?' },
    { key: 'nutrition', label: '¿Cómo fue tu alimentación esta semana?' },
    { key: 'stress', label: 'Factores que te generaron estrés adicional' },
    { key: 'selfPerception', label: '¿Cómo te percibes y sientes física / estéticamente?' },
    { key: 'comments', label: 'Comentarios adicionales para tu coach' },
  ],
  measurements: [
    { key: 'weight', label: 'Peso', unit: 'kg' },
    { key: 'bodyFat', label: '% Grasa (opcional)', unit: '%' },
    { key: 'neck', label: 'Cuello', unit: 'cm' },
    { key: 'shoulders', label: 'Hombros', unit: 'cm' },
    { key: 'chest', label: 'Tórax', unit: 'cm' },
    { key: 'waist', label: 'Cintura', unit: 'cm' },
    { key: 'abdomen', label: 'Abdomen (ombligo)', unit: 'cm' },
    { key: 'hips', label: 'Cadera / Glúteo', unit: 'cm' },
    { key: 'armRight', label: 'Brazo derecho contraído', unit: 'cm' },
    { key: 'armLeft', label: 'Brazo izquierdo contraído', unit: 'cm' },
    { key: 'forearmRight', label: 'Antebrazo derecho', unit: 'cm' },
    { key: 'forearmLeft', label: 'Antebrazo izquierdo', unit: 'cm' },
    { key: 'thighRight', label: 'Muslo derecho', unit: 'cm' },
    { key: 'thighLeft', label: 'Muslo izquierdo', unit: 'cm' },
    { key: 'calfRight', label: 'Pantorrilla derecha', unit: 'cm' },
    { key: 'calfLeft', label: 'Pantorrilla izquierda', unit: 'cm' },
  ],
};

export async function loadCatalog() {
  const [muscles, cardioProtocols, warmupProtocols, foods, supplements] = await Promise.all([
    Muscle.findAll({
      include: [{ model: Exercise, as: 'exercises', attributes: ['id', 'name', 'sortOrder', 'movement', 'description'] }],
      order: [
        ['sortOrder', 'ASC'],
        [{ model: Exercise, as: 'exercises' }, 'sortOrder', 'ASC'],
        [{ model: Exercise, as: 'exercises' }, 'name', 'ASC'],
      ],
    }),
    CardioProtocol.findAll({ order: [['sortOrder', 'ASC']] }),
    WarmupProtocol.findAll({ order: [['sortOrder', 'ASC']] }),
    Food.findAll({ order: [['name', 'ASC']] }),
    Supplement.findAll({ order: [['id', 'ASC']] }),
  ]);
  return { muscles, cardioProtocols, warmupProtocols, foods, supplements };
}
