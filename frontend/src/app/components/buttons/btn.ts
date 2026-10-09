import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BtnVariant = 'solid' | 'outline' | 'ghost' | 'light' | 'danger' | 'soft';

/**
 * Botón del sistema de diseño (píldora, como en las referencias del panel).
 * Uso: <button appBtn variant="outline">…</button> o <a appBtn routerLink="…">…</a>
 */
@Component({
  selector: 'button[appBtn], a[appBtn]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'btn',
    '[class.btn--solid]': "variant() === 'solid'",
    '[class.btn--outline]': "variant() === 'outline'",
    '[class.btn--ghost]': "variant() === 'ghost'",
    '[class.btn--light]': "variant() === 'light'",
    '[class.btn--danger]': "variant() === 'danger'",
    '[class.btn--soft]': "variant() === 'soft'",
    '[class.btn--sm]': "size() === 'sm'",
    '[class.btn--lg]': "size() === 'lg'",
    '[class.btn--block]': 'block()',
    '[attr.aria-busy]': 'loading() || null',
  },
  template: `
    @if (loading()) {
      <span class="spinner" aria-hidden="true"></span>
    }
    <ng-content />
  `,
  styles: `
    :host {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      min-height: 2.6rem;
      padding: 0.5rem 1.25rem;
      border: 1px solid transparent;
      border-radius: var(--radius-pill);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      font-weight: 600;
      text-align: center;
      white-space: nowrap;
      user-select: none;
      transition:
        background-color var(--duration-fast) ease,
        color var(--duration-fast) ease,
        border-color var(--duration-fast) ease,
        transform 140ms var(--ease-out);
    }
    /* La interfaz responde al toque: el botón cede un poco al presionarlo. */
    :host(:active) { transform: scale(0.97); }
    :host([disabled]), :host([aria-disabled='true']) { opacity: 0.5; pointer-events: none; }
    :host(.btn--sm) { min-height: 2.1rem; padding: 0.3rem 0.9rem; font-size: var(--text-xs); }
    :host(.btn--lg) { min-height: 3.2rem; padding: 0.75rem 1.9rem; font-size: var(--text-base); }
    /* Teléfono: el botón de guardar que se queda fijo abajo va compacto para no tapar el contenido. */
    @media (max-width: 720px) {
      :host-context(.actions).btn--lg { min-height: 2.5rem; padding: 0.4rem 1rem; font-size: var(--text-sm); }
    }
    :host(.btn--block) { display: flex; width: 100%; }

    :host(.btn--solid) { background: var(--color-primary); color: var(--color-text-inverse); }
    :host(.btn--outline) { border-color: var(--color-border-strong); color: var(--color-text); background: var(--color-surface); }
    :host(.btn--ghost) { background: transparent; color: var(--color-text-muted); padding-inline: var(--space-3); }
    :host(.btn--soft) { background: var(--color-primary-soft); color: var(--color-primary); }
    :host(.btn--light) { background: var(--color-text-inverse); color: var(--color-secondary); }
    :host(.btn--danger) { background: var(--color-danger); color: var(--color-text-inverse); }

    @media (hover: hover) and (pointer: fine) {
      :host(.btn--solid:hover) { background: var(--color-primary-hover); }
      :host(.btn--outline:hover) { border-color: var(--color-primary); color: var(--color-primary); }
      :host(.btn--ghost:hover) { color: var(--color-primary); background: var(--color-primary-soft); }
      :host(.btn--soft:hover) { background: color-mix(in srgb, var(--color-primary) 22%, var(--color-surface)); }
      :host(.btn--light:hover) { background: var(--color-surface); }
      :host(.btn--danger:hover) { background: color-mix(in srgb, var(--color-danger) 88%, black); }
    }

    .spinner {
      width: 0.9em;
      height: 0.9em;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `,
})
export class Btn {
  readonly variant = input<BtnVariant>('solid');
  readonly size = input<'md' | 'sm' | 'lg'>('md');
  readonly block = input(false);
  readonly loading = input(false);
}
