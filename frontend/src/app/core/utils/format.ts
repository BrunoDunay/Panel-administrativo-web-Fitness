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
