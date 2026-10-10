import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, input, signal } from '@angular/core';
import { resolveFigure } from './figure-resolve';
import { FigureDef, FigureStage, figureBounds, figureFrame, figureStatics } from './figure-rig';

/** Duración de una repetición (ida y vuelta). */
const REP_MS = 1500;
/** Lo que tarda en aparecer el dibujo siguiente de una serie. */
const SWAP_MS = 260;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Dibujo animado de un ejercicio: una figura que hace la repetición con su equipo (barra, Smith,
 * mancuernas, polea o máquina). Se mueve al entrar en pantalla, al pasar el cursor o al tocar el
 * elemento `.icon-hover` que lo contiene; con `autoplay` se repite sin parar (vista previa).
 *
 * También puede recibir una serie de dibujos (caminadora → bicicleta → elíptica): cada uno hace sus
 * repeticiones y cede el lugar al siguiente; al terminar regresa al primero.
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
  /** Dibujo dado directamente (cardio y calentamiento), o una serie de ellos: no se busca por nombre. */
  readonly def = input<FigureDef | FigureStage[] | null | undefined>(null);
  readonly size = input(46);
  /** Repite la animación sin parar en vez de esperar al cursor. */
  readonly autoplay = input(false);
  /** Hace una repetición al entrar en pantalla. */
  readonly intro = input(true);

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly changes = inject(ChangeDetectorRef);
  /** Dibujos a mostrar, cada uno con sus repeticiones; casi siempre es uno solo. */
  private readonly stages = computed<{ name: string; stages: FigureStage[] }>(() => {
    const given = this.def();
    if (Array.isArray(given) && given.length) return { name: this.exercise(), stages: given };
    const { name, def } = given && !Array.isArray(given) ? { name: this.exercise(), def: given } : resolveFigure(this.exercise(), this.muscle(), this.figure());
    // Caminar o pedalear se entiende con varios ciclos seguidos; una repetición de fuerza, con dos.
    return { name, stages: [{ def, reps: def.cycle ? 3 : 2 }] };
  });
  /** Cuál de los dibujos de la serie se ve ahora. */
  private readonly stage = signal(0);
  private readonly current = computed(() => (this.stages().stages[this.stage()] ?? this.stages().stages[0]!).def);
  protected readonly label = computed(() => this.stages().name);
  protected readonly fixed = computed(() => figureStatics(this.current()));
  protected readonly box = computed(() => figureBounds(this.current()));
  /** Postura inicial: lo que se ve cuando no hay animación. */
  protected readonly rest = computed(() => figureFrame(this.current(), 0));

  private frameId = 0;
  private parts: Record<string, Element> | null = null;

  constructor() {
    afterNextRender(() => {
      // El disparador es el contenedor marcado con .icon-hover (la fila o tarjeta), o el propio dibujo.
      const trigger = this.host.closest('.icon-hover') ?? this.host;
      const play = () => !this.autoplay() && this.play('full');
      trigger.addEventListener('pointerenter', play);
      trigger.addEventListener('focusin', play);

      // Una repetición al entrar en pantalla: deja claro que el dibujo explica el movimiento.
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer.disconnect();
          if (this.intro() && !this.autoplay()) setTimeout(() => this.play('intro'), 120 + Math.random() * 500);
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
      this.stages();
      this.stage.set(0);
      if (this.autoplay() && typeof requestAnimationFrame === 'function') queueMicrotask(() => this.play('loop'));
    });
  }

  private cleanup: () => void = () => {};

  /**
   * Corre la animación; cada cuadro recalcula la postura para que manos y pies no se despeguen.
   * - `full`: todos los dibujos de la serie, cada uno con sus repeticiones, y regresa al primero.
   * - `intro`: solo el primero y una repetición menos, para no llenar la pantalla de movimiento al cargar.
   * - `loop`: la serie completa, sin parar.
   */
  private play(mode: 'full' | 'intro' | 'loop'): void {
    cancelAnimationFrame(this.frameId);
    const stages = this.stages().stages;
    const reps = mode === 'intro' ? [stages[0]!.def.cycle ? 2 : 1] : stages.map((stage) => stage.reps);
    const total = reps.reduce((sum, count) => sum + count, 0);
    const start = performance.now();
    const tick = (now: number) => {
      // Si el dibujo cambió a media animación, esta se detiene en la postura inicial del nuevo.
      if (this.stages().stages !== stages) return this.paint(this.current(), 0);
      let cycle = (now - start) / REP_MS;
      if (cycle >= total && mode !== 'loop') {
        this.show(0);
        return this.paint(this.current(), 0);
      }
      cycle %= total;
      let index = 0;
      while (cycle >= reps[index]!) cycle -= reps[index++]!;
      this.show(index);
      const def = this.current();
      this.paint(def, this.progress(def, cycle % 1));
      this.frameId = requestAnimationFrame(tick);
    };
    this.frameId = requestAnimationFrame(tick);
  }

  /** Cambia al dibujo `index` de la serie: el encuadre y lo fijo se actualizan al momento y el nuevo entra con un fundido. */
  private show(index: number): void {
    if (this.stage() === index) return;
    this.stage.set(index);
    this.changes.detectChanges();
    this.host.querySelector('svg')?.animate?.([{ opacity: 0, transform: 'scale(0.86)' }, { opacity: 1, transform: 'none' }], { duration: SWAP_MS, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
  }

  /** Avance dentro de una repetición: sube, sostiene (si el ejercicio lleva pausa) y regresa. */
  private progress(def: FigureDef, phase: number): number {
    // Un ciclo avanza parejo y no regresa: el paso o la pedaleada siguen de largo.
    if (def.cycle) return phase;
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
