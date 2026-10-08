import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Btn } from '../../../components/buttons/btn';
import { Client, ClientProfile, ClientStatus } from '../../../core/types/client.model';

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
}

const LISTS = {
  planTypes: ['Mensual', 'Trimestral', 'Semestral', 'Anual'],
  trainingPlaces: ['Gym comercial', 'Gym privado', 'Casa', 'Mixto'],
  levels: ['Principiante', 'Intermedio', 'Avanzado'],
  workActivity: ['Sedentaria', 'Ligera', 'Activa', 'Muy activa'],
  medicalClearance: ['No requiere', 'Sí', 'Pendiente'],
};

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
  imports: [FormsModule, Btn],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './client-profile-form.html',
  styles: `
    form { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
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
    this.save.emit(structuredClone(this.value()));
  }
}
