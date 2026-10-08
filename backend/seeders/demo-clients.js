// Clientes de ejemplo para probar el panel y el portal: distintos objetivos, planes y niveles
// de avance. Se identifican por su correo @demo.fbe.
//
//   npm run seed:demo            crea los que falten
//   npm run seed:demo -- --reset borra los de ejemplo y los vuelve a crear
import { Op } from 'sequelize';
import { sequelize } from '../src/config/database.js';
import { Client, Food, Payment, Supplement, WeekExercise } from '../src/models/index.js';
import { saveNutritionPlan } from '../src/services/nutrition.service.js';
import { saveCheckin, saveMeasurement, saveWeight } from '../src/services/tracking.service.js';
import { addWeek, findActivePlan, logWeek, savePlan, saveWeekPrescription } from '../src/services/training.service.js';
import { generateAccessCode } from '../src/utils/access-code.js';
import { addDays, mondayOf, todayInAppTz } from '../src/utils/dates-mx.js';

const DOMAIN = '@demo.fbe';
const today = todayInAppTz();
const daysAgo = (n) => addDays(today, -n);
const REST = 'Descanso';

/** Cuota de ejemplo por tipo de plan, para que el historial de pagos tenga montos. */
const FEES = { Mensual: 1500, Trimestral: 4000, Semestral: 7500, Anual: 14000 };

const none = { protocol: null, moment: null, notes: null };
const cardioWeek = (map) => Array.from({ length: 7 }, (_, i) => ({ ...none, ...(map[i + 1] ?? {}) }));
const warmupWeek = (map) => Array.from({ length: 7 }, (_, i) => ({ protocol: map[i + 1] ?? null, notes: null }));
const meals = (names) => Array.from({ length: 6 }, (_, i) => ({ name: names[i]?.[0] ?? `Comida ${i + 1}`, time: names[i]?.[1] ?? '', manual: {} }));

const W = {
  legsHeavy: 'Tren inferior · compuesto pesado (sentadilla, prensa, PM)',
  legsLight: 'Tren inferior · aislamiento y máquinas',
  push: 'Empuje · pecho / hombro / tríceps',
  pull: 'Tracción · espalda / bíceps',
  express: 'Full body · express (poco tiempo)',
};

