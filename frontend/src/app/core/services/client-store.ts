import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';
import { API_URL } from '../config/api.config';
import { ClientOverview } from '../types/client.model';
import { ApiError } from '../types/common.model';
import { NutritionDraft, NutritionView } from '../types/nutrition.model';
import { LoggedSet, PrescriptionRow, WeekExercise } from '../types/training.model';
import { ToastService } from './toast.service';

/**
 * Datos de un cliente y las acciones sobre ellos. Lo proveen dos pantallas:
 * el expediente del coach (base `clients/:id`) y el portal del cliente (base `portal/:code`).
 * Los componentes compartidos (registro semanal, cuestionario, peso…) lo inyectan sin saber
 * cuál de los dos es; `isCoach` decide qué se puede editar.
 */
@Injectable()
export class ClientStore {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_URL);
  private readonly toast = inject(ToastService);

  private base = '';
  readonly isCoach = signal(false);
  readonly data = signal<ClientOverview | null>(null);
  readonly loading = signal(true);
  readonly error = signal<ApiError | null>(null);
  /** Peticiones de guardado en curso: alimenta el indicador "Guardando…". */
  readonly saving = signal(0);

  readonly client = computed(() => this.data()?.client ?? null);
  readonly training = computed(() => this.data()?.training ?? null);
  readonly nutrition = computed(() => this.data()?.nutrition ?? null);
  readonly tracking = computed(() => this.data()?.tracking ?? null);
  readonly today = computed(() => this.data()?.today ?? new Date().toISOString().slice(0, 10));

  init(base: string, isCoach: boolean): void {
    this.base = `${this.api}/${base}`;
    this.isCoach.set(isCoach);
    this.data.set(null);
    this.loading.set(true);
    this.reload();
  }

  reload(): void {
    this.http.get<ClientOverview>(this.base).subscribe({
      next: (data) => {
        this.data.set(data);
        this.error.set(null);
        this.loading.set(false);
      },
      error: (error: ApiError) => {
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }

  /** Ejecuta un guardado y vuelve a pedir los datos para refrescar todo lo calculado. */
  private mutate<T>(request: Observable<T>, successMessage?: string): Observable<T> {
    this.saving.update((n) => n + 1);
    return request.pipe(
      tap(() => {
        if (successMessage) this.toast.success(successMessage);
        this.reload();
      }),
      finalize(() => this.saving.update((n) => n - 1)),
    );
  }

  // ---- Cliente (solo coach) ----
  saveClient(body: unknown) {
    return this.mutate(this.http.put(this.base, body), 'Expediente guardado.');
  }

  deleteClient() {
    return this.http.delete<void>(this.base);
  }

  regenerateLink() {
    return this.mutate(this.http.post<{ portalUrl: string }>(`${this.base}/access-code`, {}), 'Enlace nuevo generado. El anterior ya no funciona.');
  }

  // ---- Entrenamiento ----
  saveTrainingPlan(body: unknown, message = 'Plan de entrenamiento guardado.') {
    return this.mutate(this.http.put(`${this.base}/training`, body), message);
  }

  addWeek() {
    return this.mutate(this.http.post<{ id: string; number: number }>(`${this.base}/training/weeks`, {}));
  }

  saveWeek(weekId: string, exercises: PrescriptionRow[]) {
    return this.mutate(this.http.put(`${this.base}/training/weeks/${weekId}`, { exercises }), 'Pauta de la semana guardada.');
  }

  deleteWeek(weekId: string) {
    return this.mutate(this.http.delete(`${this.base}/training/weeks/${weekId}`), 'Semana eliminada.');
  }

  logExercise(exerciseId: string, body: { logged?: LoggedSet[]; clientNotes?: string | null }) {
    return this.mutate(this.http.patch<WeekExercise>(`${this.base}/training/exercises/${exerciseId}/log`, body));
  }

  logWeek(weekId: string, body: { dayDates?: Record<number, string | null>; cardioLog?: Record<number, number | null> }) {
    return this.mutate(this.http.patch(`${this.base}/training/weeks/${weekId}/log`, body));
  }

  // ---- Nutrición ----
  saveNutrition(draft: NutritionDraft) {
    return this.mutate(this.http.put(`${this.base}/nutrition`, draft), 'Plan de nutrición guardado.');
  }

  previewNutrition(draft: NutritionDraft) {
    return this.http.post<NutritionView>(`${this.base}/nutrition/preview`, draft);
  }

  // ---- Seguimiento ----
  saveCheckin(weekNumber: number, body: unknown) {
    return this.mutate(this.http.put(`${this.base}/checkins/${weekNumber}`, body), 'Cuestionario guardado.');
  }

  saveWeight(date: string, body: { weightKg: number | null; waistCm?: number | null }) {
    return this.mutate(this.http.put(`${this.base}/weights/${date}`, body));
  }

  saveMeasurement(date: string, body: unknown) {
    return this.mutate(this.http.put(`${this.base}/measurements/${date}`, body), 'Medición guardada.');
  }

  deleteMeasurement(date: string) {
    return this.mutate(this.http.delete(`${this.base}/measurements/${date}`), 'Medición eliminada.');
  }
}
