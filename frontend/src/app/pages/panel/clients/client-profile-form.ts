import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Btn } from '../../../components/buttons/btn';
import { Icon } from '../../../components/icon/icon';
import { PAYMENT_METHODS } from '../../../core/config/tracking-lists';
import { Client, ClientProfile, ClientStatus } from '../../../core/types/client.model';
import { addMonths, formatDate, formatMoney, toNumber } from '../../../core/utils/format';

export interface ClientFormValue {
  fullName: string;
  birthDate: string | null;
  sex: 'male' | 'female' | null;
  heightCm: number | null;
  initialWeightKg: number | null;
  city: string | null;
  occupation: string | null;
  phone: string | null;
  email: string | null;
  status: ClientStatus;
  portalEnabled: boolean;
  profile: Required<ClientProfile>;
  coachNotes: string | null;
  /** Solo al dar de alta: el pago (completo o abono) que hizo ese mismo día. */
  firstPayment?: { amount: number | null; method: string | null } | null;
}

const LISTS = {
  planTypes: ['Mensual', 'Trimestral', 'Semestral', 'Anual', 'Personalizado'],
  paymentMethods: PAYMENT_METHODS,
  trainingPlaces: ['Gym comercial', 'Gym privado', 'Casa', 'Mixto'],
  levels: ['Principiante', 'Intermedio', 'Avanzado'],
  workActivity: ['Sedentaria', 'Ligera', 'Activa', 'Muy activa'],
  medicalClearance: ['No requiere', 'Sí', 'Pendiente'],
};

/** Meses que cubre cada plan; el personalizado y el indefinido sugieren un mes. */
const PLAN_MONTHS: Record<string, number> = { Mensual: 1, Trimestral: 3, Semestral: 6, Anual: 12 };

function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function emptyValue(): ClientFormValue {
  return {
    fullName: '',
    birthDate: null,
    sex: null,
    heightCm: null,
    initialWeightKg: null,
    city: null,
    occupation: null,
    phone: null,
    email: null,
    status: 'active',
    portalEnabled: true,
    profile: { health: {}, logistics: {}, lifestyle: {}, experience: {}, nutrition: {} },
    coachNotes: null,
  };
}

/** Historia clínica del cliente: los mismos apartados de la plantilla, con la edad calculada. */
@Component({
  selector: 'app-client-profile-form',
  imports: [FormsModule, Btn, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './client-profile-form.html',
  styles: `
    form { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
    .form-section__title { color: var(--tone-ink); }
    .card--vivid .form-section__title { color: var(--color-text-inverse); }
    .grid--2 { align-items: start; }
    .actions { position: sticky; bottom: var(--space-3); z-index: 2; display: flex; align-items: center; justify-content: flex-end; gap: var(--space-3); padding: var(--space-3) var(--space-4); border-radius: var(--radius-pill); background: color-mix(in srgb, var(--color-surface) 92%, transparent); box-shadow: var(--shadow-md); backdrop-filter: blur(8px); }
  `,
})
export class ClientProfileForm {
  readonly client = input<Client | null>(null);
  readonly saving = input(false);
  readonly submitLabel = input('Guardar expediente');
  /** Errores por campo devueltos por la API. */
  readonly errors = input<Record<string, string>>({});
  readonly save = output<ClientFormValue>();

  protected readonly lists = LISTS;
  protected readonly value = signal<ClientFormValue>(emptyValue());
  protected readonly touched = signal(false);
  protected readonly date = formatDate;
  protected readonly num = toNumber;

  /** Alta de cliente: aquí se acuerda el pago; después se maneja en la pestaña Pagos. */
  protected readonly isNew = computed(() => !this.client());
  protected readonly payToday = signal(false);
  protected readonly payAmount = signal<number | null>(null);
  protected readonly payMethod = signal<string | null>(null);

  private readonly fee = computed(() => this.value().profile.logistics.fee ?? null);
  /** Lo que paga hoy: por defecto, todo lo acordado. */
  protected readonly paidNow = computed(() => (this.payToday() ? (this.payAmount() ?? this.fee()) : null));
  protected readonly partial = computed(() => this.fee() !== null && this.paidNow() !== null && this.paidNow()! < this.fee()!);
  /** Con pago hoy: el resto se propone a fin de mes; si pagó todo, el siguiente periodo según su plan. */
  protected readonly suggestedDate = computed(() => {
    if (!this.payToday()) return null;
    const today = localToday();
    if (!this.partial()) return addMonths(today, PLAN_MONTHS[this.value().profile.logistics.planType ?? ''] ?? 1);
    const [year = 0, month = 1] = today.split('-').map(Number);
    return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  });
  private readonly payDate = computed(() => this.value().profile.logistics.paymentDate || this.suggestedDate());
  protected readonly paySummary = computed(() => {
    const fee = this.fee();
    const paid = this.paidNow();
    const when = this.payDate();
    if (paid === null) return fee !== null && when ? `Le toca pagar ${formatMoney(fee)} el ${formatDate(when)}.` : null;
    if (this.partial()) return `Paga ${formatMoney(paid)} hoy y quedan ${formatMoney(fee! - paid)} para el ${formatDate(when)}.`;
    return `Paga ${formatMoney(paid)} hoy. Su siguiente pago${fee !== null ? ` (${formatMoney(fee)})` : ''} será el ${formatDate(when)}.`;
  });

  protected readonly age = computed(() => {
    const birth = this.value().birthDate;
    if (!birth) return null;
    const [year, month, day] = birth.split('-').map(Number) as [number, number, number];
    const now = new Date();
    return now.getFullYear() - year - (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day) ? 1 : 0);
  });

  constructor() {
    effect(() => {
      const client = this.client();
      if (!client) return;
      const base = emptyValue();
      this.value.set({
        fullName: client.fullName,
        birthDate: client.birthDate,
        sex: client.sex,
        heightCm: client.heightCm,
        initialWeightKg: client.initialWeightKg,
        city: client.city,
        occupation: client.occupation,
        phone: client.phone,
        email: client.email,
        status: client.status ?? 'active',
        portalEnabled: client.portalEnabled ?? true,
        coachNotes: client.coachNotes ?? null,
        // Copia profunda: el formulario no debe mutar los datos del expediente cargado.
        profile: { ...base.profile, ...structuredClone(client.profile) },
      });
    });
  }

  /** Los campos escriben directo en el borrador; esto avisa a lo calculado (la edad). */
  protected refresh(): void {
    this.value.update((value) => ({ ...value }));
  }

  protected submit(): void {
    this.touched.set(true);
    if (!this.value().fullName.trim()) return;
    const value = structuredClone(this.value());
    if (this.isNew() && this.payToday()) {
      if (this.paidNow() === null) return;
      value.profile.logistics.paymentDate = this.payDate();
      value.firstPayment = { amount: this.paidNow(), method: this.payMethod() };
    }
    this.save.emit(value);
  }
}
