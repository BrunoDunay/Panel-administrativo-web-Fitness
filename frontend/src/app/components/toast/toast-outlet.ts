import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';
import { Icon } from '../icon/icon';

/**
 * Avisos de la app. Cada uno "se materializa": un haz de luz traza la línea, el panel se despliega
 * desde ella, el texto se revela de izquierda a derecha y una barra marca el tiempo que le queda.
 * Al agotarse, el panel se pliega de vuelta a la línea y desaparece.
 */
@Component({
  selector: 'app-toast-outlet',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stack" role="status" aria-live="polite">
      @for (toast of toasts.toasts(); track toast.id) {
        <div [class]="'toast toast--' + toast.kind" [class.is-leaving]="toast.leaving" [style.--life.ms]="toast.duration">
          <span class="toast__beam" aria-hidden="true"></span>
          <span class="toast__icon"><app-icon [name]="toast.kind === 'success' ? 'check' : toast.kind === 'error' ? 'alert' : 'info'" [size]="18" /></span>
          <span class="toast__text">
            <small>{{ toast.kind === 'success' ? 'Hecho' : toast.kind === 'error' ? 'Atención' : 'Aviso' }}</small>
            <span>{{ toast.message }}</span>
          </span>
          <button type="button" class="close" (click)="toasts.dismiss(toast.id)" aria-label="Cerrar aviso">×</button>
          <span class="toast__life" aria-hidden="true"></span>
        </div>
      }
    </div>
  `,
  styles: `
    .stack {
      position: fixed;
      inset: auto var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom, 0px)) auto;
      z-index: var(--z-toast);
      display: grid;
      gap: var(--space-2);
      width: min(400px, calc(100vw - 2 * var(--space-4)));
      /* Los avisos no deben bloquear clics en lo que haya debajo. */
      pointer-events: none;
    }
    .toast {
      --glow: var(--color-mint);
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-3) calc(var(--space-3) + 3px) var(--space-3);
      border: 1px solid color-mix(in srgb, var(--glow) 45%, transparent);
      border-radius: var(--radius-md);
      background: linear-gradient(140deg, var(--ink-1), var(--ink-0));
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2), 0 18px 44px -18px color-mix(in srgb, var(--glow) 60%, transparent), var(--shadow-lg);
      font-size: var(--text-sm);
      color: var(--color-text-inverse);
      overflow: hidden;
      /* 1 · Nace como una línea y se despliega hacia arriba y abajo. */
      animation: toast-open 620ms var(--ease-out) both;
    }
    .toast--error { --glow: #ff8a73; }
    .toast--info { --glow: #7fc4e8; }

    /* El haz que "imprime" el aviso: cruza de izquierda a derecha mientras el panel se abre. */
    .toast__beam {
      position: absolute;
      inset: 0 auto 0 0;
      width: 38%;
      background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--glow) 55%, transparent), transparent);
      animation: toast-beam 760ms var(--ease-in-out) 120ms both;
      pointer-events: none;
    }
    .toast__icon {
      display: grid;
      place-items: center;
      flex: none;
      width: 2.25rem;
      height: 2.25rem;
      border: 1px solid color-mix(in srgb, var(--glow) 55%, transparent);
      border-radius: var(--radius-sm);
      background: color-mix(in srgb, var(--glow) 14%, transparent);
      color: var(--glow);
      animation: toast-pop 420ms var(--ease-spring) 380ms both;
    }
    /* 2 · El texto se revela de izquierda a derecha, como si se escribiera. */
    .toast__text { display: grid; flex: 1; min-width: 0; line-height: 1.35; animation: toast-type 620ms steps(22, end) 340ms both; }
    .toast__text small { font-family: var(--font-mono); font-size: 0.66rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--glow); }
    .close { flex: none; width: 2rem; height: 2rem; border: 0; border-radius: 50%; background: none; font-size: 1.2rem; line-height: 1; color: var(--ink-muted); pointer-events: auto; transition: background-color var(--duration-fast), color var(--duration-fast); }
    /* 3 · La barra de abajo se consume con el tiempo que le queda al aviso. */
    .toast__life { position: absolute; inset: auto 0 0 0; height: 3px; background: var(--glow); transform-origin: left; box-shadow: 0 0 12px var(--glow); animation: toast-life var(--life, 4000ms) linear both; }

    /* 4 · Salida: un parpadeo de señal, se pliega a la línea y se apaga. */
    .toast.is-leaving { animation: toast-close 460ms var(--ease-in) both; }
    .toast.is-leaving .toast__text, .toast.is-leaving .toast__icon { animation: toast-fade 200ms var(--ease-in) both; }

    @keyframes toast-open {
      0% { opacity: 0; clip-path: inset(49% 100% 49% 0 round var(--radius-md)); }
      35% { opacity: 1; clip-path: inset(49% 0 49% 0 round var(--radius-md)); }
      100% { opacity: 1; clip-path: inset(0 0 0 0 round var(--radius-md)); }
    }
    @keyframes toast-beam { from { transform: translateX(-110%); } to { transform: translateX(290%); } }
    @keyframes toast-pop { from { opacity: 0; transform: scale(0.5) rotate(-20deg); } }
    @keyframes toast-type { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
    @keyframes toast-life { from { transform: scaleX(1); } to { transform: scaleX(0); } }
    @keyframes toast-fade { to { opacity: 0; } }
    @keyframes toast-close {
      0% { opacity: 1; clip-path: inset(0 0 0 0 round var(--radius-md)); transform: none; }
      18% { opacity: 0.55; transform: translateX(3px); }
      30% { opacity: 1; transform: translateX(-2px); }
      70% { opacity: 1; clip-path: inset(49% 0 49% 0 round var(--radius-md)); transform: none; }
      100% { opacity: 0; clip-path: inset(49% 0 49% 100% round var(--radius-md)); }
    }
    @media (hover: hover) and (pointer: fine) {
      .close:hover { background: rgba(255, 255, 255, 0.1); color: var(--color-text-inverse); }
    }
  `,
})
export class ToastOutlet {
  protected readonly toasts = inject(ToastService);
}
