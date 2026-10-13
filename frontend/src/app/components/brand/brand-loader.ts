import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BrandMark } from './brand-mark';

/**
 * Cargador de la app: el isotipo "levantando" mientras llega el contenido.
 * Se usa en lugar de los esqueletos grises y, a pantalla completa, al cambiar de sección.
 */
@Component({
  selector: 'app-brand-loader',
  imports: [BrandMark],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status', 'aria-live': 'polite', '[class.is-overlay]': 'overlay()', '[class.on-dark]': 'dark()' },
  template: `
    <app-brand-mark [tone]="dark() ? 'light' : 'color'" [loading]="true" />
    <p class="label">{{ label() }}<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span></p>
  `,
  styles: `
    :host { display: grid; justify-items: center; align-content: center; gap: var(--space-4); min-height: var(--loader-min, 16rem); padding: var(--space-6); animation: loader-in 320ms var(--ease-out) 120ms both; }
    app-brand-mark { width: min(11rem, 46vw); }
    .label { display: inline-flex; align-items: baseline; gap: 0.15rem; font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-text-muted); }
    .dots { display: inline-flex; gap: 0.2rem; margin-left: 0.25rem; }
    .dots i { width: 0.22rem; height: 0.22rem; border-radius: 50%; background: currentColor; animation: dot 1100ms var(--ease-in-out) infinite; }
    .dots i:nth-child(2) { animation-delay: 150ms; }
    .dots i:nth-child(3) { animation-delay: 300ms; }
    @keyframes dot { 0%, 100% { opacity: 0.25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }
    @keyframes loader-in { from { opacity: 0; transform: scale(0.96); } }
    /* A pantalla completa: cubre la vista mientras se descarga la siguiente sección. */
    :host(.is-overlay) { position: fixed; inset: 0; z-index: var(--z-toast); min-height: 0; background: color-mix(in srgb, var(--ink-0) 82%, transparent); backdrop-filter: blur(10px); }
    :host(.on-dark) .label { color: var(--ink-muted); }
  `,
})
export class BrandLoader {
  readonly label = input('Cargando');
  readonly overlay = input(false);
  readonly dark = input(false);
}
