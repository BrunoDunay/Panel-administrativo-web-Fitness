import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { MARK_AXIS, MARK_PIECES, MARK_VIEWBOX } from './mark-pieces';

let nextId = 0;

/** Tiempos del bucle (ms): construirse, quedarse vivo y deshacerse antes de volver a empezar. */
const BUILD_MS = 2300;
const ALIVE_MS = 3800;
const LEAVE_MS = 520;

/**
 * Isotipo de la marca en vectores, con la animación de cómo se construye:
 * una línea guía traza la barra, los discos se deslizan desde los extremos y el hexágono
 * se dibuja a línea antes de rellenarse. Ya construido, puede "levantar": los discos bombean,
 * el hexágono respira y una ola de luz lo recorre.
 *
 * - `build="load"`: se construye al cargar la página (ya viene así desde el servidor, sin parpadeo).
 * - `build="view"`: se construye cuando entra en pantalla.
 * - `build="none"`: quieto.
 * - `replay`: se vuelve a construir al pasar el puntero o al hacer clic.
 * - `loop`: ciclo continuo (construir → levantar → deshacerse), solo mientras está en pantalla.
 * - `loading`: animación de carga (la barra sube y baja de peso sin parar).
 * - `broken`: la barra se cayó: para las páginas de error.
 */
