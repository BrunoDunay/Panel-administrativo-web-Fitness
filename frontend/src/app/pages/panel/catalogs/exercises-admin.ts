import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Btn } from '../../../components/buttons/btn';
import { Icon } from '../../../components/icon/icon';
import { SkeletonTable } from '../../../components/skeletons/skeleton-table';
import { MovementFigure } from '../../../components/visual/movement-figure';
import { PanelApi } from '../../../core/services/api/panel-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { Exercise, Muscle } from '../../../core/types/catalog.model';
import { ApiError } from '../../../core/types/common.model';
import { MOVEMENT_LABELS, MOVEMENT_PATTERNS, MUSCLE_REGIONS, MovementPattern, exerciseEquipment, movementPattern, muscleRegion, muscleRegionKey, muscleTone } from '../../../core/utils/visuals';
import { ConfirmService } from '../shared/confirm.service';
import { PageHeader } from '../shared/page-header';
import { CatalogPage } from './catalog-page';

interface ExerciseDraft {
  id?: number;
  muscleId: number;
  name: string;
  /** null = automático (se deduce del nombre). */
  movement: MovementPattern | null;
  description: string;
}

/**
 * Base de ejercicios: un músculo por tarjeta (con el color de su zona) y sus ejercicios, cada
 * uno con un dibujo animado del movimiento. Alimenta los desplegables de las semanas.
 */
@Component({
  selector: 'app-exercises-admin',
  imports: [FormsModule, PageHeader, Btn, Icon, SkeletonTable, MovementFigure],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exercises-admin.html',
  styleUrl: './exercises-admin.css',
})
export class ExercisesAdmin extends CatalogPage {
  private readonly panelApi = inject(PanelApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly regions = MUSCLE_REGIONS;
  protected readonly patterns = MOVEMENT_PATTERNS;
  protected readonly labels = MOVEMENT_LABELS;
  protected readonly tone = muscleTone;
  protected readonly region = muscleRegion;
  protected readonly regionKey = muscleRegionKey;
  protected readonly pattern = movementPattern;

  protected readonly search = signal('');
  protected readonly newMuscle = signal({ name: '', region: 'push' });
  protected readonly editing = signal<ExerciseDraft | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly summary = computed(() => {
    const muscles = this.catalog()?.muscles ?? [];
    return `${muscles.reduce((sum, muscle) => sum + muscle.exercises.length, 0)} ejercicios en ${muscles.length} músculos. Alimentan los desplegables de las semanas y las prioridades.`;
  });

  protected readonly muscles = computed(() => {
    const term = this.search().trim().toLowerCase();
    const muscles = this.catalog()?.muscles ?? [];
    if (!term) return muscles;
    return muscles
      .map((muscle) => ({ ...muscle, exercises: muscle.name.toLowerCase().includes(term) ? muscle.exercises : muscle.exercises.filter((exercise) => exercise.name.toLowerCase().includes(term)) }))
      .filter((muscle) => muscle.exercises.length);
  });

  /** Músculo del ejercicio que se está editando (define el color de la vista previa). */
  protected readonly editingMuscle = computed(() => this.catalog()?.muscles.find((muscle) => muscle.id === this.editing()?.muscleId) ?? null);
  /** Movimiento que se verá: el elegido o el que se deduce del nombre. */
  protected readonly previewPattern = computed(() => {
    const draft = this.editing();
    return draft ? movementPattern(draft.name, this.editingMuscle()?.name ?? '', draft.movement) : null;
  });

  protected meta(exercise: Exercise, muscle: Muscle): string {
    const pattern = movementPattern(exercise.name, muscle.name, exercise.movement);
    return [pattern ? MOVEMENT_LABELS[pattern] : null, exerciseEquipment(exercise.name)].filter(Boolean).join(' · ');
  }

  // ---- Músculos

  protected patchNewMuscle(changes: Partial<{ name: string; region: string }>): void {
    this.newMuscle.update((value) => ({ ...value, ...changes }));
  }

  protected addMuscle(): void {
    const { name, region } = this.newMuscle();
    if (!name.trim()) return;
    this.panelApi.createCatalogItem('muscles', { name: name.trim(), region }).subscribe(() => {
      this.toast.success(`Músculo "${name.trim()}" agregado.`);
      this.newMuscle.set({ name: '', region });
      this.reload();
    });
  }

  protected setRegion(muscle: Muscle, region: string): void {
    this.panelApi.updateCatalogItem('muscles', muscle.id, { name: muscle.name, region }).subscribe(() => this.reload());
  }

  protected async removeMuscle(muscle: Muscle): Promise<void> {
    const ok = await this.confirm.ask({
      title: `¿Eliminar el músculo "${muscle.name}"?`,
      message: `Se eliminarán también sus ${muscle.exercises.length} ejercicios del catálogo. Las semanas ya pautadas no cambian.`,
      confirmLabel: 'Eliminar músculo',
      danger: true,
    });
    if (ok) this.panelApi.deleteCatalogItem('muscles', muscle.id).subscribe(() => this.reload());
  }

  // ---- Ejercicios

  protected startExercise(muscle: Muscle): void {
    this.error.set(null);
    this.editing.set({ muscleId: muscle.id, name: '', movement: null, description: '' });
    this.scrollToEditor();
  }

  protected editExercise(exercise: Exercise, muscle: Muscle): void {
    this.error.set(null);
    this.editing.set({
      id: exercise.id,
      muscleId: muscle.id,
      name: exercise.name,
      movement: exercise.movement && exercise.movement in MOVEMENT_LABELS ? (exercise.movement as MovementPattern) : null,
      description: exercise.description ?? '',
    });
    this.scrollToEditor();
  }

  protected patch(changes: Partial<ExerciseDraft>): void {
    this.editing.update((draft) => (draft ? { ...draft, ...changes } : draft));
  }

  protected saveExercise(): void {
    const draft = this.editing();
    if (!draft) return;
    if (!draft.name.trim()) {
      this.error.set('Escribe el nombre del ejercicio.');
      return;
    }
    const body = { muscleId: draft.muscleId, name: draft.name.trim(), movement: draft.movement, description: draft.description.trim() || null };
    this.saving.set(true);
    const request = draft.id ? this.panelApi.updateCatalogItem('exercises', draft.id, body) : this.panelApi.createCatalogItem('exercises', body);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(null);
        this.toast.success('Ejercicio guardado.');
        this.reload();
      },
      error: (error: ApiError) => {
        this.saving.set(false);
        this.error.set(error.fields?.['name'] ?? error.message);
      },
    });
  }

  protected async removeExercise(exercise: Exercise): Promise<void> {
    const ok = await this.confirm.ask({
      title: `¿Eliminar "${exercise.name}"?`,
      message: 'Dejará de aparecer en los desplegables. Las semanas que ya lo usan no cambian.',
      confirmLabel: 'Eliminar ejercicio',
      danger: true,
    });
    if (ok) this.panelApi.deleteCatalogItem('exercises', exercise.id).subscribe(() => this.reload());
  }

  private scrollToEditor(): void {
    // El formulario aparece arriba de la cuadrícula: se lleva a la vista tras dibujarse.
    setTimeout(() => document.getElementById('exercise-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
}
