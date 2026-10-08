import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Btn } from '../../../components/buttons/btn';
import { Icon, IconName } from '../../../components/icon/icon';
import { NutritionPlanView } from '../../../components/nutrition/nutrition-plan-view';
import { SkeletonDashboard } from '../../../components/skeletons/skeleton-dashboard';
import { CheckinForm } from '../../../components/tracking/checkin-form';
import { MeasurementsPanel } from '../../../components/tracking/measurements-panel';
import { WeightTracker } from '../../../components/tracking/weight-tracker';
import { TrainingOverview } from '../../../components/training/training-overview';
import { TrainingReports } from '../../../components/training/training-reports';
import { WeekSheet } from '../../../components/training/week-sheet';
import { CHECKIN_QUESTIONS, CHECKIN_RATINGS } from '../../../core/config/tracking-lists';
import { PanelApi } from '../../../core/services/api/panel-api.service';
import { ClientStore } from '../../../core/services/client-store';
import { ToastService } from '../../../core/services/toast.service';
import { ApiError } from '../../../core/types/common.model';
import { PaymentState } from '../../../core/types/client.model';
import { dueLabel, formatDate, formatNumber, formatSigned, initials, whatsappLink } from '../../../core/utils/format';
import { Tone } from '../../../core/utils/visuals';
import { ConfirmService } from '../shared/confirm.service';
import { PageHeader } from '../shared/page-header';
import { ClientFormValue, ClientProfileForm } from './client-profile-form';
import { NutritionEditor } from './nutrition/nutrition-editor';
import { ClientPayments } from './payments/client-payments';
import { TrainingPlanEditor } from './training/training-plan-editor';
import { WeekPrescriptionEditor } from './training/week-prescription-editor';

type Tab = 'summary' | 'profile' | 'training' | 'nutrition' | 'tracking' | 'payments';
type TrainingView = 'plan' | 'weeks' | 'reports';

const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: 'summary', label: 'Resumen', icon: 'home' },
  { key: 'profile', label: 'Expediente', icon: 'user' },
  { key: 'training', label: 'Entrenamiento', icon: 'dumbbell' },
  { key: 'nutrition', label: 'Nutrición', icon: 'food' },
  { key: 'tracking', label: 'Seguimiento', icon: 'chart' },
  { key: 'payments', label: 'Pagos', icon: 'dollar' },
];

/** El entrenamiento se arma en orden: primero el plan, luego las semanas; los reportes salen solos. */
const TRAINING_STEPS: { key: TrainingView; label: string; hint: string; icon: IconName }[] = [
  { key: 'plan', label: 'Plan y split', hint: 'Objetivo, bloque y días', icon: 'target' },
  { key: 'weeks', label: 'Semanas', hint: 'Ejercicios de cada día', icon: 'calendar' },
  { key: 'reports', label: 'Volumen y progreso', hint: 'Se calcula solo', icon: 'chart' },
];

const PAYMENT_TONE: Record<PaymentState, Tone> = { ok: 'emerald', soon: 'steel', overdue: 'coral', none: 'slate' };

