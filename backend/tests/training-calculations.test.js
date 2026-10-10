// Los valores esperados son los del ejemplo cargado en "PLANTILLA ENTRENAMIENTO DEFINITIVA".
import { describe, expect, it } from 'vitest';
import {
  ageOn,
  blockEndDate,
  cardioCompliance,
  estimatedOneRepMax,
  exerciseSummary,
  lockedWeekNumber,
  measurementDelta,
  musclePriority,
  scheduleBlocks,
  tonnage,
  trend,
  weeklyStepsTarget,
  weeklyVolume,
} from '../src/services/calculations/training.js';

describe('registro por ejercicio', () => {
  it('semana 1: adducción 60 × 10 y 60 × 9', () => {
    expect(exerciseSummary([{ load: 60, reps: 10 }, { load: 60, reps: 9 }, {}])).toEqual({ setsDone: 2, e1rm: 80, tonnage: 1140 });
  });
  it('semana 2: 62.5 × 10 y 62.5 × 9', () => {
    const sets = [{ load: 62.5, reps: 10 }, { load: 62.5, reps: 9 }];
    expect(estimatedOneRepMax(sets)).toBeCloseTo(83.3333, 4);
    expect(tonnage(sets)).toBe(1187.5);
  });
  it('sin registro no hay e1RM ni tonelaje', () => {
    expect(exerciseSummary([{}, {}])).toEqual({ setsDone: 0, e1rm: null, tonnage: null });
  });
  it('tendencia contra la semana anterior', () => {
    expect(trend(83.3, 80)).toBe('up');
    expect(trend(78, 80)).toBe('down');
    expect(trend(80, null)).toBeNull();
  });
});

describe('volumen por músculo', () => {
  const week = [
    { day: 1, muscle: 'Cuádriceps', plannedSets: 3, sets: [{ load: 100, reps: 8 }, { load: 100, reps: 8 }] },
    { day: 4, muscle: 'Cuádriceps', plannedSets: 2, sets: [{ load: 60, reps: 12 }] },
    { day: 2, muscle: 'Dorsal', plannedSets: 3, sets: [] },
    { day: 2, muscle: '', plannedSets: 3, sets: [] },
  ];
  it('series programadas, realizadas y frecuencia', () => {
    expect(weeklyVolume(week)).toEqual([
      { muscle: 'Cuádriceps', plannedSets: 5, doneSets: 3, frequency: 2 },
      { muscle: 'Dorsal', plannedSets: 3, doneSets: 0, frequency: 1 },
    ]);
  });
  it('prioridad del bloque', () => {
    const priorities = { p1: ['Cuádriceps'], p2: ['Dorsal', 'Deltoides lateral'], p3: ['Bíceps'], maintenance: [] };
    expect(musclePriority('Dorsal', priorities)).toBe('P2');
    expect(musclePriority('Pectoral', priorities)).toBe('');
  });
});

describe('bloques', () => {
  it('fin del bloque', () => expect(blockEndDate('2026-10-05', 4)).toBe('2026-11-01'));
  it('encadena el macrociclo', () => {
    const blocks = scheduleBlocks('2026-10-05', [
      { phase: 'Adaptación', weeks: 4 },
      { phase: 'Acumulación', weeks: 5 },
      { phase: 'Descarga', weeks: 1 },
    ]);
    expect(blocks.map((b) => [b.startDate, b.endDate])).toEqual([
      ['2026-10-05', '2026-11-01'],
      ['2026-11-02', '2026-12-06'],
      ['2026-12-07', '2026-12-13'],
    ]);
  });
});

describe('cardio, mediciones y edad', () => {
  it('promedio semanal de pasos', () => {
    expect(weeklyStepsTarget({ trainingDaySteps: 9000, restDaySteps: 10000, trainingDays: 4 })).toBe(9429);
  });
  it('cumplimiento de cardio', () => {
    expect(cardioCompliance([0, 0, 45, 0, 0, 20, 0], [null, null, 45, null, null, 7, null])).toEqual({ planned: 65, done: 52, compliance: 0.8 });
    expect(cardioCompliance([45, 20], [])).toEqual({ planned: 65, done: null, compliance: null });
  });
  it('cambio de una medida contra la inicial', () => {
    const peso = measurementDelta([82, 82.8, 83.5, null]);
    expect(peso.delta).toBeCloseTo(1.5);
    expect(peso.pct).toBeCloseTo(0.01829, 5);
    expect(measurementDelta([82])).toEqual({ delta: null, pct: null });
  });
  it('edad', () => {
    expect(ageOn('1996-10-09', '2026-10-08')).toBe(29);
    expect(ageOn('1996-10-08', '2026-10-08')).toBe(30);
  });
});

describe('semana bloqueada hasta contestar el cuestionario anterior', () => {
  it('la semana nueva se bloquea si falta el cuestionario de la anterior', () => {
    expect(lockedWeekNumber([1, 2, 3], [1])).toBe(3);
  });
  it('con el cuestionario anterior contestado se ve todo', () => {
    expect(lockedWeekNumber([1, 2, 3], [2])).toBeNull();
  });
  it('la semana 1 nunca se bloquea', () => {
    expect(lockedWeekNumber([1], [])).toBeNull();
    expect(lockedWeekNumber([], [])).toBeNull();
  });
});