// [día, músculo, ejercicio, series, reps, RIR, carga base (kg), reps logradas, notas?, símbolo?]
const ROUTINES = {
  upperLower: [
    [1, 'Cuádriceps', 'Sentadilla Hack', 3, '7 a 9', 3, 60, [9, 8, 8], null, '🎥'],
    [1, 'Glúteo', 'Hip thrust con barra', 3, '8 a 10', 3, 70, [10, 10, 9], 'Pausa de 1 s arriba'],
    [1, 'Isquiosurales', 'Curl de isquiosurales tumbado en máquina', 2, '10 a 12', 3, 30, [12, 11]],
    [1, 'Aductores', 'Adducción de cadera en máquina', 2, '10 a 12', 4, 40, [12, 12]],
    [2, 'Dorsal', 'Jalón al pecho agarre neutro', 3, '8 a 10', 3, 40, [10, 9, 9]],
    [2, 'Pectoral', 'Press inclinado con mancuernas', 2, '8 a 10', 3, 14, [10, 9]],
    [2, 'Deltoides lateral', 'Elevaciones laterales en polea unilateral', 3, '12 a 15', 2, 5, [15, 14, 13], null, '🔥'],
    [2, 'Bíceps', 'Curl bayesiano en polea', 2, '10 a 12', 2, 7.5, [12, 11]],
    [4, 'Glúteo', 'Sentadilla búlgara (énfasis glúteo)', 3, '8 a 10', 3, 12, [10, 9, 9]],
    [4, 'Cuádriceps', 'Extensión de cuádriceps bilateral', 3, '10 a 12', 2, 35, [12, 12, 11]],
    [4, 'Gastrocnemios', 'Flexión plantar de pie en máquina (rodilla extendida)', 3, '8 a 12', 2, 60, [12, 11, 10]],
    [5, 'Espalda alta', 'Remo en máquina con pecho apoyado agarre abierto', 3, '8 a 10', 3, 35, [10, 10, 9]],
    [5, 'Pectoral', 'Cruce de poleas altas', 2, '10 a 12', 2, 12.5, [12, 11]],
    [5, 'Tríceps', 'Extensión de tríceps en polea con cuerda', 2, '10 a 12', 2, 15, [12, 11]],
  ],
  pushPullLegs: [
    [1, 'Pectoral', 'Press de banca plano con barra', 4, '5 a 7', 2, 85, [7, 6, 6, 5], null, '⬆️'],
    [1, 'Deltoides anterior', 'Press militar sentado con mancuernas', 3, '8 a 10', 2, 24, [10, 9, 8]],
    [1, 'Tríceps', 'Press francés con barra Z', 3, '10 a 12', 2, 30, [12, 11, 10]],
    [2, 'Dorsal', 'Dominadas lastradas', 4, '5 a 8', 2, 15, [8, 7, 6, 6]],
    [2, 'Espalda alta', 'Remo en barra T', 3, '8 a 10', 2, 60, [10, 9, 9]],
    [2, 'Bíceps', 'Curl con barra Z', 3, '8 a 10', 2, 35, [10, 9, 8]],
    [3, 'Cuádriceps', 'Sentadilla con barra alta', 4, '5 a 7', 2, 120, [7, 6, 6, 5], 'Profundidad completa', '🎥'],
    [3, 'Isquiosurales', 'Peso muerto rumano con barra', 3, '8 a 10', 3, 100, [10, 9, 9]],
    [3, 'Gastrocnemios', 'Flexión plantar en prensa', 3, '10 a 12', 2, 140, [12, 12, 10]],
    [4, 'Pectoral', 'Press de banca inclinado con barra', 3, '6 a 8', 2, 70, [8, 7, 7]],
    [4, 'Deltoides lateral', 'Elevaciones laterales con mancuernas', 4, '12 a 15', 1, 10, [15, 14, 13, 12], null, '🔥'],
    [5, 'Dorsal', 'Jalón al pecho agarre prono', 3, '8 a 10', 2, 70, [10, 9, 8]],
    [5, 'Deltoides posterior', 'Face pull en polea con cuerda', 3, '12 a 15', 2, 25, [15, 14, 13]],
    [6, 'Cuádriceps', 'Prensa 45°', 3, '8 a 10', 2, 220, [10, 9, 9]],
    [6, 'Glúteo', 'Hip thrust con barra', 3, '8 a 10', 2, 140, [10, 10, 9]],
    [6, 'Abdomen', 'Crunch en máquina', 3, '10 a 12', 2, 40, [12, 12, 11]],
  ],
  fullBody: [
    [1, 'Cuádriceps', 'Sentadilla goblet', 3, '10 a 12', 4, 12, [12, 12, 11], 'Baja controlado', '🆕'],
    [1, 'Pectoral', 'Press en máquina convergente', 3, '10 a 12', 4, 20, [12, 11, 10]],
    [1, 'Dorsal', 'Jalón al pecho agarre neutro', 3, '10 a 12', 4, 30, [12, 12, 11]],
    [3, 'Isquiosurales', 'Peso muerto rumano con mancuernas', 3, '10 a 12', 4, 10, [12, 12, 12], null, '🎥'],
    [3, 'Deltoides anterior', 'Press de hombro en máquina', 3, '10 a 12', 4, 15, [12, 11, 10]],
    [3, 'Espalda alta', 'Remo en polea baja agarre abierto', 3, '10 a 12', 4, 25, [12, 12, 11]],
    [5, 'Glúteo', 'Hip thrust en máquina', 3, '10 a 12', 4, 40, [12, 12, 11]],
    [5, 'Abdomen', 'Plancha', 3, '30 s', null, 0, [30, 30, 25]],
    [5, 'Bíceps', 'Curl alterno con mancuernas de pie', 2, '10 a 12', 3, 6, [12, 11]],
  ],
};

