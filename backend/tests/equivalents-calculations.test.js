// Los valores esperados son los de las hojas "_DIETOCALCULO" y "MENU SMAE" del coach.
import { describe, expect, it } from 'vitest';
import { adequacy, dietCalculation, equivalentAmount, portionBalance, smaeGroupOf } from '../src/services/calculations/equivalents.js';

const PORTIONS = { verduras: 6, frutas: 3, cereales_sg: 12, leguminosas: 1, aoa_b: 8.5, aoa_m: 3, leche_d: 1, grasa_sp: 1 };

describe('dietocálculo', () => {
  const diet = dietCalculation(PORTIONS);

  it('suma lo que aporta cada grupo', () => {
    const by = Object.fromEntries(diet.groups.map((group) => [group.key, group]));
    expect(by.verduras).toMatchObject({ totalKcal: 150, totalProteinG: 12, totalCarbsG: 24 });
    expect(by.cereales_sg).toMatchObject({ totalKcal: 840, totalProteinG: 24, totalCarbsG: 180 });
    expect(by.aoa_b).toMatchObject({ totalKcal: 467.5, totalProteinG: 59.5, totalFatG: 25.5 });
    expect(by.cereales_cg.totalKcal).toBe(0);
    expect(diet.totals).toEqual({ kcal: 2122.5, proteinG: 133.5, fatG: 48.5, carbsG: 281 });
  });

  it('% de adecuación contra el ideal, con rango de 95 a 105 %', () => {
    const result = adequacy(diet.totals, { kcal: 2250, proteinG: 130, fatG: 60, carbsG: 280 });
    expect(result.kcal.pct).toBeCloseTo(94.33, 2);
    expect(result.kcal.state).toBe('low');
    expect(result.proteinG.pct).toBeCloseTo(102.69, 2);
    expect(result.proteinG.state).toBe('ok');
    expect(result.fatG.state).toBe('low');
    expect(result.carbsG.state).toBe('ok');
    expect(adequacy({ kcal: 2400, proteinG: 0, fatG: 0, carbsG: 0 }, { kcal: 2250, proteinG: 0, fatG: 0, carbsG: 0 }).kcal.state).toBe('high');
  });

  it('ignora porciones vacías o negativas', () => {
    expect(dietCalculation({ verduras: -2, frutas: null }).totals.kcal).toBe(0);
  });
});

describe('reparto de porciones entre comidas', () => {
  it('lo repartido se descuenta de lo que queda', () => {
    const meals = [{ items: [{ group: 'cereales_sg', portions: 4 }] }, { items: [{ group: 'cereales_sg', portions: 6 }, { group: 'verduras', portions: 2 }] }];
    const balance = portionBalance(PORTIONS, meals);
    expect(balance.cereales_sg).toEqual({ daily: 12, assigned: 10, remaining: 2 });
    expect(balance.verduras).toEqual({ daily: 6, assigned: 2, remaining: 4 });
    expect(balance.frutas.remaining).toBe(3);
  });

  it('repartir de más deja el saldo en negativo', () => {
    expect(portionBalance({ frutas: 2 }, [{ items: [{ group: 'frutas', portions: 3 }] }]).frutas.remaining).toBe(-1);
  });
});

describe('cantidad de un alimento por sus porciones', () => {
  const rice = { netWeightG: 47, portionQty: 0.25, portionUnit: 'taza' };
  const tortilla = { netWeightG: 30, portionQty: 1, portionUnit: 'pieza' };
  const chicken = { netWeightG: 30, portionQty: 30, portionUnit: 'g' };

  it('3 porciones de arroz o de tortilla', () => {
    expect(equivalentAmount(rice, 3)).toEqual({ grams: 141, measure: '3/4 taza' });
    expect(equivalentAmount(tortilla, 3)).toEqual({ grams: 90, measure: '3 pieza' });
  });

  it('medias porciones y alimentos que se miden en gramos', () => {
    expect(equivalentAmount(tortilla, 1.5)).toEqual({ grams: 45, measure: '1 1/2 pieza' });
    expect(equivalentAmount(chicken, 5)).toEqual({ grams: 150, measure: '' });
    expect(equivalentAmount(null, 3)).toEqual({ grams: 0, measure: '' });
  });
});

describe('grupo de un alimento del catálogo', () => {
  it('reconoce los grupos del SMAE y deja fuera lo que no es un equivalente', () => {
    expect(smaeGroupOf({ group: 'Cereales y tubérculos sin grasa' })).toBe('cereales_sg');
    expect(smaeGroupOf({ group: 'AOA muy bajo en grasa' })).toBe('aoa_mb');
    expect(smaeGroupOf({ group: 'Aceites y grasas con proteína' })).toBe('grasa_cp');
    expect(smaeGroupOf({ group: 'Leche descremada' })).toBe('leche_d');
    expect(smaeGroupOf({ group: 'Suplemento proteico' })).toBeNull();
    expect(smaeGroupOf({ group: null })).toBeNull();
  });
});
