import { describe, expect, it } from 'vitest';
import { addMonths, applyPayment, nextDueDate, paymentDelay, paymentStatus } from '../src/services/calculations/payments.js';

describe('siguiente vencimiento', () => {
  it('suma el periodo del plan al vencimiento que se paga', () => {
    expect(nextDueDate({ dueDate: '2026-10-06', paidOn: '2026-10-06', planType: 'Mensual' })).toBe('2026-11-06');
    expect(nextDueDate({ dueDate: '2026-10-06', paidOn: '2026-10-06', planType: 'Trimestral' })).toBe('2027-01-06');
    expect(nextDueDate({ dueDate: '2026-10-06', paidOn: '2026-10-06', planType: 'Semestral' })).toBe('2027-04-06');
    expect(nextDueDate({ dueDate: '2026-10-06', paidOn: '2026-10-06', planType: 'Anual' })).toBe('2027-10-06');
  });

  it('pagar antes o después de lo acordado no recorre el calendario', () => {
    expect(nextDueDate({ dueDate: '2026-10-06', paidOn: '2026-10-01', planType: 'Mensual' })).toBe('2026-11-06');
    expect(nextDueDate({ dueDate: '2026-10-06', paidOn: '2026-10-20', planType: 'Mensual' })).toBe('2026-11-06');
  });

  it('sin vencimiento previo cuenta desde el día del pago; sin tipo de plan, un mes', () => {
    expect(nextDueDate({ dueDate: null, paidOn: '2026-10-08', planType: 'Trimestral' })).toBe('2027-01-08');
    expect(nextDueDate({ dueDate: null, paidOn: '2026-10-08', planType: null })).toBe('2026-11-08');
  });

  it('si el mes destino es más corto usa su último día', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-08-31', 6)).toBe('2027-02-28');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
  });
});

describe('tarifa acordada y abonos', () => {
  it('acordaron 6,000: abona 2,000 y quedan 4,000', () => {
    expect(applyPayment({ pending: 6000, fee: 6000, amount: 2000 })).toEqual({ partial: true, pendingBefore: 6000, pendingAfter: 4000 });
  });

  it('al cubrir lo que faltaba, lo pendiente es la tarifa del periodo siguiente', () => {
    expect(applyPayment({ pending: 4000, fee: 6000, amount: 4000 })).toEqual({ partial: false, pendingBefore: 4000, pendingAfter: 6000 });
    expect(applyPayment({ pending: 6000, fee: 6000, amount: 6500 })).toMatchObject({ partial: false, pendingAfter: 6000 });
  });

  it('sin monto o sin tarifa el pago cuenta como completo', () => {
    expect(applyPayment({ pending: 6000, fee: 6000, amount: null })).toEqual({ partial: false, pendingBefore: 6000, pendingAfter: 6000 });
    expect(applyPayment({ pending: null, fee: null, amount: 1500 })).toEqual({ partial: false, pendingBefore: null, pendingAfter: null });
  });
});

describe('estado del pago', () => {
  it('sin fecha, al corriente, próximo y vencido', () => {
    expect(paymentStatus(null, '2026-10-08')).toEqual({ state: 'none', dueDate: null, days: null });
    expect(paymentStatus('2026-11-06', '2026-10-08')).toMatchObject({ state: 'ok', days: 29 });
    expect(paymentStatus('2026-10-15', '2026-10-08')).toMatchObject({ state: 'soon', days: 7 });
    expect(paymentStatus('2026-10-16', '2026-10-08')).toMatchObject({ state: 'ok', days: 8 });
    expect(paymentStatus('2026-10-08', '2026-10-08')).toMatchObject({ state: 'soon', days: 0 });
    expect(paymentStatus('2026-10-06', '2026-10-08')).toMatchObject({ state: 'overdue', days: -2 });
  });

  it('puntualidad de un pago', () => {
    expect(paymentDelay('2026-10-06', '2026-10-06')).toBe(0);
    expect(paymentDelay('2026-10-06', '2026-10-01')).toBe(-5);
    expect(paymentDelay('2026-10-06', '2026-10-20')).toBe(14);
    expect(paymentDelay(null, '2026-10-20')).toBeNull();
  });
});