@Component({
  selector: 'app-brand-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.tone-light]': "tone() === 'light'",
    '[class.is-loop]': 'loop()',
    '(pointerenter)': 'onPointer($event)',
    '(click)': 'onClick()',
  },
  template: `
    <svg [attr.viewBox]="viewBox" [class.is-building]="phase() === 'building'" [class.is-alive]="phase() === 'alive'" [class.is-leaving]="phase() === 'leaving'" [class.is-waiting]="phase() === 'waiting'" [class.is-loading]="phase() === 'loading'" [class.is-broken]="phase() === 'broken'" aria-hidden="true" focusable="false">
      <defs>
        <!-- Un solo degradado para todas las piezas esmeralda: la marca deja de ser un color plano. -->
        <linearGradient [attr.id]="gradientId" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="955" y2="537">
          <stop offset="0" class="stop-a" />
          <stop offset="1" class="stop-b" />
        </linearGradient>
      </defs>
      <line class="axis" x1="0" [attr.y1]="axis" x2="955" [attr.y2]="axis" pathLength="1" />
      @for (piece of pieces; track $index) {
        <path
          [attr.d]="piece.d"
          [attr.class]="piece.kind + ' ' + piece.tone"
          [attr.fill]="piece.tone === 'teal' ? gradientFill : null"
          pathLength="1"
          [style.--d.ms]="piece.delay"
          [style.--dx.px]="piece.dx"
          [style.--dy.px]="piece.dy"
          [style.--x]="piece.x"
        />
      }
    </svg>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      aspect-ratio: 955 / 537;
      /* Paleta nueva: tinta, esmeralda que sube a menta y pizarra verdosa. */
      --mark-dark: #0a1f1c;
      --mark-a: #0a7d5a;
      --mark-b: #38d39f;
      --mark-slate: #7c9c95;
      --mark-line: #0e8a66;
      --mark-glow: none;
    }
    :host(.tone-light) {
      --mark-dark: #ffffff;
      --mark-a: #2fe0a0;
      --mark-b: #b6ffe4;
      --mark-slate: #6f9189;
      --mark-line: var(--color-mint);
      /* Sobre fondo oscuro el esmeralda brilla: es lo que le da el aire de pantalla. */
      --mark-glow: drop-shadow(0 0 6px color-mix(in srgb, #2fe0a0 55%, transparent));
    }
    svg { position: relative; display: block; width: 100%; height: 100%; overflow: visible; filter: var(--mark-glow); }
    path { transform-box: view-box; transform-origin: 50% 50%; }
    .stop-a { stop-color: var(--mark-a); }
    .stop-b { stop-color: var(--mark-b); }
    .dark { fill: var(--mark-dark); }
    .slate { fill: var(--mark-slate); }
    .axis { stroke: var(--mark-line); stroke-width: 5; stroke-dasharray: 1 1; opacity: 0; }

    /* Resplandor detrás de la marca: solo en el logo grande en bucle. */
    :host(.is-loop)::before {
      content: '';
      position: absolute;
      inset: -18% -8%;
      border-radius: 50%;
      background: radial-gradient(closest-side, color-mix(in srgb, var(--mark-b) 42%, transparent), transparent);
      opacity: 0.35;
      animation: mark-glow 3.2s var(--ease-in-out) infinite;
      pointer-events: none;
    }
    @keyframes mark-glow { 50% { opacity: 0.8; transform: scale(1.08); } }

    /* En espera de entrar en pantalla (o entre dos vueltas del bucle): todavía no hay nada construido. */
    .is-waiting path { opacity: 0; }

    /* 1 · La barra: una línea guía que nace y se retira cuando la pieza ya existe. */
    .is-building .axis { animation: mark-axis 1500ms var(--ease-out) both; }
    /* 2 · Los discos entran por la barra, de dentro hacia fuera, con un rebote corto al asentar. */
    .is-building .plate { animation: mark-slide 560ms var(--ease-spring) var(--d) both; }
    /* 3 · El hexágono se traza a línea y después toma su color. */
    .is-building .hex {
      stroke: var(--mark-line);
      stroke-width: 2.5;
      vector-effect: non-scaling-stroke;
      stroke-dasharray: 1 1;
      animation:
        mark-draw 760ms var(--ease-in-out) var(--d) both,
        mark-fill 380ms var(--ease-out) calc(var(--d) + 620ms) both,
        mark-settle 760ms var(--ease-out) var(--d) both;
    }

    /* 4 · Vivo: los discos bombean como en una repetición, el hexágono respira y pasa una ola de luz. */
    .is-alive .plate {
      animation:
        mark-pump 1200ms var(--ease-in-out) 300ms 2,
        mark-flash 620ms var(--ease-out) calc(2700ms + var(--x) * 520ms);
    }
    .is-alive .hex {
      animation:
        mark-breathe 1200ms var(--ease-in-out) 300ms 2,
        mark-flash 620ms var(--ease-out) calc(2700ms + var(--x) * 520ms);
    }
    /* 5 · Se deshace hacia donde vino para volver a empezar. */
    .is-leaving .plate, .is-leaving .hex { animation: mark-out 480ms var(--ease-in) calc((1 - var(--x)) * 120ms) both; }

    /* Cargando: los discos bombean sin parar y el hexágono se enciende pieza por pieza, de izquierda a derecha. */
    .is-loading .axis { opacity: 0.5; stroke-dashoffset: 0; animation: mark-load-axis 1100ms var(--ease-in-out) infinite; }
    .is-loading .plate { animation: mark-pump 1100ms var(--ease-in-out) infinite; }
    .is-loading .hex { animation: mark-load 1100ms var(--ease-in-out) calc(var(--x) * 520ms - 400ms) infinite; }
    @keyframes mark-load { 0%, 100% { opacity: 0.28; transform: scale(0.97); } 45% { opacity: 1; transform: none; } }
    @keyframes mark-load-axis { 0%, 100% { opacity: 0.15; } 45% { opacity: 0.7; } }

    /* Caído: los discos se salieron de la barra y el hexágono quedó ladeado; se mece apenas. */
    .is-broken .plate { opacity: 0.55; transform: translate(calc(var(--dx) * 0.9), calc(60px + var(--x) * 40px)) rotate(calc((var(--x) - 0.5) * 44deg)); animation: mark-fall 900ms var(--ease-out) both; }
    .is-broken .hex { animation: mark-tilt 5s var(--ease-in-out) infinite; }
    @keyframes mark-fall { from { opacity: 1; transform: none; } 55% { transform: translate(calc(var(--dx) * 0.9), calc(74px + var(--x) * 40px)) rotate(calc((var(--x) - 0.5) * 52deg)); } }
    @keyframes mark-tilt { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(-2.5deg); } }

    @keyframes mark-axis {
      0% { opacity: 1; stroke-dashoffset: 1; }
      30% { opacity: 1; stroke-dashoffset: 0; }
      70% { opacity: 0.5; stroke-dashoffset: 0; }
      100% { opacity: 0; stroke-dashoffset: 0; }
    }
    @keyframes mark-slide {
      from { opacity: 0; transform: translate(var(--dx), var(--dy)); }
      to { opacity: 1; transform: none; }
    }
    @keyframes mark-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
    @keyframes mark-fill {
      from { fill-opacity: 0; stroke-opacity: 1; }
      to { fill-opacity: 1; stroke-opacity: 0; }
    }
    @keyframes mark-settle { from { transform: translate(var(--dx), var(--dy)); } to { transform: none; } }
    @keyframes mark-pump {
      0%, 100% { transform: none; }
      45% { transform: translate(calc(var(--dx) * 0.2), 0); }
    }
    @keyframes mark-breathe {
      0%, 100% { transform: none; }
      45% { transform: scale(1.035); }
    }
    @keyframes mark-flash {
      0%, 100% { filter: none; }
      40% { filter: brightness(1.7) saturate(1.2); }
    }
    @keyframes mark-out {
      to { opacity: 0; transform: translate(calc(var(--dx) * 0.6), calc(var(--dy) * 0.6 + 14px)) scale(0.96); }
    }
  `,
})
export class BrandMark {
  readonly tone = input<'color' | 'light'>('color');
  readonly build = input<'none' | 'load' | 'view'>('none');
  /** Vuelve a construirse al pasar el puntero o al hacer clic. */
  readonly replay = input(false);
  /** Ciclo continuo, como un gif: para el logo grande. */
  readonly loop = input(false);
  readonly loading = input(false);
  readonly broken = input(false);