const DEMO = [
  {
    client: {
      fullName: 'Mariana López Herrera', birthDate: '1995-03-12', sex: 'female', heightCm: 165, initialWeightKg: 64, city: 'Aguascalientes', occupation: 'Diseñadora', phone: '4491234567',
      profile: {
        health: { medicalClearance: 'No requiere', injuries: 'Molestia leve en rodilla derecha al bajar escaleras' },
        logistics: { planType: 'Trimestral', startDate: daysAgo(21), paymentDate: addDays(today, 3), daysPerWeek: 4, sessionMinutes: 75, trainingPlace: 'Gym comercial' },
        lifestyle: { sleepHours: 7, stressLevel: 3, dailySteps: 7000, workActivity: 'Sedentaria' },
        experience: { yearsTraining: 2, level: 'Intermedio' },
        nutrition: { mealsPerDay: 4, tracksNutrition: false },
      },
      coachNotes: 'Prioriza glúteo y cuádriceps. Revisar técnica de sentadilla Hack.',
    },
    training: {
      objective: { primary: 'Recomposición: más glúteo y cuádriceps', secondary: 'Mejorar postura y fuerza de espalda', startingPoint: 'Dos años entrenando sin programa estructurado.', trajectory: 'Subir 1.5 kg de masa magra en 16 semanas.' },
      blockPhase: 'Adaptación', blockWeeks: 4, split: ['Pierna', 'Torso', REST, 'Pierna', 'Torso', REST, REST],
      priorities: { p1: ['Glúteo', 'Cuádriceps'], p2: ['Dorsal', 'Deltoides lateral'], p3: ['Bíceps'], maintenance: ['Pectoral'], notes: { p1: { sets: '12–16', frequency: '2', strategy: 'Subir una serie por semana' } } },
      macroBlocks: [{ phase: 'Adaptación', weeks: 4, focus: 'Técnica y tolerancia al volumen' }, { phase: 'Acumulación', weeks: 5, focus: 'Subir series en prioritarios' }, { phase: 'Descarga', weeks: 1, focus: '−50 % series, misma carga' }],
      steps: { trainingDay: 9000, restDay: 10000 },
      cardio: cardioWeek({ 1: { protocol: 'Solo pasos' }, 3: { protocol: "LISS 45'", moment: 'Día de descanso' }, 6: { protocol: "Caminata inclinada 20'", moment: 'Día de descanso' } }),
      warmup: warmupWeek({ 1: W.legsHeavy, 2: W.push, 4: W.legsLight, 5: W.pull }),
    },
    routine: 'upperLower', weeks: 3, doneDaysLastWeek: 2, progression: 0.04,
    nutrition: {
      inputs: { weightKg: 64, activity: 'moderate', dietType: 'omnivore', goal: 'Superávit', adjustmentKcal: 150, proteinPerKg: 2, fatPct: 0.28, cycling: true, extraTrainingKcal: 300, trainingDays: [true, true, false, true, true, false, false], mealCount: 4, preWorkoutMeal: 3, postWorkoutMeal: 4, mealsMeta: meals([['Desayuno', '08:00'], ['Comida', '14:00'], ['Pre-entreno', '17:30'], ['Cena', '21:00']]) },
      meals: [
        { style: 'Mixto', protein1: 'Huevo entero fresco', protein2: 'Clara de huevo', carb1: 'Avena en hojuelas', fat: 'Aguacate hass', fruit: 'Fresa entera', swaps: { carb1: ['Tortilla de maíz'], protein2: ['Queso panela'] } },
        { style: 'Salado', protein1: 'Pechuga de pollo sin piel cocida', carb1: 'Arroz cocido', carb2: 'Frijol promedio cocido', fat: 'Aceite de oliva', vegetable: 'Brócoli cocido', swaps: { protein1: ['Atún en agua drenado', 'Filete de pescado'], carb1: ['Papa cocida'] } },
        { style: 'Dulce', protein1: 'Proteína whey (promedio)', carb1: 'Manzana', fat: 'Nuez', swaps: {} },
        { style: 'Salado', protein1: 'Filete de pescado', carb1: 'Tortilla de maíz', fat: 'Aguacate hass', vegetable: 'Calabacita alargada cruda', swaps: { protein1: ['Salmón fresco'] } },
      ],
      intra: { food: 'Gatorade', carbsG: 20 },
      supplements: [['Creatina monohidratada', '3 g/día'], ['Cafeína', '150 mg']],
    },
    weight: { start: 64, perWeek: 0.25, days: 20 },
    checkins: [{ week: 1, ratings: [4, 3, 3, 3, 4, 4, 4], rpe: 7.5, comment: 'Me costó la sentadilla búlgara, pero bien.' }, { week: 2, ratings: [4, 4, 4, 3, 5, 5, 4], rpe: 8, comment: 'Me sentí con más energía que la semana pasada.' }],
    measurements: [[21, { weight: 64, waist: 71, hips: 96, thighRight: 55, thighLeft: 54.5, armRight: 27 }], [1, { weight: 64.9, waist: 70.5, hips: 97.2, thighRight: 55.8, thighLeft: 55.2, armRight: 27.3 }]],
  },
  {
    client: {
      fullName: 'Carlos Ramírez Soto', birthDate: '1990-08-02', sex: 'male', heightCm: 178, initialWeightKg: 88, city: 'Aguascalientes', occupation: 'Contador', phone: '4497654321',
      profile: {
        health: { medicalClearance: 'Sí', chronicDiseases: 'Hipertensión controlada', medications: 'Losartán 50 mg' },
        logistics: { planType: 'Mensual', startDate: daysAgo(35), paymentDate: daysAgo(2), daysPerWeek: 6, sessionMinutes: 60, trainingPlace: 'Gym comercial' },
        lifestyle: { sleepHours: 6, stressLevel: 4, dailySteps: 5000, workActivity: 'Sedentaria', alcoholTobacco: 'Alcohol social, fines de semana' },
        experience: { yearsTraining: 6, level: 'Avanzado', bestLifts: '100 / 140 / 170' },
        nutrition: { mealsPerDay: 3, tracksNutrition: true, restrictions: 'No le gusta el pescado' },
      },
      coachNotes: 'Definición para evento en 10 semanas. Vigilar presión arterial y adherencia en fin de semana.',
    },
    training: {
      objective: { primary: 'Definición: bajar grasa conservando fuerza', secondary: 'Mantener marcas de básicos', startingPoint: 'Seis años entrenando, 88 kg con ~22 % de grasa.', trajectory: 'Bajar a 82 kg en 10 semanas.' },
      blockPhase: 'Acumulación', blockWeeks: 5, split: ['Empuje', 'Tracción', 'Pierna', 'Empuje', 'Tracción', 'Pierna', REST],
      priorities: { p1: ['Pectoral', 'Dorsal'], p2: ['Cuádriceps'], p3: ['Deltoides lateral'], maintenance: ['Bíceps', 'Tríceps'], notes: { p1: { sets: '14–18', frequency: '2', strategy: 'Mantener carga, no perseguir volumen en déficit' } } },
      macroBlocks: [{ phase: 'Acumulación', weeks: 5, focus: 'Mantener fuerza en déficit' }, { phase: 'Descarga', weeks: 1, focus: 'Recuperar antes del evento' }],
      steps: { trainingDay: 10000, restDay: 12000 },
      cardio: cardioWeek({ 2: { protocol: "Bici 15' post-entreno", moment: 'Después del entreno' }, 4: { protocol: 'HIIT 10 × 1:1', moment: 'Después del entreno' }, 7: { protocol: "LISS 45'", moment: 'Día de descanso' } }),
      warmup: warmupWeek({ 1: W.push, 2: W.pull, 3: W.legsHeavy, 4: W.push, 5: W.pull, 6: W.legsLight }),
    },
    routine: 'pushPullLegs', weeks: 4, doneDaysLastWeek: 4, progression: 0.015,
    nutrition: {
      inputs: { weightKg: 86.2, activity: 'high', dietType: 'omnivore', goal: 'Definición', adjustmentKcal: -500, proteinPerKg: 2.3, fatPct: 0.25, cycling: false, trainingDays: [true, true, true, true, true, true, false], mealCount: 3, preWorkoutMeal: null, postWorkoutMeal: 3, mealsMeta: meals([['Desayuno', '07:30'], ['Comida', '14:30'], ['Cena', '21:00']]) },
      meals: [
        { style: 'Salado', protein1: 'Huevo entero fresco', protein2: 'Jamón de pavo', carb1: 'Tortilla de maíz', fat: 'Aguacate hass', vegetable: 'Champiñón crudo rebanado', swaps: { carb1: ['Avena en hojuelas'] } },
        { style: 'Salado', protein1: 'Bistec de res', carb1: 'Arroz cocido', fat: 'Aceite de oliva', vegetable: 'Brócoli cocido', swaps: { protein1: ['Pechuga de pollo sin piel cocida', 'Lomo de cerdo'], carb1: ['Papa cocida'] } },
        { style: 'Salado', protein1: 'Pechuga de pollo sin piel cocida', carb1: 'Papa cocida', fat: 'Almendra', vegetable: 'Calabacita alargada cruda', swaps: {} },
      ],
      supplements: [['Creatina monohidratada', '5 g/día'], ['Proteína aislada (whey u otra)', '1 scoop (30 g)']],
    },
    weight: { start: 88, perWeek: -0.5, days: 34 },
    checkins: [{ week: 1, ratings: [4, 3, 3, 3, 4, 4, 5], rpe: 8 }, { week: 2, ratings: [3, 3, 3, 2, 3, 4, 5], rpe: 8.5, comment: 'Semana pesada en el trabajo.' }, { week: 3, ratings: [3, 2, 2, 2, 3, 3, 4], rpe: 9, comment: 'Mucha hambre por la noche. Dormí mal.', discomfort: 'Codo derecho en press francés, desde el martes.' }],
    measurements: [[35, { weight: 88, waist: 94, abdomen: 98, chest: 106, armRight: 38 }], [7, { weight: 86.2, waist: 91.5, abdomen: 95, chest: 105.5, armRight: 37.8 }]],
  },
  {
    client: {
      fullName: 'Sofía Hernández Vega', birthDate: '2001-11-25', sex: 'female', heightCm: 158, initialWeightKg: 52, city: 'Jesús María', occupation: 'Estudiante', phone: '4492223344',
      profile: {
        health: { medicalClearance: 'No requiere', allergies: 'Ninguna' },
        logistics: { planType: 'Mensual', startDate: daysAgo(9), paymentDate: addDays(today, 21), daysPerWeek: 3, sessionMinutes: 50, trainingPlace: 'Gym comercial' },
        lifestyle: { sleepHours: 8, stressLevel: 2, dailySteps: 9000, workActivity: 'Ligera' },
        experience: { yearsTraining: 0, level: 'Principiante', avoidedExercises: 'Le intimida la zona de peso libre' },
        nutrition: { mealsPerDay: 4, tracksNutrition: false, restrictions: 'Vegana' },
      },
      coachNotes: 'Primera vez con plan. Priorizar técnica y adherencia; cargas conservadoras.',
    },
    training: {
      objective: { primary: 'Aprender a entrenar y ganar fuerza general', secondary: 'Crear el hábito de 3 días', startingPoint: 'Sin experiencia previa en gimnasio.', trajectory: 'Dominar los patrones básicos en 8 semanas.' },
      blockPhase: 'Adaptación', blockWeeks: 4, split: ['Full body', REST, 'Full body', REST, 'Full body', REST, REST],
      priorities: { p1: ['Glúteo'], p2: ['Dorsal'], p3: [], maintenance: [], notes: {} },
      macroBlocks: [{ phase: 'Adaptación', weeks: 4, focus: 'Técnica' }, { phase: 'Acumulación', weeks: 4, focus: 'Subir cargas' }],
      steps: { trainingDay: 8000, restDay: 9000 },
      cardio: cardioWeek({ 2: { protocol: "LISS 30'", moment: 'Día de descanso' } }),
      warmup: warmupWeek({ 1: W.express, 3: W.express, 5: W.express }),
    },
    routine: 'fullBody', weeks: 2, doneDaysLastWeek: 1, progression: 0.05,
    nutrition: {
      inputs: { weightKg: 52, activity: 'light', dietType: 'vegan', goal: 'Mantenimiento', adjustmentKcal: 0, proteinPerKg: 1.8, fatPct: 0.3, cycling: false, trainingDays: [true, false, true, false, true, false, false], mealCount: 4, preWorkoutMeal: null, postWorkoutMeal: null, mealsMeta: meals([['Desayuno', '08:00'], ['Comida', '14:00'], ['Colación', '17:00'], ['Cena', '20:30']]) },
      meals: [
        { style: 'Dulce', protein1: 'Tofu, firme', carb1: 'Avena en hojuelas', fat: 'Almendra', fruit: 'Fresa entera', swaps: {} },
        { style: 'Salado', protein1: 'Lenteja cocida', protein2: 'Soya texturizada', carb1: 'Arroz integral cocido', fat: 'Aguacate hass', vegetable: 'Brócoli cocido', swaps: { protein1: ['Garbanzo cocido', 'Frijol promedio cocido'] } },
        { style: 'Dulce', protein1: 'Soya cocida', carb1: 'Manzana', fat: 'Nuez', swaps: {} },
        { style: 'Salado', protein1: 'Tofu, firme', carb1: 'Tortilla de maíz', fat: 'Aceite de oliva', vegetable: 'Calabacita alargada cruda', swaps: {} },
      ],
      supplements: [['Creatina monohidratada', '3 g/día']],
    },
    weight: { start: 52, perWeek: 0.02, days: 8, skipEvery: 3 },
    checkins: [{ week: 1, ratings: [5, 5, 3, 4, 5, 4, 5], rpe: 6, comment: '¡Me gustó! Me dolió todo el miércoles.' }],
    measurements: [[9, { weight: 52, waist: 64, hips: 88 }]],
  },
  {
    client: {
      fullName: 'Diego Torres Aguilar', birthDate: '1998-05-17', sex: 'male', heightCm: 183, initialWeightKg: 76, city: 'Aguascalientes', occupation: 'Programador', phone: '4495556677',
      profile: {
        health: { medicalClearance: 'No requiere' },
        logistics: { planType: 'Semestral', startDate: daysAgo(15), paymentDate: addDays(today, 40), daysPerWeek: 4, sessionMinutes: 90, trainingPlace: 'Gym privado' },
        lifestyle: { sleepHours: 7.5, stressLevel: 2, dailySteps: 6000, workActivity: 'Sedentaria' },
        experience: { yearsTraining: 3, level: 'Intermedio' },
        nutrition: { mealsPerDay: 5, tracksNutrition: true, notes: 'Le cuesta comer suficiente' },
      },
      coachNotes: 'Ectomorfo clásico: el reto es el apetito. Plan de volumen con comidas densas.',
    },
    training: {
      objective: { primary: 'Volumen: ganar masa muscular', secondary: 'Subir el press de banca', startingPoint: '76 kg, le cuesta subir de peso.', trajectory: 'Llegar a 80 kg en 16 semanas.' },
      blockPhase: 'Adaptación', blockWeeks: 4, split: ['Torso', 'Pierna', REST, 'Torso', 'Pierna', REST, REST],
      priorities: { p1: ['Pectoral'], p2: ['Dorsal', 'Cuádriceps'], p3: ['Deltoides lateral'], maintenance: [], notes: {} },
      macroBlocks: [{ phase: 'Adaptación', weeks: 4, focus: 'Base de volumen' }, { phase: 'Acumulación', weeks: 6, focus: 'Sobrecarga progresiva' }],
      steps: { trainingDay: 7000, restDay: 8000 },
      cardio: cardioWeek({}),
      warmup: warmupWeek({ 1: W.push, 2: W.legsHeavy, 4: W.pull, 5: W.legsLight }),
    },
    routine: 'upperLower', routineDays: { 1: 2, 2: 1, 4: 5, 5: 4 }, weeks: 2, doneDaysLastWeek: 0, progression: 0.05, loadFactor: 1.6,
    nutrition: {
      inputs: { weightKg: 76.4, activity: 'moderate', dietType: 'omnivore', goal: 'Superávit', adjustmentKcal: 350, proteinPerKg: 2, fatPct: 0.27, cycling: false, trainingDays: [true, true, false, true, true, false, false], mealCount: 5, preWorkoutMeal: 4, postWorkoutMeal: 5, mealsMeta: meals([['Desayuno', '08:00'], ['Colación', '11:00'], ['Comida', '14:00'], ['Pre-entreno', '18:00'], ['Cena', '21:30']]) },
      meals: [
        { style: 'Mixto', protein1: 'Huevo entero fresco', carb1: 'Avena en hojuelas', carb2: 'Plátano', fat: 'Crema de cacahuate', swaps: {} },
        { style: 'Dulce', protein1: 'Yoghurt Oikos, estilo griego, sabor Natural', carb1: 'Amaranto tostado', fat: 'Almendra', swaps: {} },
        { style: 'Salado', protein1: 'Carne molida de pavo', carb1: 'Arroz cocido', carb2: 'Frijol promedio cocido', fat: 'Aguacate hass', vegetable: 'Calabacita alargada cruda', swaps: { protein1: ['Bistec de res'] } },
        { style: 'Dulce', protein1: 'Proteína whey (promedio)', carb1: 'Bagel', swaps: {} },
        { style: 'Salado', protein1: 'Salmón fresco', carb1: 'Papa cocida', fat: 'Aceite de oliva', vegetable: 'Brócoli cocido', swaps: {} },
      ],
      intra: { food: 'Gatorade', carbsG: 30 },
      supplements: [['Creatina monohidratada', '5 g/día']],
    },
    weight: { start: 76, perWeek: 0.15, days: 14 },
    checkins: [{ week: 1, ratings: [4, 4, 4, 4, 4, 3, 5], rpe: 7, comment: 'No logré terminarme la cena tres días.' }],
    measurements: [[15, { weight: 76, chest: 98, waist: 79, armRight: 33, thighRight: 56 }]],
  },
  {
    client: {
      fullName: 'Ana Paula Ruiz Campos', birthDate: '1988-01-30', sex: 'female', heightCm: 162, initialWeightKg: 71, city: 'Aguascalientes', occupation: 'Abogada', phone: '4498889900',
      profile: {
        health: { medicalClearance: 'Pendiente', surgeries: 'Cesárea (2021)' },
        logistics: { planType: 'Mensual', startDate: today, paymentDate: addDays(today, 30), daysPerWeek: 3, sessionMinutes: 45, trainingPlace: 'Casa', equipment: 'Mancuernas ajustables, bandas, banco' },
        lifestyle: { sleepHours: 6, stressLevel: 4, dailySteps: 4000, workActivity: 'Sedentaria' },
        experience: { yearsTraining: 1, level: 'Principiante' },
        nutrition: { mealsPerDay: 3, tracksNutrition: false },
      },
      coachNotes: 'Recién dada de alta. Falta autorización médica y armar ambos planes.',
    },
  },
  {
    client: {
      fullName: 'Roberto Méndez Luna', birthDate: '1979-09-09', sex: 'male', heightCm: 172, initialWeightKg: 92, city: 'Calvillo', occupation: 'Comerciante', phone: '4491112233', status: 'paused',
      profile: { health: { medicalClearance: 'Sí', injuries: 'Hernia lumbar L4-L5 (2019)' }, logistics: { planType: 'Trimestral', startDate: daysAgo(120), daysPerWeek: 3 }, experience: { yearsTraining: 4, level: 'Intermedio' } },
      coachNotes: 'En pausa por viaje de trabajo. Retoma el próximo mes.',
    },
  },
];

