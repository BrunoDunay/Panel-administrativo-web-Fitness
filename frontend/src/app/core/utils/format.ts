const DATE = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const DATE_SHORT = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** "2026-10-05" → "5 oct 2026". Las fechas sin hora se leen en UTC para que no se recorran un día. */
export function formatDate(iso: string | null | undefined, short = false): string {
  if (!iso) return '—';
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(date.getTime()) ? '—' : (short ? DATE_SHORT : DATE).format(date);
}

/** Número con hasta `decimals` decimales, sin ceros de relleno. Vacío = "—". */
export function formatNumber(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: decimals }).format(value);
}

/** Cambio con signo: "+1.5", "−0.4". */
export function formatSigned(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return '—';
  const text = formatNumber(Math.abs(value), decimals);
  return value > 0 ? `+${text}` : value < 0 ? `−${text}` : text;
}

export function formatPercent(value: number | null | undefined, decimals = 0): string {
  return value === null || value === undefined ? '—' : `${formatNumber(value * 100, decimals)} %`;
}

const MONEY = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });

export function formatMoney(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : MONEY.format(value);
}

/** Suma meses conservando el día; si el mes destino es más corto, usa su último día. */
export function addMonths(iso: string, months: number): string {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1 + months, Math.min(day, lastDay))).toISOString().slice(0, 10);
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** "Vence en 3 días", "Vence hoy", "Venció hace 2 días". */
export function dueLabel(days: number | null | undefined): string {
  if (days === null || days === undefined) return 'Sin fecha de pago';
  if (days === 0) return 'Vence hoy';
  return days > 0 ? `Vence en ${plural(days, 'día')}` : `Venció hace ${plural(-days, 'día')}`;
}

/** Puntualidad de un pago: "A tiempo", "3 días antes", "5 días tarde". */
export function delayLabel(days: number | null | undefined): string {
  if (days === null || days === undefined) return '—';
  if (days === 0) return 'A tiempo';
  return days > 0 ? `${plural(days, 'día')} tarde` : `${plural(-days, 'día')} antes`;
}

const FRACTIONS: [number, string][] = [[0.25, '1/4'], [0.333, '1/3'], [0.5, '1/2'], [0.667, '2/3'], [0.75, '3/4']];

/** Cantidad de cocina: "3/4", "1 1/2", "4". */
function quantityText(quantity: number): string {
  const whole = Math.floor(quantity + 1e-6);
  const rest = quantity - whole;
  if (rest < 0.06) return String(whole);
  const fraction = FRACTIONS.find(([value]) => Math.abs(value - rest) < 0.045);
  if (!fraction) return formatNumber(quantity, 1);
  return whole ? `${whole} ${fraction[1]}` : fraction[1];
}

/**
 * Cantidad de un alimento que equivale a `portions` porciones de su grupo. `food` trae lo que
 * pesa y mide UNA porción. Devuelve los gramos y la medida casera ("141 g", "3/4 taza").
 */
export function portionAmount(food: { grams: number; qty: number; unit: string }, portions: number): { grams: number; measure: string } {
  const grams = Math.round(food.grams * portions);
  return { grams, measure: !food.unit || food.unit === 'g' ? '' : `${quantityText(food.qty * portions)} ${food.unit}` };
}

/** Valor de un <input type="number">: vacío o inválido = null. */
export function toNumber(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

/** Enlace de WhatsApp con mensaje. El número se limpia; a 10 dígitos se le antepone 52 (México). */
export function whatsappLink(phone: string | null | undefined, message?: string | null): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  const number = digits.length === 10 ? `52${digits}` : digits;
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}
