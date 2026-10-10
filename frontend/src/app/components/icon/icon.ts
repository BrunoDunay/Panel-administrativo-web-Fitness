import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input } from '@angular/core';
import { CUSTOM_ICONS } from './custom-icons';
import { ITSHOVER_ICONS, IconShape } from './itshover-icons';

const ICONS = { ...ITSHOVER_ICONS, ...CUSTOM_ICONS };

export type IconName = keyof typeof ICONS;

/** Cómo se mueve el icono cuando el cursor pasa sobre el botón, enlace o tarjeta que lo contiene. */
type Motion = 'draw' | 'spin' | 'right' | 'left' | 'down' | 'up' | 'pop' | 'shake' | 'lift' | 'tilt' | 'flicker' | 'beat' | 'pulse' | 'stride' | 'steps' | 'ride' | 'reach' | 'tick' | 'sweep';

const MOTION: Partial<Record<IconName, Motion>> = {
  settings: 'spin',
  refresh: 'spin',
  arrowRight: 'right',
  chevronRight: 'right',
  external: 'right',
  logout: 'right',
  send: 'right',
  arrowLeft: 'left',
  arrowDown: 'down',
  chevronDown: 'down',
  download: 'down',
  save: 'down',
  arrowUp: 'up',
  rocket: 'up',
  upload: 'up',
  heart: 'beat',
  scanHeart: 'pulse',
  star: 'pop',
  flame: 'flicker',
  run: 'stride',
  walk: 'stride',
  steps: 'steps',
  bike: 'ride',
  stretch: 'reach',
  clock: 'tick',
  gauge: 'sweep',
  sparkles: 'pop',
  check: 'pop',
  plus: 'pop',
  trophy: 'pop',
  drop: 'pop',
  dollar: 'pop',
  apple: 'pop',
  lock: 'shake',
  message: 'pop',
  camera: 'pop',
  like: 'pop',
  trash: 'shake',
  alert: 'shake',
  dumbbell: 'lift',
  scale: 'tilt',
  edit: 'tilt',
  pill: 'tilt',
  swap: 'tilt',
  moon: 'tilt',
  wallet: 'tilt',
};

/** Elemento que dispara la animación del icono: primero el control o la tarjeta que lo contiene; si no hay, su fila. */
const CONTROLS = 'a, button, summary, label, [role="tab"], .icon-hover';
const ROWS = 'li, tr, .card__head, .notice, .tile-icon, .card__badge';
/** Insignias: su icono se presenta al aparecer aunque esté dentro de un enlace. */
const BADGES = '.tile-icon, .card__badge';
/** Lo que dura la animación más larga (dibujado de un icono con varios trazos). */
const PLAY_MS = 900;
/** Iconos "con vida" (cardio y calentamiento): al aparecer, después de dibujarse hacen su movimiento una vez. */
const LIVELY = new Set<Motion>(['flicker', 'beat', 'pulse', 'stride', 'steps', 'ride', 'reach', 'tick', 'sweep']);
const INTRO_MS = 1100;

/** Un solo observador para todos los iconos decorativos: se animan una vez al entrar en pantalla. */
let appear: IntersectionObserver | null = null;
const onAppear = new WeakMap<Element, () => void>();

function watch(host: Element, play: () => void): () => void {
  appear ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        onAppear.get(entry.target)?.();
        onAppear.delete(entry.target);
        appear!.unobserve(entry.target);
      }
    },
    { threshold: 0.6 },
  );
  onAppear.set(host, play);
  appear.observe(host);
  return () => appear?.unobserve(host);
}

