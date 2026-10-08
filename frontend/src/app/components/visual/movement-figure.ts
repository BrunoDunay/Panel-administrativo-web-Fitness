import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MOVEMENT_LABELS, MovementPattern } from '../../core/utils/visuals';

interface Figure {
  /** Centro de la cabeza. */
  head: [number, number];
  /** Cuerpo: torso, piernas y brazos. */
  body: string;
  /** Implemento (barra, mancuerna, polea): en color de acento. */
  gear?: string;
  /** Peso visto de lado: un disco. */
  weights?: [number, number][];
  /** Flechas que indican hacia dónde va el movimiento. */
  arrows: string;
  /** Piso o banco. */
  ground?: string;
}

const UP_DOWN = (x: number, top: number, bottom: number) => `M${x} ${top}V${bottom}M${x - 2.5} ${top + 2.5}L${x} ${top}l2.5 2.5M${x - 2.5} ${bottom - 2.5}L${x} ${bottom}l2.5-2.5`;
const UP = (x: number, top: number, bottom: number) => `M${x} ${bottom}V${top}M${x - 2.5} ${top + 2.5}L${x} ${top}l2.5 2.5`;

/** Pictogramas en caja de 48: una figura de palitos por patrón de movimiento. */
const FIGURES: Record<MovementPattern, Figure> = {
  squat: { head: [20, 9], body: 'M21 13L27 25L16 28L19 40M19 40h5M21 15l5-1', weights: [[25, 12]], arrows: UP_DOWN(39, 16, 32), ground: 'M10 42h22' },
  hinge: { head: [13, 14], body: 'M16 16L30 21L27 31L28 40M28 40h5M18 17l1 12', weights: [[19, 32]], arrows: UP_DOWN(40, 20, 36), ground: 'M12 42h24' },
  pushH: { head: [12, 29], body: 'M16 30H30L36 31L38 40M21 30V17', weights: [[21, 14]], arrows: UP_DOWN(31, 10, 24), ground: 'M8 34h26M12 34v6M30 34v6' },
  pushV: { head: [22, 13], body: 'M22 17V30M22 30l-4 12M22 30l4 12M22 19l-7-2l-1-9M22 19l7-2l1-9', gear: 'M9 7h26', arrows: UP(42, 8, 22) },
  pull: { head: [22, 14], body: 'M22 18V31M22 31l-4 11M22 31l4 11M19 19L13 7M25 19L31 7', gear: 'M8 6h28', arrows: UP_DOWN(42, 12, 28) },
  row: { head: [14, 14], body: 'M15 18L18 30H30L35 39M16 21L28 23', gear: 'M28 23H44', weights: [[28, 23]], arrows: 'M32 13h11M34.5 10.5L32 13l2.5 2.5M40.5 10.5L43 13l-2.5 2.5', ground: 'M10 34h14' },
  curl: { head: [20, 9], body: 'M20 13V28M20 28l-3 14M20 28l4 14M20 15l1 9l8-6', weights: [[30, 17]], arrows: 'M37 27c3-4 3-9 0-13M37 14l-2.8.6M37 14l.8 2.8' },
  extension: { head: [19, 9], body: 'M19 13V28M19 28l-3 14M19 28l4 14M19 15l2 8l8 4', gear: 'M29 27V6M25 6h8', arrows: 'M38 15v11M35.5 23.5L38 26l2.5-2.5' },
  lateral: { head: [24, 10], body: 'M24 14V30M24 30l-4 12M24 30l4 12M24 17L12 21M24 17l12 4', weights: [[10, 21.5], [38, 21.5]], arrows: `${UP(10, 9, 15)}${UP(38, 9, 15)}` },
  core: { head: [9, 28], body: 'M12 31L22 38L31 28L38 38M13 32l9-4', arrows: 'M10 20c4-4 9-4 13-1M23 19l-3 .3M23 19l-1-2.8', ground: 'M6 41h36' },
  calf: { head: [22, 8], body: 'M22 12V26M22 26V38M22 15l-4 9M22 15l4 9M20 38l8 4', arrows: UP_DOWN(38, 24, 40), ground: 'M12 43h24' },
};

/** Pictograma de la naturaleza del movimiento de un ejercicio. */
@Component({
  selector: 'app-movement-figure',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 48 48" [attr.width]="size()" [attr.height]="size()" role="img" [attr.aria-label]="label()">
      <title>{{ label() }}</title>
      @if (figure().ground) {
        <path class="ground" [attr.d]="figure().ground" />
      }
      <path class="arrows" [attr.d]="figure().arrows" />
      <path class="body" [attr.d]="figure().body" />
      <circle class="head" [attr.cx]="figure().head[0]" [attr.cy]="figure().head[1]" r="3.4" />
      @if (figure().gear) {
        <path class="gear" [attr.d]="figure().gear" />
      }
      @for (weight of figure().weights; track $index) {
        <circle class="weight" [attr.cx]="weight[0]" [attr.cy]="weight[1]" r="2.8" />
      }
    </svg>
  `,
  styles: `
    :host { display: inline-flex; flex: none; }
    svg { fill: none; stroke-linecap: round; stroke-linejoin: round; }
    .body { stroke: currentColor; stroke-width: 2.4; }
    .head { fill: currentColor; }
    .ground { stroke: currentColor; stroke-width: 1.6; opacity: 0.3; }
    .gear { stroke: var(--figure-accent, var(--color-primary)); stroke-width: 2.6; }
    .weight { fill: var(--figure-accent, var(--color-primary)); stroke: var(--figure-surface, var(--color-surface)); stroke-width: 1.2; }
    .arrows { stroke: var(--figure-accent, var(--color-primary)); stroke-width: 1.6; opacity: 0.75; }

    /* La flecha late una vez al pasar el cursor: recuerda hacia dónde va el movimiento. */
    @media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
      :host-context(.icon-hover:hover) .arrows { animation: figure-arrow 700ms cubic-bezier(0.77, 0, 0.175, 1); }
    }
    @keyframes figure-arrow { 40% { opacity: 1; transform: translateY(-1.5px); } }
  `,
})
export class MovementFigure {
  readonly pattern = input.required<MovementPattern>();
  readonly size = input(44);
  protected readonly figure = computed(() => FIGURES[this.pattern()]);
  protected readonly label = computed(() => MOVEMENT_LABELS[this.pattern()]);
}
