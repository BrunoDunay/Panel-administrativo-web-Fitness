import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { Btn } from '../../../../components/buttons/btn';
import { Icon } from '../../../../components/icon/icon';
import { PaymentForm } from '../../../../components/payments/payment-form';
import { ClientStore } from '../../../../core/services/client-store';
import { Payment, PaymentDraft, PaymentState } from '../../../../core/types/client.model';
import { delayLabel, dueLabel, formatDate, formatMoney } from '../../../../core/utils/format';
import { Tone } from '../../../../core/utils/visuals';
import { ConfirmService } from '../../shared/confirm.service';

const STATE_TONE: Record<PaymentState, Tone> = { ok: 'emerald', soon: 'steel', overdue: 'coral', none: 'slate' };

/** Pagos del cliente: estado del próximo pago, registro de pagos (a tiempo, adelantados o tardíos) e historial. */
@Component({
  selector: 'app-client-payments',
  imports: [Btn, Icon, PaymentForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.payment(); as status) {
      <section [class]="'card card--vivid status icon-hover tone--' + tones[status.state]">
        <span class="tile-icon"><app-icon [name]="status.state === 'overdue' ? 'alert' : 'calendar'" [size]="24" /></span>
        <div class="status__text">
          <p class="status__eyebrow">Próximo pago · plan {{ status.planType || 'sin definir' }}</p>
          <p class="status__date">{{ status.dueDate ? date(status.dueDate) : 'Sin fecha de pago' }}</p>
          <p class="status__label">
            @switch (status.state) {
              @case ('none') { Registra el primer pago o define la fecha para empezar a llevar el control. }
              @case ('ok') { <b>Al corriente.</b> {{ due(status.days) }}. }
              @case ('soon') { <b>{{ due(status.days) }}.</b> Tu cliente ya ve el aviso en su panel. }
              @case ('overdue') { <b>{{ due(status.days) }}.</b> Tu cliente ve el aviso de pago vencido en su panel. }
            }
          </p>
        </div>
        <div class="status__actions">
          <button appBtn type="button" variant="light" (click)="mode.set('pay')"><app-icon name="dollar" [size]="16" />Registrar pago</button>
          <button appBtn type="button" variant="light" (click)="startDue(status.dueDate)"><app-icon name="edit" [size]="16" />Cambiar fecha</button>
        </div>
      </section>

      @if (mode() === 'pay') {
        <section class="card card--badge tone--emerald icon-hover">
          <span class="card__badge"><app-icon name="dollar" [size]="26" /></span>
          <h3 class="form-section__title title">Registrar pago</h3>
          <app-payment-form [today]="store.today()" [dueDate]="status.dueDate" [periodMonths]="status.periodMonths" [planType]="status.planType" [saving]="saving()" (save)="pay($event)" (cancel)="mode.set(null)" />
        </section>
      }

      @if (mode() === 'due') {
        <section class="card card--badge tone--steel icon-hover">
          <span class="card__badge"><app-icon name="calendar" [size]="26" /></span>
          <h3 class="form-section__title title">Cambiar la fecha del próximo pago</h3>
          <p class="card__hint hint">Úsalo para una prórroga o para corregir la fecha. No registra ningún pago.</p>
          <div class="due">
            <label class="field">
              <span class="field__label">Próximo pago</span>
              <input class="field__control" type="date" [value]="dueDraft() ?? ''" (change)="dueDraft.set($any($event.target).value || null)" />
            </label>
            <button appBtn type="button" [loading]="saving()" [disabled]="saving()" (click)="saveDue()">Guardar fecha</button>
            <button appBtn type="button" variant="ghost" (click)="mode.set(null)">Cancelar</button>
          </div>
        </section>
      }
    }

    <section class="card">
      <header class="card__head card__head--icon icon-hover">
        <span class="tile-icon tone--emerald"><app-icon name="history" [size]="20" /></span>
        <div>
          <h3 class="card__title">Historial de pagos</h3>
          <p class="card__hint">Cada pago guarda el vencimiento que cubrió y si llegó antes o después de lo acordado.</p>
        </div>
        @if (store.payments().length) {
          <span class="badge badge--success">{{ store.payments().length }} pago(s) · {{ money(total()) }}</span>
        }
      </header>

      @if (store.payments().length) {
        <div class="table-wrap">
          <table class="table table--hover">
            <thead>
              <tr><th>Pagó el</th><th class="num">Monto</th><th>Forma</th><th>Vencía el</th><th>Puntualidad</th><th>Siguiente pago</th><th>Notas</th><th></th></tr>
            </thead>
            <tbody>
              @for (payment of store.payments(); track payment.id) {
                <tr>
                  <td>{{ date(payment.paidOn) }}</td>
                  <td class="num">{{ money(payment.amount) }}</td>
                  <td>{{ payment.method || '—' }}</td>
                  <td>{{ date(payment.dueDate, true) }}</td>
                  <td>
                    @if (payment.delayDays === null) {
                      <span class="badge">Primer pago</span>
                    } @else {
                      <span class="badge" [class.badge--success]="payment.delayDays <= 0" [class.badge--danger]="payment.delayDays > 0">{{ delay(payment.delayDays) }}</span>
                    }
                  </td>
                  <td>{{ date(payment.nextDueDate, true) }}</td>
                  <td class="notes">{{ payment.notes || '—' }}</td>
                  <td><button type="button" class="icon-btn" (click)="remove(payment)" aria-label="Eliminar este pago"><app-icon name="trash" [size]="16" /></button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <p class="text-muted">Todavía no hay pagos registrados. Cuando tu cliente pague, regístralo aquí: la fecha del <b>siguiente pago</b> se recorre sola.</p>
      }
    </section>
  `,
  styles: `
    :host { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-5); }
    .status { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-4) var(--space-5); }
    .status .tile-icon { width: 3.5rem; height: 3.5rem; }
    .status__text { flex: 1; min-width: min(100%, 16rem); }
    .status__eyebrow { font-size: var(--text-xs); font-weight: 700; letter-spacing: var(--tracking-wider); text-transform: uppercase; opacity: 0.8; }
    .status__date { font-size: var(--text-3xl); font-weight: 700; line-height: 1.15; letter-spacing: -0.02em; }
    .status__label { font-size: var(--text-sm); opacity: 0.9; }
    .status__actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
    .title { margin-bottom: var(--space-4); }
    .hint { margin-top: calc(var(--space-3) * -1); margin-bottom: var(--space-4); text-align: center; }
    .due { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: center; gap: var(--space-3); }
    .due .field { width: min(100%, 14rem); }
    .notes { max-width: 16rem; color: var(--color-text-muted); }
    .icon-btn { display: grid; place-items: center; width: 2.2rem; height: 2.2rem; border: 0; border-radius: 50%; background: transparent; color: var(--color-text-muted); }
    @media (hover: hover) and (pointer: fine) { .icon-btn:hover { background: var(--color-danger-soft); color: var(--color-danger); } }
  `,
})
export class ClientPayments {
  protected readonly store = inject(ClientStore);
  private readonly confirm = inject(ConfirmService);

  protected readonly tones = STATE_TONE;
  protected readonly date = formatDate;
  protected readonly money = formatMoney;
  protected readonly due = dueLabel;
  protected readonly delay = delayLabel;

  protected readonly mode = signal<'pay' | 'due' | null>(null);
  protected readonly saving = signal(false);
  protected readonly dueDraft = signal<string | null>(null);
  protected readonly total = computed(() => this.store.payments().reduce((sum, payment) => sum + (payment.amount ?? 0), 0));

  protected startDue(current: string | null): void {
    this.dueDraft.set(current);
    this.mode.set('due');
  }

  protected pay(draft: PaymentDraft): void {
    this.run(this.store.addPayment(draft));
  }

  protected saveDue(): void {
    this.run(this.store.setPaymentDueDate(this.dueDraft()));
  }

  private run(request: Observable<unknown>): void {
    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.mode.set(null);
      },
      error: () => this.saving.set(false),
    });
  }

  protected async remove(payment: Payment): Promise<void> {
    const ok = await this.confirm.ask({
      title: '¿Eliminar este pago?',
      message: `Se borrará el pago del ${formatDate(payment.paidOn)}. Si es el más reciente, la fecha del próximo pago regresa a la anterior.`,
      confirmLabel: 'Eliminar pago',
      danger: true,
    });
    if (ok) this.store.deletePayment(payment.id).subscribe();
  }
}