/** Expediente del cliente: todo su trabajo en un solo lugar (lo que antes era un Excel por persona). */
@Component({
  selector: 'app-client-detail',
  imports: [
    PageHeader,
    Btn,
    Icon,
    SkeletonDashboard,
    ClientProfileForm,
    TrainingOverview,
    TrainingPlanEditor,
    WeekPrescriptionEditor,
    WeekSheet,
    TrainingReports,
    NutritionEditor,
    NutritionPlanView,
    WeightTracker,
    CheckinForm,
    MeasurementsPanel,
    ClientPayments,
  ],
  providers: [ClientStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './client-detail.html',
  styleUrl: './client-detail.css',
})
export class ClientDetail {
  /** Parámetro de la ruta. */
  readonly id = input.required<string>();

  protected readonly store = inject(ClientStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly catalog = toSignal(inject(PanelApi).catalog());

  protected readonly tabs = TABS;
  protected readonly tab = signal<Tab>('summary');
  protected readonly trainingSteps = TRAINING_STEPS;
  protected readonly paymentTone = PAYMENT_TONE;
  protected readonly due = dueLabel;
  protected readonly trainingView = signal<TrainingView>('weeks');
  protected readonly weekMode = signal<'prescription' | 'log'>('prescription');
  protected readonly nutritionView = signal<'edit' | 'client'>('edit');
  protected readonly savingProfile = signal(false);
  protected readonly profileErrors = signal<Record<string, string>>({});
  protected readonly ratings = CHECKIN_RATINGS;
  protected readonly questions = CHECKIN_QUESTIONS;

  protected readonly date = formatDate;
  protected readonly num = formatNumber;
  protected readonly signed = formatSigned;
  protected readonly initials = initials;

  private readonly selectedWeek = signal<string | null>(null);
  protected readonly week = computed(() => {
    const weeks = this.store.training()?.weeks ?? [];
    return weeks.find((week) => week.id === this.selectedWeek()) ?? weeks.at(-1) ?? null;
  });
  protected readonly isLastWeek = computed(() => this.week()?.id === this.store.training()?.weeks.at(-1)?.id);

  protected readonly whatsapp = computed(() => {
    const client = this.store.client();
    if (!client?.portalUrl) return null;
    return whatsappLink(client.phone, `Hola ${client.fullName.split(' ')[0]}, este es el enlace a tu plan personalizado. Guárdalo, es solo para ti: ${client.portalUrl}`);
  });

  /** Punto de aviso en la pestaña de pagos cuando el pago está cerca o vencido. */
  protected readonly paymentBadge = computed(() => {
    const state = this.store.payment()?.state;
    return state === 'soon' || state === 'overdue' ? state : null;
  });

  protected readonly lastCheckin = computed(() => this.store.tracking()?.checkins.at(-1) ?? null);
  protected readonly weightSummary = computed(() => {
    const weeks = (this.store.tracking()?.weight.weeks ?? []).filter((week) => week.average !== null);
    const last = weeks.at(-1) ?? null;
    return { average: last?.average ?? null, change: last?.changeKg ?? null, expected: last?.expected ?? null };
  });

  constructor() {
    effect(() => this.store.init(`clients/${this.id()}`, true));
  }

  protected selectWeek(id: string): void {
    this.selectedWeek.set(id);
  }

  protected saveProfile(value: ClientFormValue): void {
    this.savingProfile.set(true);
    this.profileErrors.set({});
    this.store.saveClient(value).subscribe({
      next: () => this.savingProfile.set(false),
      error: (error: ApiError) => {
        this.savingProfile.set(false);
        this.profileErrors.set(error.fields ?? {});
      },
    });
  }

  protected async copyLink(): Promise<void> {
    const url = this.store.client()?.portalUrl;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      this.toast.success('Enlace copiado.');
    } catch {
      this.toast.info(url);
    }
  }

  protected async regenerateLink(): Promise<void> {
    const ok = await this.confirm.ask({
      title: '¿Generar un enlace nuevo?',
      message: 'El enlace actual dejará de funcionar de inmediato. Tendrás que enviarle el nuevo al cliente.',
      confirmLabel: 'Generar enlace nuevo',
      danger: true,
    });
    if (ok) this.store.regenerateLink().subscribe();
  }

  protected startTraining(): void {
    this.store.saveTrainingPlan({}, 'Plan creado. Define el split y las prioridades.').subscribe(() => this.trainingView.set('plan'));
  }

  protected addWeek(): void {
    this.store.addWeek().subscribe((week) => {
      this.selectedWeek.set(week.id);
      this.weekMode.set('prescription');
      this.toast.success(week.number === 1 ? 'Semana 1 creada.' : `Semana ${week.number} creada con la pauta de la semana ${week.number - 1}.`);
    });
  }

  protected async deleteWeek(): Promise<void> {
    const week = this.week();
    if (!week) return;
    const ok = await this.confirm.ask({
      title: `¿Eliminar la semana ${week.number}?`,
      message: 'Se borrará su pauta y todo lo que el cliente haya registrado en ella. No se puede deshacer.',
      confirmLabel: 'Eliminar semana',
      danger: true,
    });
    if (ok) this.store.deleteWeek(week.id).subscribe(() => this.selectedWeek.set(null));
  }

  protected async deleteClient(): Promise<void> {
    const client = this.store.client();
    if (!client) return;
    const ok = await this.confirm.ask({
      title: `¿Eliminar a ${client.fullName}?`,
      message: 'Se borrarán su expediente, sus planes y todo su seguimiento. No se puede deshacer. Si solo dejó de entrenar, mejor archívalo desde el expediente.',
      confirmLabel: 'Eliminar cliente',
      danger: true,
    });
    if (!ok) return;
    this.store.deleteClient().subscribe(() => {
      this.toast.success('Cliente eliminado.');
      void this.router.navigate(['/panel/clients']);
    });
  }
}
