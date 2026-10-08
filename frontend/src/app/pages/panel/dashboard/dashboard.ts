import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Btn } from '../../../components/buttons/btn';
import { Icon } from '../../../components/icon/icon';
import { PaymentForm } from '../../../components/payments/payment-form';
import { SkeletonDashboard } from '../../../components/skeletons/skeleton-dashboard';
import { PanelApi } from '../../../core/services/api/panel-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Dashboard as DashboardData, DashboardPayment, PaymentDraft } from '../../../core/types/client.model';
import { dueLabel, formatDate, initials } from '../../../core/utils/format';
import { PageHeader } from '../shared/page-header';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, PageHeader, Btn, Icon, SkeletonDashboard, PaymentForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'paying.set(null)' },
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly api = inject(PanelApi);
  private readonly toast = inject(ToastService);
  protected readonly name = inject(AuthService).admin()?.name.split(' ')[0] ?? '';
  protected readonly data = signal<DashboardData | null>(null);
  protected readonly site = toSignal(this.api.settings());
  protected readonly date = formatDate;
  protected readonly due = dueLabel;
  protected readonly initials = initials;

  /** Cliente al que se le está registrando un pago desde el resumen. */
  protected readonly paying = signal<DashboardPayment | null>(null);
  protected readonly savingPayment = signal(false);
  protected readonly overdue = computed(() => this.data()?.payments.filter((payment) => payment.overdue).length ?? 0);

  constructor() {
    this.reload();
  }

  private reload(): void {
    this.api.dashboard().subscribe((data) => this.data.set(data));
  }

  protected pay(payment: DashboardPayment, draft: PaymentDraft): void {
    this.savingPayment.set(true);
    this.api.registerPayment(payment.clientId, draft).subscribe({
      next: (saved) => {
        this.savingPayment.set(false);
        this.paying.set(null);
        this.toast.success(`Pago de ${payment.clientName} registrado. Siguiente pago: ${formatDate(saved.nextDueDate)}.`);
        this.reload();
      },
      error: () => this.savingPayment.set(false),
    });
  }

  /** Secciones de la landing que siguen con contenido provisional. */
  protected pendingSections(): string[] {
    const site = this.site();
    if (!site) return [];
    const labels: Record<string, string> = { hero: 'Portada', services: 'Servicios', method: 'Método', about: 'Sobre el coach', contact: 'Contacto' };
    return Object.entries(labels)
      .filter(([key]) => (site as unknown as Record<string, { isProvisional?: boolean }>)[key]?.isProvisional)
      .map(([, label]) => label);
  }
}
