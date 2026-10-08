import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CUSTOM_ICONS } from './custom-icons';
import { ITSHOVER_ICONS, IconShape } from './itshover-icons';

const ICONS = { ...ITSHOVER_ICONS, ...CUSTOM_ICONS };

export type IconName = keyof typeof ICONS;

/** Cómo se mueve el icono cuando el cursor pasa sobre el botón, enlace o tarjeta que lo contiene. */
type Motion = 'draw' | 'spin' | 'right' | 'left' | 'down' | 'up' | 'pop' | 'shake' | 'lift' | 'tilt';

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
  arrowUp: 'up',
  rocket: 'up',
  heart: 'pop',
  star: 'pop',
  flame: 'pop',
  sparkles: 'pop',
  check: 'pop',
  plus: 'pop',
  trophy: 'pop',
  drop: 'pop',
  trash: 'shake',
  alert: 'shake',
  dumbbell: 'lift',
  scale: 'tilt',
  edit: 'tilt',
  pill: 'tilt',
  swap: 'tilt',
};

/**
 * Icono de trazo. Los dibujos vienen de itshover (ver itshover-icons.ts) y de custom-icons.ts.
 * itshover anima con React + Motion; aquí la animación al pasar el cursor está rehecha en CSS.
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

    /* La animación corre cuando el cursor entra al control que contiene el icono. */
    @media (hover: hover) and (pointer: fine) {
      /* Dibujado: cada trazo se recorre de principio a fin, uno tras otro. */
      :host-context(a:hover) svg[data-motion='draw']:not(.filled) > *,
      :host-context(button:hover) svg[data-motion='draw']:not(.filled) > *,
      :host-context(.icon-hover:hover) svg[data-motion='draw']:not(.filled) > * {
        stroke-dasharray: 1;
        animation: icon-draw 420ms cubic-bezier(0.23, 1, 0.32, 1) both;
        animation-delay: calc(var(--i) * 45ms);
      }

      :host-context(a:hover) svg[data-motion='spin'], :host-context(button:hover) svg[data-motion='spin'], :host-context(.icon-hover:hover) svg[data-motion='spin'] { animation: icon-spin 600ms cubic-bezier(0.77, 0, 0.175, 1); }
      :host-context(a:hover) svg[data-motion='right'], :host-context(button:hover) svg[data-motion='right'], :host-context(.icon-hover:hover) svg[data-motion='right'] { animation: icon-nudge 420ms cubic-bezier(0.23, 1, 0.32, 1); --dx: 3px; --dy: 0px; }
      :host-context(a:hover) svg[data-motion='left'], :host-context(button:hover) svg[data-motion='left'], :host-context(.icon-hover:hover) svg[data-motion='left'] { animation: icon-nudge 420ms cubic-bezier(0.23, 1, 0.32, 1); --dx: -3px; --dy: 0px; }
      :host-context(a:hover) svg[data-motion='down'], :host-context(button:hover) svg[data-motion='down'], :host-context(.icon-hover:hover) svg[data-motion='down'] { animation: icon-nudge 420ms cubic-bezier(0.23, 1, 0.32, 1); --dx: 0px; --dy: 3px; }
      :host-context(a:hover) svg[data-motion='up'], :host-context(button:hover) svg[data-motion='up'], :host-context(.icon-hover:hover) svg[data-motion='up'] { animation: icon-nudge 420ms cubic-bezier(0.23, 1, 0.32, 1); --dx: 0px; --dy: -3px; }
      :host-context(a:hover) svg[data-motion='pop'], :host-context(button:hover) svg[data-motion='pop'], :host-context(.icon-hover:hover) svg[data-motion='pop'] { animation: icon-pop 420ms cubic-bezier(0.23, 1, 0.32, 1); }
      :host-context(a:hover) svg[data-motion='shake'], :host-context(button:hover) svg[data-motion='shake'], :host-context(.icon-hover:hover) svg[data-motion='shake'] { animation: icon-shake 420ms ease-in-out; }
      /* Mancuerna: se levanta y gira como en una repetición. */
      :host-context(a:hover) svg[data-motion='lift'], :host-context(button:hover) svg[data-motion='lift'], :host-context(.icon-hover:hover) svg[data-motion='lift'] { animation: icon-lift 620ms cubic-bezier(0.77, 0, 0.175, 1); }
      :host-context(a:hover) svg[data-motion='tilt'], :host-context(button:hover) svg[data-motion='tilt'], :host-context(.icon-hover:hover) svg[data-motion='tilt'] { animation: icon-tilt 460ms cubic-bezier(0.23, 1, 0.32, 1); }
    }

    /* Dentro de una insignia (.tile-icon) el ícono se dibuja una vez al aparecer. */
    :host-context(.tile-icon) svg:not(.filled) > * {
      stroke-dasharray: 1;
      animation: icon-draw 700ms cubic-bezier(0.23, 1, 0.32, 1) both;
      animation-delay: calc(180ms + var(--i) * 70ms);
    }

    @keyframes icon-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
    @keyframes icon-spin { to { transform: rotate(180deg); } }
    @keyframes icon-nudge { 45% { transform: translate(var(--dx), var(--dy)); } }
    @keyframes icon-pop { 40% { transform: scale(1.22); } }
    @keyframes icon-shake { 20% { transform: rotate(-9deg); } 50% { transform: rotate(8deg); } 80% { transform: rotate(-4deg); } }
    @keyframes icon-lift { 40% { transform: translateY(-3px) rotate(-24deg); } 70% { transform: translateY(-1px) rotate(6deg); } }
    @keyframes icon-tilt { 45% { transform: rotate(-14deg) scale(1.08); } }
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
}