/**
 * Icono de trazo. Los dibujos vienen de itshover (ver itshover-icons.ts) y de custom-icons.ts.
 * itshover anima con React + Motion; aquí la animación está rehecha en CSS y se dispara:
 * - al pasar el cursor (o tocar) el control, la fila o la tarjeta que contiene al icono;
 * - una vez al entrar en pantalla, si el icono es decorativo (no está dentro de un botón o enlace).
 */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <svg [attr.viewBox]="shape().viewBox" [attr.width]="size()" [attr.height]="size()" [class.filled]="shape().filled" [attr.data-motion]="motion()" [attr.stroke-width]="strokeWidth()">
      @for (node of shape().nodes; track $index) {
        @switch (node.tag) {
          @case ('circle') {
            <circle pathLength="1" [style.--i]="$index" [attr.cx]="node.attrs['cx']" [attr.cy]="node.attrs['cy']" [attr.r]="node.attrs['r']" [attr.fill]="node.attrs['fill']" />
          }
          @case ('line') {
            <line pathLength="1" [style.--i]="$index" [attr.x1]="node.attrs['x1']" [attr.y1]="node.attrs['y1']" [attr.x2]="node.attrs['x2']" [attr.y2]="node.attrs['y2']" />
          }
          @case ('rect') {
            <rect pathLength="1" [style.--i]="$index" [attr.x]="node.attrs['x']" [attr.y]="node.attrs['y']" [attr.width]="node.attrs['width']" [attr.height]="node.attrs['height']" [attr.rx]="node.attrs['rx']" [attr.ry]="node.attrs['ry']" [attr.fill]="node.attrs['fill']" />
          }
          @case ('ellipse') {
            <ellipse pathLength="1" [style.--i]="$index" [attr.cx]="node.attrs['cx']" [attr.cy]="node.attrs['cy']" [attr.rx]="node.attrs['rx']" [attr.ry]="node.attrs['ry']" />
          }
          @case ('polyline') {
            <polyline pathLength="1" [style.--i]="$index" [attr.points]="node.attrs['points']" />
          }
          @case ('polygon') {
            <polygon pathLength="1" [style.--i]="$index" [attr.points]="node.attrs['points']" />
          }
          @default {
            <path pathLength="1" [style.--i]="$index" [attr.d]="node.attrs['d']" [attr.fill]="node.attrs['fill']" [attr.stroke]="node.attrs['stroke']" />
          }
        }
      }
    </svg>
  `,
  styles: `
    :host { display: inline-flex; flex: none; }
    svg { fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; transform-origin: center; }
    svg.filled { fill: currentColor; stroke: none; }

    /* Dibujado: cada trazo se recorre de principio a fin, uno tras otro. */
    svg.is-playing[data-motion='draw']:not(.filled) > *,
    svg.is-intro:not(.filled) > * {
      stroke-dasharray: 1;
      animation: icon-draw 420ms cubic-bezier(0.23, 1, 0.32, 1) both;
      animation-delay: calc(var(--i) * 45ms);
    }
    /* Al aparecer se dibuja más despacio: es la presentación del icono. */
    svg.is-intro:not(.filled) > * { animation-duration: 640ms; animation-delay: calc(120ms + var(--i) * 70ms); }
    svg.is-intro.filled, svg.is-playing.filled[data-motion='draw'] { animation: icon-pop 420ms cubic-bezier(0.23, 1, 0.32, 1); }

    svg.is-playing[data-motion='spin'] { animation: icon-spin 600ms cubic-bezier(0.77, 0, 0.175, 1); }
    svg.is-playing[data-motion='right'] { animation: icon-nudge 420ms cubic-bezier(0.23, 1, 0.32, 1); --dx: 3px; --dy: 0px; }
    svg.is-playing[data-motion='left'] { animation: icon-nudge 420ms cubic-bezier(0.23, 1, 0.32, 1); --dx: -3px; --dy: 0px; }
    svg.is-playing[data-motion='down'] { animation: icon-nudge 420ms cubic-bezier(0.23, 1, 0.32, 1); --dx: 0px; --dy: 3px; }
    svg.is-playing[data-motion='up'] { animation: icon-nudge 420ms cubic-bezier(0.23, 1, 0.32, 1); --dx: 0px; --dy: -3px; }
    svg.is-playing[data-motion='pop'] { animation: icon-pop 420ms cubic-bezier(0.23, 1, 0.32, 1); }
    svg.is-playing[data-motion='shake'] { animation: icon-shake 420ms ease-in-out; }
    /* Mancuerna: se levanta y gira como en una repetición. */
    svg.is-playing[data-motion='lift'] { animation: icon-lift 620ms cubic-bezier(0.77, 0, 0.175, 1); }
    svg.is-playing[data-motion='tilt'] { animation: icon-tilt 460ms cubic-bezier(0.23, 1, 0.32, 1); }

    /* ---- Cardio y calentamiento: cada icono hace lo suyo, moviendo sus partes. ---- */
    /* Llama: titila desde la base. */
    svg.is-playing[data-motion='flicker'] { transform-origin: 50% 92%; animation: icon-flicker 640ms ease-in-out; }
    /* Corazón: dos latidos. En "pulso" solo late el corazón, no el marco. */
    svg.is-playing[data-motion='beat'] { animation: icon-beat 640ms ease-in-out; }
    svg.is-playing[data-motion='pulse'] > :last-child { transform-origin: 12px 12.5px; animation: icon-beat 640ms ease-in-out; }
    /* Corredor y caminante: dos zancadas; piernas y brazos se balancean en sentidos opuestos y el cuerpo rebota. */
    svg.is-playing[data-motion='stride'] { animation: icon-bob 640ms ease-in-out; }
    svg.is-playing[data-motion='stride'] > :nth-child(2) { transform-origin: 10px 16.5px; animation: icon-swing 640ms ease-in-out; --swing: 24deg; }
    svg.is-playing[data-motion='stride'] > :nth-child(3) { transform-origin: 12px 8px; animation: icon-swing 640ms ease-in-out; --swing: -8deg; }
    svg.is-playing[data-motion='stride'] > :nth-child(4) { transform-origin: 12px 8px; animation: icon-swing 640ms ease-in-out; --swing: 13deg; }
    /* Huellas: un pie y luego el otro. */
    svg.is-playing[data-motion='steps'] > :nth-child(-n + 2) { animation: icon-step-a 640ms ease-in-out; }
    svg.is-playing[data-motion='steps'] > :nth-child(n + 3) { animation: icon-step-b 640ms ease-in-out; }
    /* Bicicleta: las ruedas giran, el ciclista pedalea y la bici avanza. */
    svg.is-playing[data-motion='ride'] { animation: icon-ride 640ms cubic-bezier(0.23, 1, 0.32, 1); }
    svg.is-playing[data-motion='ride'] > :nth-child(-n + 2) { stroke-dasharray: 0.19 0.06; animation: icon-roll 640ms linear; }
    svg.is-playing[data-motion='ride'] > :nth-child(n + 3) { animation: icon-pedal 640ms ease-in-out; }
    /* Estiramiento: el cuerpo se alarga hacia adelante y regresa. */
    svg.is-playing[data-motion='reach'] { transform-origin: 50% 88%; animation: icon-reach 640ms cubic-bezier(0.23, 1, 0.32, 1); }
    /* Reloj: las manecillas dan una vuelta. Velocímetro: la aguja barre y se asienta. */
    svg.is-playing[data-motion='tick'] > :nth-child(2) { transform-origin: 12px 12px; animation: icon-turn 640ms cubic-bezier(0.77, 0, 0.175, 1); }
    svg.is-playing[data-motion='sweep'] > :nth-child(2) { transform-origin: 12px 14px; animation: icon-sweep 640ms cubic-bezier(0.23, 1, 0.32, 1); }

    @keyframes icon-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
    @keyframes icon-spin { to { transform: rotate(180deg); } }
    @keyframes icon-nudge { 45% { transform: translate(var(--dx), var(--dy)); } }
    @keyframes icon-pop { 40% { transform: scale(1.22); } }
    @keyframes icon-shake { 20% { transform: rotate(-9deg); } 50% { transform: rotate(8deg); } 80% { transform: rotate(-4deg); } }
    @keyframes icon-lift { 40% { transform: translateY(-3px) rotate(-24deg); } 70% { transform: translateY(-1px) rotate(6deg); } }
    @keyframes icon-tilt { 45% { transform: rotate(-14deg) scale(1.08); } }
    @keyframes icon-flicker { 15% { transform: scale(1.07, 0.93) skewX(-6deg); } 35% { transform: scale(0.94, 1.15) skewX(7deg); } 55% { transform: scale(1.05, 0.97) skewX(-5deg); } 78% { transform: scale(0.98, 1.08) skewX(3deg); } }
    @keyframes icon-beat { 14% { transform: scale(1.25); } 28% { transform: scale(0.96); } 42% { transform: scale(1.18); } 62% { transform: scale(1); } }
    @keyframes icon-bob { 25%, 75% { transform: translate(1px, -1.5px); } 50% { transform: translate(0.5px, 0); } }
    @keyframes icon-swing { 25% { transform: rotate(var(--swing)); } 75% { transform: rotate(calc(var(--swing) * -1)); } }
    @keyframes icon-step-a { 22% { transform: translateY(-3px); opacity: 0.5; } 45%, 100% { transform: none; opacity: 1; } }
    @keyframes icon-step-b { 0%, 45% { transform: none; opacity: 1; } 68% { transform: translateY(-3px); opacity: 0.5; } }
    @keyframes icon-ride { 45% { transform: translateX(2.5px) rotate(-4deg); } }
    @keyframes icon-roll { from { stroke-dashoffset: 0; } to { stroke-dashoffset: 1; } }
    @keyframes icon-pedal { 25%, 75% { transform: translateY(-0.9px); } 50% { transform: translateY(0.5px); } }
    @keyframes icon-reach { 40% { transform: skewX(-10deg) scaleY(0.93); } 72% { transform: skewX(3deg) scaleY(1.03); } }
    @keyframes icon-turn { to { transform: rotate(360deg); } }
    @keyframes icon-sweep { 30% { transform: rotate(-85deg); } 65% { transform: rotate(24deg); } }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(20);
  protected readonly shape = computed(() => ICONS[this.name()] as IconShape);
  protected readonly motion = computed<Motion>(() => MOTION[this.name()] ?? 'draw');
  /** Grosor equivalente a 1.8 en una caja de 24, sea cual sea la caja original del icono. */
  protected readonly strokeWidth = computed(() => {
    const [, , width] = this.shape().viewBox.split(' ').map(Number);
    return (1.8 * (width || 24)) / 24;
  });

  constructor() {
    const host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const trigger = host.closest(CONTROLS) ?? host.closest(ROWS) ?? host;
      let timer = 0;
      let encore = 0;
      // Quitar y volver a poner la clase reinicia la animación aunque siga en curso.
      const run = (name: 'is-playing' | 'is-intro') => {
        const svg = host.querySelector('svg');
        if (!svg) return;
        svg.classList.remove('is-playing', 'is-intro');
        void svg.getBoundingClientRect();
        svg.classList.add(name);
        clearTimeout(timer);
        timer = window.setTimeout(() => svg.classList.remove(name), name === 'is-intro' ? PLAY_MS * 2 : PLAY_MS);
      };
      const play = () => run('is-playing');
      trigger.addEventListener('pointerenter', play);

      // Los iconos decorativos (insignias y los que no están en un botón o enlace) se presentan al entrar en pantalla.
      const decorative = host.closest(BADGES) || !host.closest('a, button');
      const stopWatching = decorative
        ? watch(host, () => {
            run('is-intro');
            if (LIVELY.has(this.motion())) encore = window.setTimeout(play, INTRO_MS);
          })
        : null;

      destroyRef.onDestroy(() => {
        clearTimeout(timer);
        clearTimeout(encore);
        trigger.removeEventListener('pointerenter', play);
        stopWatching?.();
      });
    });
  }
}
