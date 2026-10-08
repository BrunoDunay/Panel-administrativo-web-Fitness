import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { formatNumber } from '../../core/utils/format';

export interface ChartSeries {
  name: string;
  /** Un valor por etiqueta del eje X; null = sin dato (la línea se corta). */
  values: (number | null)[];
  /** Línea punteada: referencia o valor esperado, no dato medido. */
  dashed?: boolean;
}

const W = 640;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 44 };

/** Pasos "redondos" para el eje Y. */
function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const raw = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= max + step * 0.999; value += step) ticks.push(Number(value.toFixed(6)));
  return ticks;
}

/**
 * Gráfica de líneas (cambio en el tiempo) con hasta dos series sobre un mismo eje.
 * Incluye leyenda, guía vertical con los valores al pasar el cursor y tabla alternativa
 * para lectores de pantalla.
 */
@Component({
  selector: 'app-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hasData()) {
      @if (series().length > 1) {
        <ul class="legend">
          @for (s of series(); track s.name; let i = $index) {
            <li><span class="swatch" [class.swatch--dashed]="s.dashed" [style.--c]="color(i)"></span>{{ s.name }}</li>
          }
        </ul>
      }
      <div class="plot">
        <svg [attr.viewBox]="viewBox" role="img" [attr.aria-label]="label()" (pointermove)="hover($event)" (pointerleave)="active.set(null)">
          @for (tick of ticks(); track tick) {
            <line class="grid" [attr.x1]="left" [attr.x2]="right" [attr.y1]="y(tick)" [attr.y2]="y(tick)" />
            <text class="axis" [attr.x]="left - 8" [attr.y]="y(tick)" text-anchor="end" dominant-baseline="middle">{{ fmt(tick) }}</text>
          }
          @for (item of xLabels(); track item.index) {
            <text class="axis" [attr.x]="x(item.index)" [attr.y]="bottom + 18" text-anchor="middle">{{ item.label }}</text>
          }
          @if (active(); as index) {
            <line class="cursor" [attr.x1]="x(index.i)" [attr.x2]="x(index.i)" [attr.y1]="top" [attr.y2]="bottom" />
          }
          @for (s of paths(); track s.name; let i = $index) {
            <path class="line" [class.line--dashed]="s.dashed" [attr.d]="s.d" [style.stroke]="color(i)" />
            @for (point of s.points; track point.i) {
              @if (!s.dashed || active()?.i === point.i) {
                <circle class="dot" [attr.cx]="point.x" [attr.cy]="point.y" [attr.r]="active()?.i === point.i ? 5 : 3.5" [style.fill]="color(i)" />
              }
            }
          }
        </svg>
        @if (active(); as index) {
          <div class="tooltip" [style.left.%]="index.leftPct" [class.tooltip--flip]="index.leftPct > 60">
            <strong>{{ labels()[index.i] }}</strong>
            @for (s of series(); track s.name; let i = $index) {
              @if (s.values[index.i] !== null && s.values[index.i] !== undefined) {
                <span><i class="swatch" [class.swatch--dashed]="s.dashed" [style.--c]="color(i)"></i>{{ s.name }}: <b>{{ fmt(s.values[index.i]!) }} {{ unit() }}</b></span>
              }
            }
          </div>
        }
      </div>
      <table class="visually-hidden">
        <caption>{{ label() }}</caption>
        <thead>
          <tr>
            <th></th>
            @for (s of series(); track s.name) {
              <th>{{ s.name }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (l of labels(); track $index; let i = $index) {
            <tr>
              <th>{{ l }}</th>
              @for (s of series(); track s.name) {
                <td>{{ fmt(s.values[i]) }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    } @else {
      <p class="empty">{{ emptyText() }}</p>
    }
  `,
  styles: `
    :host { display: block; }
    .legend { display: flex; flex-wrap: wrap; gap: var(--space-4); margin-bottom: var(--space-2); list-style: none; font-size: var(--text-xs); color: var(--color-text-muted); }
    .legend li { display: inline-flex; align-items: center; gap: var(--space-2); }
    .swatch { display: inline-block; width: 1rem; height: 0; border-top: 2px solid var(--c); }
    .swatch--dashed { border-top-style: dashed; }
    .plot { position: relative; }
    svg { width: 100%; height: auto; overflow: visible; touch-action: pan-y; }
    .grid { stroke: var(--chart-grid); stroke-width: 1; }
    .axis { fill: var(--color-text-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
    .line { fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .line--dashed { stroke-dasharray: 5 5; }
    /* Anillo del color de la superficie: separa el punto de la línea que cruza. */
    .dot { stroke: var(--color-surface); stroke-width: 2; }
    .cursor { stroke: var(--color-border-strong); stroke-width: 1; }
    .tooltip {
      position: absolute;
      top: 0;
      display: grid;
      gap: 2px;
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-sm);
      background: var(--color-secondary);
      font-size: var(--text-xs);
      white-space: nowrap;
      color: var(--color-text-inverse);
      pointer-events: none;
      transform: translateX(12px);
    }
    .tooltip--flip { transform: translateX(calc(-100% - 12px)); }
    .tooltip span { display: flex; align-items: center; gap: var(--space-2); }
    .tooltip b { font-variant-numeric: tabular-nums; }
    .empty { padding: var(--space-6) 0; font-size: var(--text-sm); text-align: center; color: var(--color-text-muted); }
  `,
})
export class LineChart {
  readonly labels = input.required<string[]>();
  readonly series = input.required<ChartSeries[]>();
  readonly unit = input('');
  readonly label = input('Gráfica');
  readonly emptyText = input('Todavía no hay datos suficientes para la gráfica.');

  protected readonly viewBox = `0 0 ${W} ${H}`;
  protected readonly left = PAD.left;
  protected readonly right = W - PAD.right;
  protected readonly top = PAD.top;
  protected readonly bottom = H - PAD.bottom;
  protected readonly active = signal<{ i: number; leftPct: number } | null>(null);

  private readonly numbers = computed(() => this.series().flatMap((s) => s.values).filter((v): v is number => typeof v === 'number'));
  protected readonly hasData = computed(() => this.numbers().length > 1);
  protected readonly ticks = computed(() => {
    const values = this.numbers();
    return values.length ? niceTicks(Math.min(...values), Math.max(...values)) : [0, 1];
  });

  /** Como mucho ~7 etiquetas en el eje X para que no se encimen. */
  protected readonly xLabels = computed(() => {
    const labels = this.labels();
    const every = Math.max(1, Math.ceil(labels.length / 7));
    return labels.map((label, index) => ({ label, index })).filter(({ index }) => index % every === 0);
  });

  protected readonly paths = computed(() =>
    this.series().map((s) => {
      const points = s.values.map((value, i) => (typeof value === 'number' ? { i, x: this.x(i), y: this.y(value) } : null));
      let d = '';
      let pen = false;
      for (const point of points) {
        if (!point) {
          pen = false;
          continue;
        }
        d += `${pen ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
        pen = true;
      }
      return { name: s.name, dashed: s.dashed, d, points: points.filter((p) => p !== null) };
    }),
  );

  protected color(index: number): string {
    return `var(--chart-${(index % 2) + 1})`;
  }

  protected x(index: number): number {
    const count = Math.max(1, this.labels().length - 1);
    return PAD.left + (index / count) * (W - PAD.left - PAD.right);
  }

  protected y(value: number): number {
    const ticks = this.ticks();
    const min = ticks[0]!;
    const max = ticks[ticks.length - 1]!;
    return PAD.top + (1 - (value - min) / (max - min || 1)) * (H - PAD.top - PAD.bottom);
  }

  protected fmt(value: number | null | undefined): string {
    return formatNumber(value, 2);
  }

  protected hover(event: PointerEvent): void {
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const ratio = ((event.clientX - rect.left) / rect.width) * W;
    const count = this.labels().length;
    const i = Math.min(count - 1, Math.max(0, Math.round(((ratio - PAD.left) / (W - PAD.left - PAD.right)) * (count - 1))));
    this.active.set({ i, leftPct: (this.x(i) / W) * 100 });
  }
}
