import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, computed, inject, input } from '@angular/core';
import { MOVEMENT_LABELS, MovementPattern } from '../../core/utils/visuals';
import { MOVEMENTS, toPath } from './movement-poses';

const DURATION = '1.5s';
const SPLINES = '0.4 0 0.2 1;0.4 0 0.2 1';

/**
 * Dibujo animado de un ejercicio: una figura que hace la repetición (de la postura inicial
 * a la final y de regreso). Se anima al pasar el cursor o tocar el elemento `.icon-hover`
 * que lo contiene; con `autoplay` se repite sin parar (vista previa en los formularios).
 */
@Component({
  selector: 'app-movement-figure',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 48 48" [attr.width]="size()" [attr.height]="size()" role="img" [attr.aria-label]="label()">
      <title>{{ label() }}</title>
      @if (view().ground) {
        <path class="ground" [attr.d]="view().ground" />
      }
      <path class="body" [attr.d]="view().body[0]">
        <animate attributeName="d" [attr.values]="loop(view().body)" [attr.dur]="dur" [attr.begin]="begin()" [attr.repeatCount]="repeat()" calcMode="spline" keyTimes="0;0.5;1" [attr.keySplines]="splines" />
      </path>
      <circle class="head" r="3.4" [attr.cx]="view().headX[0]" [attr.cy]="view().headY[0]">
        <animate attributeName="cx" [attr.values]="loop(view().headX)" [attr.dur]="dur" [attr.begin]="begin()" [attr.repeatCount]="repeat()" calcMode="spline" keyTimes="0;0.5;1" [attr.keySplines]="splines" />
        <animate attributeName="cy" [attr.values]="loop(view().headY)" [attr.dur]="dur" [attr.begin]="begin()" [attr.repeatCount]="repeat()" calcMode="spline" keyTimes="0;0.5;1" [attr.keySplines]="splines" />
      </circle>
      @if (view().gear; as gear) {
        <path class="gear" [attr.d]="gear[0]">
          <animate attributeName="d" [attr.values]="loop(gear)" [attr.dur]="dur" [attr.begin]="begin()" [attr.repeatCount]="repeat()" calcMode="spline" keyTimes="0;0.5;1" [attr.keySplines]="splines" />
        </path>
      }
      @for (weight of view().weights; track $index) {
        <circle class="weight" r="2.8" [attr.cx]="weight.x[0]" [attr.cy]="weight.y[0]">
          <animate attributeName="cx" [attr.values]="loop(weight.x)" [attr.dur]="dur" [attr.begin]="begin()" [attr.repeatCount]="repeat()" calcMode="spline" keyTimes="0;0.5;1" [attr.keySplines]="splines" />
          <animate attributeName="cy" [attr.values]="loop(weight.y)" [attr.dur]="dur" [attr.begin]="begin()" [attr.repeatCount]="repeat()" calcMode="spline" keyTimes="0;0.5;1" [attr.keySplines]="splines" />
        </circle>
      }
    </svg>
  `,
  styles: `
    :host { display: inline-flex; flex: none; }
    svg { fill: none; stroke-linecap: round; stroke-linejoin: round; overflow: visible; }
    .body { stroke: currentColor; stroke-width: 2.5; }
    .head { fill: currentColor; }
    .ground { stroke: currentColor; stroke-width: 1.6; opacity: 0.28; }
    .gear { stroke: var(--figure-accent, var(--color-primary)); stroke-width: 2.6; }
    .weight { fill: var(--figure-accent, var(--color-primary)); stroke: var(--figure-surface, var(--color-surface)); stroke-width: 1.2; }
  `,
})
export class MovementFigure {
  readonly pattern = input.required<MovementPattern>();
  readonly size = input(44);
  /** Repite la animación sin parar en vez de esperar al cursor. */
  readonly autoplay = input(false);

  protected readonly dur = DURATION;
  protected readonly splines = SPLINES;
  protected readonly label = computed(() => MOVEMENT_LABELS[this.pattern()]);
  protected readonly begin = computed(() => (this.autoplay() ? '0s' : 'indefinite'));
  protected readonly repeat = computed(() => (this.autoplay() ? 'indefinite' : '2'));

  /** Cada parte del dibujo como par [inicio, final]. */
  protected readonly view = computed(() => {
    const { start, end, ground } = MOVEMENTS[this.pattern()];
    return {
      ground: ground ? toPath(ground) : null,
      body: [toPath(start.body), toPath(end.body)],
      headX: [start.head[0], end.head[0]],
      headY: [start.head[1], end.head[1]],
      gear: start.gear ? [toPath(start.gear), toPath(end.gear)] : null,
      weights: (start.weights ?? []).map((point, i) => ({ x: [point[0], end.weights?.[i]?.[0] ?? point[0]], y: [point[1], end.weights?.[i]?.[1] ?? point[1]] })),
    };
  });

  constructor() {
    const host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    afterNextRender(() => {
      // El disparador es el contenedor marcado con .icon-hover (la fila o tarjeta), o el propio dibujo.
      const trigger = host.closest('.icon-hover') ?? host;
      const play = () => {
        if (this.autoplay()) return;
        for (const animation of host.querySelectorAll('animate')) (animation as SVGAnimationElement).beginElement();
      };
      trigger.addEventListener('pointerenter', play);
      trigger.addEventListener('focusin', play);
    });
  }

  /** Valores de ida y vuelta para <animate>. */
  protected loop(values: (string | number)[]): string {
    return `${values[0]};${values[1]};${values[0]}`;
  }
}