  protected readonly pieces = MARK_PIECES;
  protected readonly viewBox = MARK_VIEWBOX;
  protected readonly axis = MARK_AXIS;
  protected readonly gradientId = `mark-gradient-${nextId++}`;
  protected readonly gradientFill = `url(#${this.gradientId})`;

  /** Fase que fija el código; mientras no fije ninguna, manda el modo `build`. */
  private readonly forced = signal<'building' | 'alive' | 'leaving' | 'waiting' | 'idle' | null>(null);
  /** En modo `load` la clase ya sale puesta desde el servidor: la animación arranca con la página. */
  protected readonly phase = computed(() => (this.broken() ? 'broken' : this.loading() ? 'loading' : (this.forced() ?? (this.build() === 'load' ? 'building' : 'idle'))));

  private readonly el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private visible = false;

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => clearTimeout(this.timer));

    afterNextRender(() => {
      if (this.loop()) {
        // El bucle solo corre mientras se ve: fuera de pantalla no gasta nada.
        this.forced.set('waiting');
        const observer = new IntersectionObserver(
          ([entry]) => {
            const now = Boolean(entry?.isIntersecting);
            if (now === this.visible) return;
            this.visible = now;
            clearTimeout(this.timer);
            if (now) this.cycle();
            else this.forced.set('waiting');
          },
          { threshold: 0.3 },
        );
        observer.observe(this.el);
        destroyRef.onDestroy(() => observer.disconnect());
        return;
      }

      if (this.build() !== 'view') return;
      if (this.el.getBoundingClientRect().top < window.innerHeight * 0.85) return this.forced.set('building');
      this.forced.set('waiting');
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;
          this.forced.set('building');
          observer.disconnect();
        },
        { threshold: 0.35 },
      );
      observer.observe(this.el);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /** Una vuelta del bucle: construir → vivo → deshacerse → otra vez. */
  private cycle(): void {
    if (!this.visible) return;
    this.forced.set('building');
    this.timer = setTimeout(() => {
      this.forced.set('alive');
      this.timer = setTimeout(() => {
        this.forced.set('leaving');
        this.timer = setTimeout(() => {
          this.forced.set('waiting');
          this.timer = setTimeout(() => this.cycle(), 180);
        }, LEAVE_MS);
      }, ALIVE_MS);
    }, BUILD_MS);
  }

  protected onPointer(event: PointerEvent): void {
    if (event.pointerType === 'mouse') this.restart();
  }

  protected onClick(): void {
    this.restart();
  }

  /** Vuelve a construir la marca, salvo que ya esté en plena animación. */
  private restart(): void {
    if (!this.replay() || this.loop()) return;
    const svg = this.el.querySelector('svg');
    if (!svg || svg.getAnimations({ subtree: true }).some((animation) => animation.playState === 'running')) return;
    this.forced.set('idle');
    requestAnimationFrame(() => requestAnimationFrame(() => this.forced.set('building')));
  }
}
