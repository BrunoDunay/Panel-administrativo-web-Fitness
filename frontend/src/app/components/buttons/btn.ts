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
        box-shadow var(--duration) var(--ease-out),
        filter var(--duration-fast) ease,
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

    /* Principal: degradado esmeralda con brillo; ya no es un color plano. */
    :host(.btn--solid) { background: var(--gradient-emerald); color: #ffffff; box-shadow: 0 10px 22px -12px var(--color-primary), inset 0 1px 0 rgba(255, 255, 255, 0.22); }
    :host(.btn--outline) { border-color: var(--color-border-strong); color: var(--color-text); background: var(--color-surface); }
    :host(.btn--ghost) { background: transparent; color: var(--color-text-muted); padding-inline: var(--space-3); }
    /* Secundario: blanco con contorno esmeralda (antes, relleno pastel). */
    :host(.btn--soft) { border-color: color-mix(in srgb, var(--color-primary) 55%, transparent); background: var(--color-surface); color: var(--color-primary); }
    :host(.btn--light) { background: var(--color-text-inverse); color: var(--color-secondary); }
    :host(.btn--danger) { background: var(--gradient-coral); color: #ffffff; box-shadow: 0 10px 22px -12px var(--color-danger), inset 0 1px 0 rgba(255, 255, 255, 0.22); }

    @media (hover: hover) and (pointer: fine) {
      :host(.btn--solid:hover) { filter: brightness(1.08) saturate(1.08); box-shadow: 0 14px 28px -12px var(--color-primary), inset 0 1px 0 rgba(255, 255, 255, 0.22); transform: translateY(-1px); }
      :host(.btn--outline:hover) { border-color: var(--color-primary); color: var(--color-primary); }
      :host(.btn--ghost:hover) { color: var(--color-primary); background: var(--color-primary-soft); }
      :host(.btn--soft:hover) { border-color: var(--color-primary); background: var(--color-primary); color: #ffffff; }
      :host(.btn--light:hover) { background: var(--color-surface); }
      :host(.btn--danger:hover) { filter: brightness(1.08); transform: translateY(-1px); }
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
