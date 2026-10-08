import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Btn } from '../../../components/buttons/btn';
import { Icon } from '../../../components/icon/icon';
import { SkeletonTable } from '../../../components/skeletons/skeleton-table';
import { ExerciseFigure } from '../../../components/visual/exercise-figure';
import { FIGURE_GROUPS } from '../../../components/visual/exercise-figures';
import { chosenFigure, resolveFigure } from '../../../components/visual/figure-resolve';
import { PanelApi } from '../../../core/services/api/panel-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { Exercise, Muscle } from '../../../core/types/catalog.model';
import { ApiError } from '../../../core/types/common.model';
import { MOVEMENT_LABELS, MUSCLE_REGIONS, exerciseEquipment, movementPattern, muscleRegion, muscleRegionKey, muscleTone } from '../../../core/utils/visuals';
import { ConfirmService } from '../shared/confirm.service';
import { PageHeader } from '../shared/page-header';
import { CatalogPage } from './catalog-page';

interface ExerciseDraft {
  id?: number;
  muscleId: number;
  name: string;
  /** Clave del dibujo elegido; null = automático (sale del nombre). */
  movement: string | null;
  description: string;
}

/**
 * Base de ejercicios: un músculo por tarjeta (con el color de su zona) y sus ejercicios, cada
 * uno con su dibujo animado. Alimenta los desplegables de las semanas.
 */
@Component({
  selector: 'app-exercises-admin',
  imports: [FormsModule, PageHeader, Btn, Icon, SkeletonTable, ExerciseFigure],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exercises-admin.html',
  styleUrl: './exercises-admin.css',
})
export class ExercisesAdmin extends CatalogPage {
  private readonly panelApi = inject(PanelApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly regions = MUSCLE_REGIONS;
  protected readonly figureGroups = FIGURE_GROUPS;
  protected readonly tone = muscleTone;
  protected readonly region = muscleRegion;
  protected readonly regionKey = muscleRegionKey;

  protected readonly search = signal('');
  protected readonly newMuscle = signal({ name: '', region: 'push' });
  protected readonly editing = signal<ExerciseDraft | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Grupo de dibujos abierto en el selector. */
  protected readonly pickerGroup = signal(FIGURE_GROUPS[0]!.group);

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
  /** Dibujo que se verá: el elegido o el que corresponde al nombre. */
  protected readonly previewFigure = computed(() => {
    const draft = this.editing();
    return draft ? resolveFigure(draft.name, this.editingMuscle()?.name ?? '', draft.movement) : null;
  });
  protected readonly pickerItems = computed(() => FIGURE_GROUPS.find((group) => group.group === this.pickerGroup())?.items ?? []);

  protected meta(exercise: Exercise, muscle: Muscle): string {
    const pattern = movementPattern(exercise.name, muscle.name);
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
    this.open({ muscleId: muscle.id, name: '', movement: null, description: '' }, muscle);
  }

  protected editExercise(exercise: Exercise, muscle: Muscle): void {
    // Lo guardado antes como "tipo de movimiento" se convierte al dibujo equivalente.
    this.open({ id: exercise.id, muscleId: muscle.id, name: exercise.name, movement: chosenFigure(exercise.movement)?.key ?? null, description: exercise.description ?? '' }, muscle);
  }

  private open(draft: ExerciseDraft, muscle: Muscle): void {
    this.error.set(null);
    this.editing.set(draft);
    // El selector abre en el grupo del dibujo actual.
    this.pickerGroup.set(resolveFigure(draft.name, muscle.name, draft.movement).group);
    // El formulario aparece arriba de las tarjetas: se lleva a la vista tras dibujarse.
    setTimeout(() => document.getElementById('exercise-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
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
}
