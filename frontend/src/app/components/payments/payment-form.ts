import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { Btn } from '../buttons/btn';
import { Icon } from '../icon/icon';
import { PAYMENT_METHODS } from '../../core/config/tracking-lists';
import { PaymentDraft } from '../../core/types/client.model';
import { addMonths, delayLabel, formatDate, toNumber } from '../../core/utils/format';

const DAY_MS = 864e5;

/**
 * Captura de un pago: cuándo pagó, cuánto, cómo y cuándo vence el siguiente.
 * El siguiente vencimiento se propone solo (vencimiento actual + periodo del plan) y se puede cambiar.
 */
@Component({
  selector: 'app-payment-form',
  imports: [Btn, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="form-section" (submit)="$event.preventDefault(); submit()" novalidate>
      <div class="form-grid">
        <label class="field">
          <span class="field__label">Fecha en que pagó</span>
          <input class="field__control" type="date" [max]="today()" [value]="paidOn()" (change)="paidOn.set($any($event.target).value)" required />
        </label>
        <label class="field">
          <span class="field__label">Monto (opcional)</span>
          <input class="field__control" type="number" inputmode="decimal" min="0" step="50" placeholder="$" [value]="amount() ?? ''" (change)="amount.set(num($any($event.target).value))" />
        </label>
        <label class="field">
          <span class="field__label">Forma de pago</span>
          <select class="field__control" (change)="method.set($any($event.target).value || null)">
            <option value="" [selected]="!method()">—</option>
            @for (option of methods; track option) { <option [value]="option" [selected]="method() === option">{{ option }}</option> }
          </select>
        </label>
        <label class="field">
          <span class="field__label">Próximo pago</span>
          <input class="field__control" type="date" [value]="nextDue()" (change)="customNext.set($any($event.target).value || null)" />
          <span class="field__hint">
            @if (customNext() && customNext() !== suggested()) {
              <button type="button" class="reset" (click)="customNext.set(null)">Usar el sugerido: {{ date(suggested(), true) }}</button>
            } @else {
              Sugerido por el plan {{ planLabel() }}
            }
          </span>
        </label>
        <label class="field span-all">
          <span class="field__label">Notas</span>
          <input class="field__control" maxlength="500" placeholder="Folio, promoción, acuerdo…" [value]="notes() ?? ''" (change)="notes.set($any($event.target).value.trim() || null)" />
        </label>
      </div>

      @if (timing(); as t) {
        <p class="notice" [class.notice--success]="t.days <= 0" [class.notice--warning]="t.days > 0">
          <app-icon [name]="t.days > 0 ? 'clock' : 'check'" [size]="18" />
          <span>Cubre el pago que vencía el <b>{{ date(dueDate()) }}</b>: <b>{{ t.label }}</b>.</span>
        </p>
      }

      <div class="row">
        <button appBtn type="submit" [loading]="saving()" [disabled]="saving() || !paidOn()"><app-icon name="check" [size]="16" />Registrar pago</button>
        <button appBtn type="button" variant="ghost" (click)="cancel.emit()">Cancelar</button>
      </div>
    </form>
  `,
  styles: `
    .reset { padding: 0; border: 0; background: none; font-size: inherit; font-weight: 600; color: var(--color-primary); text-decoration: underline; }
    .notice { align-items: center; }
  `,
})
export class PaymentForm {
  readonly today = input.required<string>();
  /** Vencimiento que se está pagando (si el cliente ya tiene fecha de pago). */
  readonly dueDate = input<string | null>(null);
  readonly periodMonths = input(1);
  readonly planType = input<string | null>(null);
  readonly saving = input(false);
  readonly save = output<PaymentDraft>();
  readonly cancel = output<void>();

  protected readonly methods = PAYMENT_METHODS;
  protected readonly date = formatDate;
  protected readonly num = toNumber;

  protected readonly paidOn = signal('');
  protected readonly amount = signal<number | null>(null);
  protected readonly method = signal<string | null>(null);
  protected readonly notes = signal<string | null>(null);
  /** Fecha del siguiente pago escrita a mano; null = la sugerida. */
  protected readonly customNext = signal<string | null>(null);

  protected readonly suggested = computed(() => addMonths(this.dueDate() ?? (this.paidOn() || this.today()), this.periodMonths()));
  protected readonly nextDue = computed(() => this.customNext() ?? this.suggested());
  protected readonly planLabel = computed(() => (this.planType() ? this.planType()!.toLowerCase() : 'mensual'));

  /** Puntualidad respecto al vencimiento que cubre. */
  protected readonly timing = computed(() => {
    const due = this.dueDate();
    if (!due || !this.paidOn()) return null;
    const days = Math.round((Date.parse(`${this.paidOn()}T00:00:00Z`) - Date.parse(`${due}T00:00:00Z`)) / DAY_MS);
    return { days, label: days === 0 ? 'pagó a tiempo' : `pagó ${delayLabel(days)}` };
  });

  constructor() {
    effect(() => this.paidOn.set(this.today()));
  }

  protected submit(): void {
    if (!this.paidOn()) return;
    this.save.emit({ paidOn: this.paidOn(), amount: this.amount(), method: this.method(), notes: this.notes(), nextDueDate: this.nextDue() });
  }
}
