/**
 * Lista del súper para llevar: la dibuja en un lienzo y la descarga como imagen (PNG) o como PDF,
 * para consultarla en el teléfono sin internet. No usa librerías: el PDF se arma a mano con
 * una imagen JPEG por página.
 */

export interface GroceryExportRow {
  emoji: string;
  name: string;
  amount: string;
  measure: string;
}

export interface GroceryExport {
  weeks: number;
  rows: GroceryExportRow[];
}

// Hoja A4 a 150 ppp.
const WIDTH = 1240;
const PAGE_HEIGHT = 1754;
const MARGIN = 72;
const HEADER = 250;
const ROW = 78;
const FOOTER = 120;
const ROWS_TOP = HEADER + 24;
const ROWS_PER_PAGE = Math.floor((PAGE_HEIGHT - ROWS_TOP - FOOTER) / ROW);
/** Tamaño de la hoja A4 en puntos PDF. */
const A4 = [595.28, 841.89] as const;

const weeksLabel = (weeks: number) => `Para ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
const fileName = (weeks: number, extension: string) => `lista-del-super-${weeks}-${weeks === 1 ? 'semana' : 'semanas'}.${extension}`;

/** Los colores salen de las variables del sistema de diseño, igual que el resto de la app. */
function theme() {
  const css = getComputedStyle(document.documentElement);
  const value = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    font: getComputedStyle(document.body).fontFamily || 'sans-serif',
    surface: value('--color-surface', '#ffffff'),
    band: value('--color-secondary', '#1a4f47'),
    inverse: value('--color-text-inverse', '#f4f7f5'),
    mint: value('--color-mint', '#4abe96'),
    text: value('--color-text', '#0e312e'),
    muted: value('--color-text-muted', '#4d6764'),
    border: value('--color-border', '#dbe5e0'),
    borderStrong: value('--color-border-strong', '#b9c9c3'),
  };
}

/** Recorta el texto con "…" si no cabe en el ancho disponible. */
function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

function drawPage(data: GroceryExport, rows: GroceryExportRow[], height: number, pageLabel: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const t = theme();
  const font = (weight: number, size: number) => `${weight} ${size}px ${t.font}`;

  ctx.fillStyle = t.surface;
  ctx.fillRect(0, 0, WIDTH, height);

  // Encabezado: qué es y para cuántas semanas alcanza.
  ctx.fillStyle = t.band;
  ctx.fillRect(0, 0, WIDTH, HEADER);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = t.mint;
  ctx.font = font(700, 24);
  ctx.fillText('FITNESS BY EVIDENCE', MARGIN, 74);
  ctx.fillStyle = t.inverse;
  ctx.font = font(700, 68);
  ctx.fillText('Lista del súper', MARGIN, 150);
  ctx.fillStyle = t.mint;
  ctx.font = font(700, 40);
  ctx.fillText(weeksLabel(data.weeks), MARGIN, 210);
  ctx.textAlign = 'right';
  ctx.fillStyle = t.inverse;
  ctx.font = font(600, 26);
  ctx.fillText(`${data.rows.length} ${data.rows.length === 1 ? 'alimento' : 'alimentos'}`, WIDTH - MARGIN, 210);

  rows.forEach((row, index) => {
    const top = ROWS_TOP + index * ROW;
    const middle = top + ROW / 2;

    // Casilla para ir palomeando en la tienda.
    ctx.strokeStyle = t.borderStrong;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(MARGIN, middle - 17, 34, 34, 8);
    ctx.stroke();

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    ctx.fillStyle = t.text;
    ctx.font = font(700, 32);
    ctx.fillText(row.amount, WIDTH - MARGIN, middle);
    const amountWidth = ctx.measureText(row.amount).width;

    ctx.textAlign = 'left';
    ctx.font = font(400, 36);
    ctx.fillText(row.emoji, MARGIN + 56, middle + 2);

    const nameLeft = MARGIN + 116;
    const nameWidth = WIDTH - MARGIN - amountWidth - 32 - nameLeft;
    ctx.font = font(700, 30);
    ctx.fillText(fit(ctx, row.name, nameWidth), nameLeft, row.measure ? middle - 13 : middle);
    if (row.measure) {
      ctx.fillStyle = t.muted;
      ctx.font = font(500, 22);
      ctx.fillText(fit(ctx, row.measure, nameWidth), nameLeft, middle + 19);
    }

    ctx.strokeStyle = t.border;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(MARGIN, top + ROW);
    ctx.lineTo(WIDTH - MARGIN, top + ROW);
    ctx.stroke();
  });

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.muted;
  ctx.font = font(500, 22);
  ctx.textAlign = 'left';
  ctx.fillText('Cantidades en peso neto (sin cáscara ni hueso). Los alimentos adicionales no se incluyen.', MARGIN, height - 70);
  ctx.fillText(`Generada el ${new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date())}`, MARGIN, height - 38);
  ctx.textAlign = 'right';
  ctx.fillText(pageLabel, WIDTH - MARGIN, height - 38);

  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen'))), type, quality));
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** PDF mínimo: una página A4 por imagen JPEG, a hoja completa. */
function pdfFromJpegs(pages: { data: Uint8Array<ArrayBuffer>; width: number; height: number }[]): Blob {
  const encoder = new TextEncoder();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (part: string | Uint8Array<ArrayBuffer>) => {
    const bytes = typeof part === 'string' ? encoder.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (id: number, body: string, stream?: Uint8Array<ArrayBuffer>) => {
    offsets[id] = length;
    push(`${id} 0 obj\n${body}\n`);
    if (stream) {
      push('stream\n');
      push(stream);
      push('\nendstream\n');
    }
    push('endobj\n');
  };

  push('%PDF-1.4\n');
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  pages.forEach((page, i) => {
    const id = 3 + i * 3;
    const content = encoder.encode(`q ${A4[0]} 0 0 ${A4[1]} 0 0 cm /Im0 Do Q`);
    object(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4[0]} ${A4[1]}] /Resources << /XObject << /Im0 ${id + 2} 0 R >> >> /Contents ${id + 1} 0 R >>`);
    object(id + 1, `<< /Length ${content.length} >>`, content);
    object(id + 2, `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.data.length} >>`, page.data);
  });

  const count = 2 + pages.length * 3;
  const xref = length;
  push(`xref\n0 ${count + 1}\n0000000000 65535 f \n`);
  for (let id = 1; id <= count; id++) push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${count + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks, { type: 'application/pdf' });
}

/** Una sola imagen, tan alta como la lista. */
export async function downloadGroceryImage(data: GroceryExport): Promise<void> {
  await document.fonts.ready;
  const canvas = drawPage(data, data.rows, ROWS_TOP + data.rows.length * ROW + FOOTER, '');
  download(await toBlob(canvas, 'image/png'), fileName(data.weeks, 'png'));
}

/** PDF tamaño A4; si la lista es larga, sigue en más páginas. */
export async function downloadGroceryPdf(data: GroceryExport): Promise<void> {
  await document.fonts.ready;
  const total = Math.max(1, Math.ceil(data.rows.length / ROWS_PER_PAGE));
  const pages = [];
  for (let page = 0; page < total; page++) {
    const rows = data.rows.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);
    const canvas = drawPage(data, rows, PAGE_HEIGHT, total > 1 ? `Página ${page + 1} de ${total}` : '');
    const jpeg = await toBlob(canvas, 'image/jpeg', 0.92);
    pages.push({ data: new Uint8Array(await jpeg.arrayBuffer()), width: canvas.width, height: canvas.height });
  }
  download(pdfFromJpegs(pages), fileName(data.weeks, 'pdf'));
}
