import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-outlet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stack" role="status" aria-live="polite">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="toast fade-up" [class]="'toast--' + toast.kind">
          <span>{{ toast.message }}</span>
          <button type="button" class="close" (click)="toasts.dismiss(toast.id)" aria-label="Cerrar aviso">×</button>
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
      width: min(380px, calc(100vw - 2 * var(--space-4)));
      /* Los avisos no deben bloquear clics en lo que haya debajo. */
      pointer-events: none;
    }
    .close { pointer-events: auto; }
    .toast {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border-left: 3px solid var(--color-primary);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      box-shadow: var(--shadow-lg);
      font-size: var(--text-sm);
      font-weight: 400;
    }
    .toast--success { border-left-color: var(--color-success); }
    .toast--error { border-left-color: var(--color-danger); }
    .close { border: 0; background: none; font-size: 1.2rem; line-height: 1; color: var(--color-text-muted); }
  `,
})
export class ToastOutlet {
  protected readonly toasts = inject(ToastService);
}
