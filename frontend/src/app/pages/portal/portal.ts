import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Icon, IconName } from '../../components/icon/icon';
import { NutritionPlanView } from '../../components/nutrition/nutrition-plan-view';
import { SkeletonDashboard } from '../../components/skeletons/skeleton-dashboard';
import { CheckinForm } from '../../components/tracking/checkin-form';
import { MeasurementsPanel } from '../../components/tracking/measurements-panel';
import { WeightTracker } from '../../components/tracking/weight-tracker';
import { TrainingOverview } from '../../components/training/training-overview';
import { TrainingReports } from '../../components/training/training-reports';
import { WeekSheet } from '../../components/training/week-sheet';
import { SYMBOLS } from '../../core/config/tracking-lists';
import { AuthService } from '../../core/services/auth.service';
import { ClientStore } from '../../core/services/client-store';
import { SeoService } from '../../core/services/seo.service';
import { dueLabel, formatDate, formatNumber, formatSigned } from '../../core/utils/format';
import { PanelUiStyles } from '../panel/shared/panel-ui-styles';

type Tab = 'summary' | 'training' | 'nutrition' | 'tracking';

const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: 'summary', label: 'Resumen', icon: 'home' },
  { key: 'training', label: 'Entrenamiento', icon: 'dumbbell' },
  { key: 'nutrition', label: 'Nutrición', icon: 'apple' },
  { key: 'tracking', label: 'Seguimiento', icon: 'chart' },
];

/** Portal del cliente: su plan completo y el registro de su avance, con su enlace privado. */
@Component({
  selector: 'app-portal',
  imports: [PanelUiStyles, Icon, SkeletonDashboard, TrainingOverview, TrainingReports, WeekSheet, NutritionPlanView, WeightTracker, CheckinForm, MeasurementsPanel],
  providers: [ClientStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portal.html',
  styleUrl: './portal.css',
})
export class Portal {
  /** Código del enlace privado (parámetro de la ruta). */
  readonly code = input.required<string>();

  protected readonly store = inject(ClientStore);
  /** Quien abre el enlace con sesión del panel es el coach ("Ver como cliente"). */
  protected readonly isCoach = inject(AuthService).admin() !== null;
  protected readonly tabs = TABS;
  protected readonly symbols = SYMBOLS;
  protected readonly tab = signal<Tab>('summary');
  protected readonly num = formatNumber;
  protected readonly signed = formatSigned;
  protected readonly date = formatDate;

  private readonly selectedWeek = signal<string | null>(null);
  /** Semana mostrada: la elegida o, por defecto, la más reciente. */
  protected readonly week = computed(() => {
    const weeks = this.store.training()?.weeks ?? [];
    return weeks.find((week) => week.id === this.selectedWeek()) ?? weeks.at(-1) ?? null;
  });

  protected readonly firstName = computed(() => this.store.client()?.fullName.split(' ')[0] ?? '');

  /** ¿Hoy toca entrenar según el plan de nutrición? Define qué calorías se muestran en el resumen. */
  protected readonly today = computed(() => {
    const nutrition = this.store.nutrition()?.computed;
    if (!nutrition) return null;
    const weekday = (new Date(`${this.store.today()}T00:00:00Z`).getUTCDay() + 6) % 7;
    return nutrition.week[weekday] ?? null;
  });

  protected readonly weekProgress = computed(() => {
    const week = this.week();
    if (!week) return null;
    const planned = week.days.reduce((sum, day) => sum + day.setsPlanned, 0);
    const done = week.days.reduce((sum, day) => sum + day.setsDone, 0);
    return { number: week.number, planned, done, pct: planned ? Math.min(100, (done / planned) * 100) : 0 };
  });

  protected readonly weightSummary = computed(() => {
    const weeks = this.store.tracking()?.weight.weeks ?? [];
    const last = weeks.filter((week) => week.average !== null).at(-1) ?? null;
    return { latest: this.store.tracking()?.weight.latest ?? null, average: last?.average ?? null, change: last?.changeKg ?? null, expected: last?.expected ?? null };
  });

  protected readonly weighedToday = computed(() => {
    const today = this.store.today();
    return (this.store.tracking()?.weight.weeks ?? []).some((week) => week.days.some((day) => day.date === today && day.weightKg !== null));
  });

  /** Aviso cuando el pago está cerca o ya venció. */
  protected readonly paymentAlert = computed(() => {
    const payment = this.store.payment();
    if (!payment?.dueDate || (payment.state !== 'soon' && payment.state !== 'overdue')) return null;
    const date = formatDate(payment.dueDate);
    return payment.state === 'overdue'
      ? { overdue: true, title: `Tu pago venció el ${date}`, text: `${dueLabel(payment.days)}. Ponte al corriente con tu coach para seguir con tu plan.` }
      : { overdue: false, title: `Tu próximo pago es el ${date}`, text: `${dueLabel(payment.days)}. Si ya lo hiciste, avísale a tu coach para que lo registre.` };
  });

  protected readonly checkinPending = computed(() => {
    const number = this.store.training()?.weeks.at(-1)?.number;
    return number !== undefined && !(this.store.tracking()?.checkins ?? []).some((c) => c.weekNumber === number);
  });

  constructor() {
    inject(SeoService).setPage({ title: 'Mi plan | Fitness by Evidence', noindex: true });
    effect(() => this.store.init(`portal/${encodeURIComponent(this.code())}`, false));
  }

  /** Clic en el logo: el cliente vuelve a su resumen (el coach navega al panel con el enlace). */
  protected goHome(): void {
    if (this.isCoach) return;
    this.tab.set('summary');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected selectWeek(id: string): void {
    this.selectedWeek.set(id);
  }
}
