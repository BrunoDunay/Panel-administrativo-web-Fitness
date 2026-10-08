import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { Btn } from '../../../components/buttons/btn';
import { ConfirmService } from './confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  imports: [Btn],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'confirm.pending() && confirm.close(false)' },
  template: `
    @if (confirm.pending(); as p) {
      <div class="backdrop" (click)="confirm.close(false)"></div>
      <div class="dialog fade-up" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-msg">
        <h2 id="confirm-title">{{ p.title }}</h2>
        <p id="confirm-msg">{{ p.message }}</p>
        <div class="actions">
          <button appBtn variant="ghost" type="button" (click)="confirm.close(false)">Cancelar</button>
          <button #ok appBtn [variant]="p.danger ? 'danger' : 'solid'" type="button" (click)="confirm.close(true)">
            {{ p.confirmLabel ?? 'Confirmar' }}
          </button>
        </div>
      </div>
    }
  `,
  styles: `
    .backdrop { position: fixed; inset: 0; z-index: var(--z-modal); background: var(--color-overlay); }
    .dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      z-index: calc(var(--z-modal) + 1);
      display: grid;
      gap: var(--space-4);
      width: min(440px, calc(100vw - 2rem));
      padding: var(--space-6);
      background: var(--color-surface);
      box-shadow: var(--shadow-lg);
      translate: -50% -50%;
    }
    h2 { font-size: var(--text-2xl); }
    p { color: var(--color-text-muted); }
    .actions { display: flex; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-2); }
  `,
})
export class ConfirmDialog {
  protected readonly confirm = inject(ConfirmService);
  // `read: ElementRef`: el botón es un componente (appBtn); necesitamos el elemento nativo.
  private readonly ok = viewChild('ok', { read: ElementRef<HTMLButtonElement> });

  constructor() {
    effect(() => this.ok()?.nativeElement.focus());
  }
}
