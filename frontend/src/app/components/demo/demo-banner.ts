import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Franja de la instalación de demostración: deja claro en todas las pantallas que nada es real ni se guarda. */
@Component({
  selector: 'app-demo-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="strip" role="note">
      <span class="tag">Demostración</span>
      <span class="text">Datos inventados · Puedes recorrer todo, pero los cambios no se guardan</span>
    </p>
  `,
  styles: `
    :host { display: block; position: relative; z-index: calc(var(--z-navbar, 50) + 1); }
    .strip {
      display: flex; align-items: center; justify-content: center; gap: var(--space-3);
      margin: 0; padding: 6px var(--gutter); min-height: 34px;
      background: var(--ink-0, #0a1f1c); color: var(--color-text-inverse);
      border-bottom: 1px solid var(--ink-line);
      font-size: var(--text-xs); line-height: 1.3; text-align: center;
    }
    .tag {
      flex: none; padding: 2px 10px; border-radius: var(--radius-pill);
      background: var(--color-mint); color: var(--ink-0, #0a1f1c);
      font-family: var(--font-mono); font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; font-size: 0.68rem;
    }
    .text { color: var(--ink-muted); }
  `,
})
export class DemoBanner {}