const RATING_KEYS = ['energy', 'sleep', 'soreness', 'stress', 'mood', 'nutrition', 'injury'];
/** Variación fija (no al azar) para que los datos se vean naturales y siempre salgan igual. */
const wobble = (i) => [0, 0.3, -0.1, 0.2, 0.4, 0.1, 0.3][i % 7];

async function createDemo(spec, foods, supplements) {
  const email = `${spec.client.fullName.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}${DOMAIN}`;
  if (await Client.findOne({ where: { email } })) return false;

  const client = await Client.create({ status: 'active', profile: {}, ...spec.client, email, accessCode: generateAccessCode() });
  const food = (name) => {
    const found = foods.get(name);
    if (!found) throw new Error(`Alimento no encontrado en el catálogo: ${name}`);
    return found;
  };

  // El pago con el que arrancó: deja el siguiente vencimiento en la fecha de pago del expediente.
  const { planType, startDate, paymentDate } = spec.client.profile?.logistics ?? {};
  if (startDate && paymentDate && startDate < today) {
    await Payment.create({ clientId: client.id, paidOn: startDate, amount: FEES[planType] ?? null, method: 'Transferencia', dueDate: null, nextDueDate: paymentDate, notes: 'Pago inicial' });
  }

  if (spec.training) {
    const weeksBack = spec.weeks - 1;
    await savePlan(client.id, { name: 'Programa de hipertrofia', ...spec.training, blockStart: addDays(mondayOf(today), -7 * weeksBack) });
    const routine = ROUTINES[spec.routine].map((row) => ({ row, day: spec.routineDays?.[row[0]] ?? row[0] }));

    for (let number = 1; number <= spec.weeks; number++) {
      const week = await addWeek(client.id);
      if (number === 1) {
        await saveWeekPrescription(
          client.id,
          week.id,
          routine.map(({ row, day }) => ({ day, muscle: row[1], exercise: row[2], sets: row[3], reps: row[4], rir: row[5], coachNotes: row[8] ?? null, symbol: row[9] ?? null })),
        );
      }
      const isLast = number === spec.weeks;
      const trainingDays = [...new Set(routine.map((r) => r.day))].sort((a, b) => a - b);
      const doneDays = isLast ? trainingDays.slice(0, spec.doneDaysLastWeek) : trainingDays;
      const rows = await WeekExercise.findAll({ where: { weekId: week.id } });
      for (const exercise of rows) {
        if (!doneDays.includes(exercise.day)) continue;
        const { row } = routine.find((r) => r.row[2] === exercise.exercise && r.day === exercise.day);
        const load = Math.round(row[6] * (spec.loadFactor ?? 1) * (1 + spec.progression * (number - 1)) * 2) / 2;
        await exercise.update({ logged: row[7].map((reps) => ({ load, reps })) });
      }
      const weekStart = addDays(mondayOf(today), -7 * (spec.weeks - number));
      const cardioLog = Object.fromEntries(
        spec.training.cardio
          .map((day, i) => [i + 1, day.protocol])
          .filter(([day, protocol]) => protocol && protocol !== 'Solo pasos' && (!isLast || day <= (doneDays.at(-1) ?? 0)))
          .map(([day], i) => [day, [45, 20, 30][i % 3] - (number === 2 ? 5 : 0)]),
      );
      await logWeek(client.id, week.id, { dayDates: Object.fromEntries(doneDays.map((day) => [day, addDays(weekStart, day - 1)])), cardioLog });
    }
  }

  if (spec.nutrition) {
    const { inputs, meals: chosen, intra, supplements: assigned } = spec.nutrition;
    const id = (name) => (name ? food(name).id : null);
    await saveNutritionPlan(client.id, {
      startDate: spec.client.profile?.logistics?.startDate ?? today,
      allowClientSwaps: true,
      inputs: { formula: 'mifflin', extraTrainingKcal: 300, roundTo: 5, preWorkoutMeal: null, postWorkoutMeal: null, ...inputs },
      meals: chosen.map((meal) => ({
        style: meal.style,
        protein1: id(meal.protein1), protein2: id(meal.protein2), carb1: id(meal.carb1), carb2: id(meal.carb2), fat: id(meal.fat),
        vegetable: id(meal.vegetable), vegetablePortions: 1, fruit: id(meal.fruit), fruitPortions: 1,
        swaps: Object.fromEntries(Object.entries(meal.swaps ?? {}).map(([slot, names]) => [slot, names.map(id)])),
      })),
      intra: intra ? { foodId: id(intra.food), carbsG: intra.carbsG } : { foodId: null, carbsG: null },
      hydration: { sessionMin: spec.client.profile?.logistics?.sessionMinutes ?? 75, sweatRateLPerH: 0.8, test: {} },
      supplements: assigned.map(([name, assignedDose]) => ({ supplementId: supplements.get(name).id, assignedDose, timing: null })),
    });
  }

  if (spec.weight) {
    const { start, perWeek, days, skipEvery } = spec.weight;
    for (let i = days; i >= 1; i--) {
      if (skipEvery && i % skipEvery === 0) continue;
      const elapsed = days - i;
      await saveWeight(client.id, daysAgo(i), { weightKg: Math.round((start + (perWeek * elapsed) / 7 + wobble(elapsed) * 0.6 - 0.1) * 10) / 10 });
    }
  }

  const plan = spec.training ? await findActivePlan(client.id, { withWeeks: false }) : null;
  for (const checkin of spec.checkins ?? []) {
    const trainingDays = plan.split.map((session, i) => (session === REST ? null : i + 1)).filter(Boolean);
    await saveCheckin(client.id, checkin.week, {
      date: addDays(mondayOf(today), -7 * (spec.weeks - checkin.week) + 6),
      sessions: trainingDays.map((day, i) => ({ day, rpe: Math.min(10, Math.round(checkin.rpe + wobble(i) - 0.2)), durationMin: 60 + ((day * 7) % 25), enjoyment: 4 })),
      ratings: Object.fromEntries(RATING_KEYS.map((key, i) => [key, checkin.ratings[i]])),
      answers: { comments: checkin.comment ?? null, discomfort: checkin.discomfort ?? null },
      avgSteps: 7500 + checkin.week * 400,
    });
  }

  for (const [ago, values] of spec.measurements ?? []) await saveMeasurement(client.id, daysAgo(ago), { values });
  return true;
}

async function main() {
  const reset = process.argv.includes('--reset');
  await sequelize.authenticate();
  if (reset) {
    const removed = await Client.destroy({ where: { email: { [Op.like]: `%${DOMAIN}` } } });
    console.log(`Clientes de ejemplo eliminados: ${removed}`);
  }
  const foods = new Map((await Food.findAll()).map((f) => [f.name, f]));
  const supplements = new Map((await Supplement.findAll()).map((s) => [s.name, s]));
  if (!foods.size) throw new Error('Los catálogos están vacíos: arranca el servidor una vez (npm run dev) antes de cargar los ejemplos.');

  let created = 0;
  for (const spec of DEMO) {
    if (await createDemo(spec, foods, supplements)) {
      created++;
      console.log(`  + ${spec.client.fullName}`);
    }
  }
  console.log(created ? `Listo: ${created} clientes de ejemplo creados.` : 'Los clientes de ejemplo ya existían (usa --reset para recrearlos).');
}

main()
  .catch((error) => {
    console.error('No se pudieron cargar los ejemplos:', error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
