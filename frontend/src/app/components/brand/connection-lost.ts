import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConnectionService } from '../../core/services/connection.service';
import { BrandMark } from './brand-mark';

/** Pantalla completa cuando el servidor no responde: la barra "se cayó" y la app reintenta sola. */
@Component({
  selector: 'app-connection-lost',
  imports: [BrandMark],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'lost-title' },
  template: `
    <div class="grid" aria-hidden="true"></div>
    <div class="box">
      <app-brand-mark tone="light" [broken]="!connection.checking()" [loading]="connection.checking()" />
      <p class="code">Sin conexión</p>
      <h1 id="lost-title" class="display">Se nos cayó la barra</h1>
      <p class="text">No pudimos conectar con el servidor. Revisa tu internet; en cuanto vuelva, la página se recarga sola.</p>
      <button type="button" class="retry" (click)="connection.retry()" [disabled]="connection.checking()">
        {{ connection.checking() ? 'Reintentando…' : 'Reintentar ahora' }}
      </button>
    </div>
  `,
  styles: `
    :host { position: fixed; inset: 0; z-index: calc(var(--z-toast) + 1); display: grid; place-items: center; padding: var(--space-5); background: var(--ink-0); color: var(--color-text-inverse); animation: lost-in 420ms var(--ease-out) both; overflow: hidden; }
    .grid { position: absolute; inset: 0; background: radial-gradient(ellipse 60% 55% at 50% 42%, color-mix(in srgb, var(--color-primary) 50%, transparent), transparent 70%); }
    .box { position: relative; display: grid; justify-items: center; gap: var(--space-4); max-width: 34rem; text-align: center; }
    app-brand-mark { width: min(17rem, 62vw); margin-bottom: var(--space-6); }
    .code { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.12em; text-transform: uppercase; color: var(--color-mint); }
    h1 { font-size: clamp(1.9rem, 1.1rem + 3.6vw, 3.4rem); line-height: 1.04; }
    .text { max-width: 30rem; color: var(--ink-muted); }
    .retry { min-height: 3rem; margin-top: var(--space-2); padding: 0.5rem 1.6rem; border: 0; border-radius: var(--radius-pill); background: var(--color-mint); font-weight: 650; color: var(--ink-0); transition: transform var(--duration-fast) var(--ease-out), box-shadow var(--duration) var(--ease-out), opacity var(--duration-fast); }
    .retry:active { transform: scale(0.97); }
    .retry:disabled { opacity: 0.6; }
    @media (hover: hover) and (pointer: fine) { .retry:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 14px 34px -14px var(--color-mint); } }
    @keyframes lost-in { from { opacity: 0; } }
  `,
})
export class ConnectionLost {
  protected readonly connection = inject(ConnectionService);
}
