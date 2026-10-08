import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, input } from '@angular/core';
import { resolveFigure } from './figure-resolve';
import { FigureDef, figureBounds, figureFrame, figureStatics } from './figure-rig';

/** Duración de una repetición (ida y vuelta). */
const REP_MS = 1500;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Dibujo animado de un ejercicio: una figura que hace la repetición con su equipo (barra, Smith,
 * mancuernas, polea o máquina). Se mueve al entrar en pantalla, al pasar el cursor o al tocar el
 * elemento `.icon-hover` que lo contiene; con `autoplay` se repite sin parar (vista previa).
 */
@Component({
  selector: 'app-exercise-figure',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.viewBox]="box()" [attr.width]="size()" [attr.height]="size()" role="img" [attr.aria-label]="label()">
      <title>{{ label() }}</title>
      <path class="prop" [attr.d]="fixed().line" />
      <path class="pad" [attr.d]="fixed().pad" />
      <path class="stack" [attr.d]="fixed().stack" />
      <path class="rail" [attr.d]="fixed().rails" />
      <path class="far" data-part="far" [attr.d]="rest().far" />
      <path class="g-thin" data-part="thin" [attr.d]="rest().gear.thin" />
      <path class="g-mid" data-part="mid" [attr.d]="rest().gear.mid" />
      <path class="g-dash" data-part="dash" [attr.d]="rest().gear.dash" />
      <path class="body" data-part="body" [attr.d]="rest().body" />
      <circle class="head" data-part="head" r="3.8" [attr.cx]="rest().head[0]" [attr.cy]="rest().head[1]" />
      <path class="g-thick" data-part="thick" [attr.d]="rest().gear.thick" />
      <path class="g-ring" data-part="ring" [attr.d]="rest().gear.ring" />
      <path class="g-solid" data-part="solid" [attr.d]="rest().gear.solid" />
    </svg>
  `,
  styles: `
    :host { display: inline-flex; flex: none; }
    svg { fill: none; stroke-linecap: round; stroke-linejoin: round; }
    .body, .far { stroke: currentColor; stroke-width: 3.2; }
    .far { opacity: 0.36; }
    .head { fill: currentColor; }
    /* Lo fijo (piso, banco, postes) queda atenuado; el equipo que se mueve lleva el color del músculo. */
    .prop { stroke: currentColor; stroke-width: 1.6; opacity: 0.3; }
    .pad { stroke: currentColor; stroke-width: 4; opacity: 0.24; }
    .stack { fill: currentColor; opacity: 0.16; }
    .rail { stroke: var(--figure-accent, var(--color-primary)); stroke-width: 1.5; opacity: 0.6; }
    .g-thin { stroke: var(--figure-accent, var(--color-primary)); stroke-width: 1.4; }
    .g-mid { stroke: var(--figure-accent, var(--color-primary)); stroke-width: 2.2; }
    .g-thick { stroke: var(--figure-accent, var(--color-primary)); stroke-width: 3.8; }
    .g-ring { stroke: var(--figure-accent, var(--color-primary)); stroke-width: 2; fill: var(--figure-surface, var(--color-surface)); }
    .g-solid { fill: var(--figure-accent, var(--color-primary)); }
    .g-dash { stroke: var(--figure-accent, var(--color-primary)); stroke-width: 1.8; stroke-dasharray: 2 2.4; }
  `,
})
export class ExerciseFigure {
  /** Nombre del ejercicio: de ahí sale su dibujo. */
  readonly exercise = input('');
  readonly muscle = input('');
  /** Dibujo elegido a mano por el coach (clave del catálogo de dibujos). */
  readonly figure = input<string | null | undefined>(null);
  readonly size = input(46);
  /** Repite la animación sin parar en vez de esperar al cursor. */
  readonly autoplay = input(false);
  /** Hace una repetición al entrar en pantalla. */
  readonly intro = input(true);

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly entry = computed(() => resolveFigure(this.exercise(), this.muscle(), this.figure()));
  protected readonly label = computed(() => this.entry().name);
  protected readonly fixed = computed(() => figureStatics(this.entry().def));
  protected readonly box = computed(() => figureBounds(this.entry().def));
  /** Postura inicial: lo que se ve cuando no hay animación. */
  protected readonly rest = computed(() => figureFrame(this.entry().def, 0));

  private frameId = 0;
  private parts: Record<string, Element> | null = null;

  constructor() {
    afterNextRender(() => {
      // El disparador es el contenedor marcado con .icon-hover (la fila o tarjeta), o el propio dibujo.
      const trigger = this.host.closest('.icon-hover') ?? this.host;
      const play = () => !this.autoplay() && this.play(2);
      trigger.addEventListener('pointerenter', play);
      trigger.addEventListener('focusin', play);

      // Una repetición al entrar en pantalla: deja claro que el dibujo explica el movimiento.
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer.disconnect();
          if (this.intro() && !this.autoplay()) setTimeout(() => this.play(1), 120 + Math.random() * 500);
        },
        { threshold: 0.6 },
      );
      observer.observe(this.host);

      this.cleanup = () => {
        cancelAnimationFrame(this.frameId);
        observer.disconnect();
        trigger.removeEventListener('pointerenter', play);
        trigger.removeEventListener('focusin', play);
      };
    });
    inject(DestroyRef).onDestroy(() => this.cleanup());

    // La vista previa arranca sola y vuelve a empezar si cambia el dibujo.
    effect(() => {
      this.entry();
      if (this.autoplay() && typeof requestAnimationFrame === 'function') queueMicrotask(() => this.play(Infinity));
    });
  }

  private cleanup: () => void = () => {};

  /** Corre `reps` repeticiones; cada cuadro recalcula la postura para que manos y pies no se despeguen. */
  private play(reps: number): void {
    cancelAnimationFrame(this.frameId);
    const start = performance.now();
    const tick = (now: number) => {
      const def = this.entry().def;
      const cycle = (now - start) / REP_MS;
      if (cycle >= reps) return this.paint(def, 0);
      this.paint(def, this.progress(def, cycle % 1));
      this.frameId = requestAnimationFrame(tick);
    };
    this.frameId = requestAnimationFrame(tick);
  }

  /** Avance dentro de una repetición: sube, sostiene (si el ejercicio lleva pausa) y regresa. */
  private progress(def: FigureDef, phase: number): number {
    const hold = def.hold ?? 0;
    const half = (1 - hold) / 2;
    if (phase < half) return easeInOut(phase / half);
    if (phase < half + hold) return 1;
    return easeInOut((1 - phase) / half);
  }

  private paint(def: FigureDef, t: number): void {
    this.parts ??= Object.fromEntries(Array.from(this.host.querySelectorAll('[data-part]'), (node) => [node.getAttribute('data-part')!, node]));
    const frame = figureFrame(def, t);
    const set = (part: string, d: string) => this.parts![part]?.setAttribute('d', d);
    set('body', frame.body);
    set('far', frame.far);
    for (const [part, d] of Object.entries(frame.gear)) set(part, d);
    this.parts['head']?.setAttribute('cx', String(frame.head[0]));
    this.parts['head']?.setAttribute('cy', String(frame.head[1]));
  }
}
