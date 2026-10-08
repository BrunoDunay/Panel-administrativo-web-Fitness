import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Btn } from '../../../components/buttons/btn';
import { Icon } from '../../../components/icon/icon';
import { SkeletonTable } from '../../../components/skeletons/skeleton-table';
import { PanelApi } from '../../../core/services/api/panel-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { Exercise, Muscle } from '../../../core/types/catalog.model';
import { ConfirmService } from '../shared/confirm.service';
import { PageHeader } from '../shared/page-header';
import { CatalogPage } from './catalog-page';

/** Base de ejercicios: un músculo por tarjeta y sus ejercicios debajo. Alimenta los desplegables de las semanas. */
@Component({
  selector: 'app-exercises-admin',
  imports: [PageHeader, Btn, Icon, SkeletonTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Ejercicios" [subtitle]="summary()" />

    <div class="toolbar">
      <label class="search">
        <app-icon name="search" [size]="18" />
        <span class="visually-hidden">Buscar ejercicio</span>
        <input type="search" placeholder="Buscar ejercicio" [value]="search()" (input)="search.set($any($event.target).value)" />
      </label>
      <form class="new-muscle" (submit)="addMuscle(muscleInput); $event.preventDefault()">
        <label class="visually-hidden" for="new-muscle">Músculo nuevo</label>
        <input #muscleInput id="new-muscle" class="cell-input" placeholder="Músculo nuevo" maxlength="80" />
        <button appBtn type="submit" variant="soft"><app-icon name="plus" [size]="16" />Agregar músculo</button>
      </form>
    </div>

    @if (catalog()) {
      <div class="muscles">
        @for (muscle of muscles(); track muscle.id) {
          <section class="card muscle">
            <header class="card__head">
              <h2 class="card__title">{{ muscle.name }}</h2>
              <div class="row">
                <span class="badge">{{ muscle.exercises.length }}</span>
                <button type="button" class="icon-btn" (click)="removeMuscle(muscle)" [attr.aria-label]="'Eliminar el músculo ' + muscle.name"><app-icon name="trash" [size]="16" /></button>
              </div>
            </header>
            <ul>
              @for (exercise of muscle.exercises; track exercise.id) {
                <li>
                  <span>{{ exercise.name }}</span>
                  <button type="button" class="icon-btn" (click)="removeExercise(exercise)" [attr.aria-label]="'Eliminar ' + exercise.name"><app-icon name="close" [size]="14" /></button>
                </li>
              }
            </ul>
            <form class="add" (submit)="addExercise(muscle, input); $event.preventDefault()">
              <label class="visually-hidden" [attr.for]="'new-' + muscle.id">Ejercicio nuevo de {{ muscle.name }}</label>
              <input #input class="cell-input" [id]="'new-' + muscle.id" placeholder="Ejercicio nuevo" maxlength="160" />
              <button appBtn type="submit" variant="soft" size="sm">Agregar</button>
            </form>
          </section>
        } @empty {
          <div class="card empty"><h3>Sin resultados</h3><p>Ningún ejercicio coincide con la búsqueda.</p></div>
        }
      </div>
    } @else {
      <div class="card"><app-skeleton-table /></div>
    }
  `,
  styles: `
    .toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3); margin-block: var(--space-5) var(--space-4); }
    .search { display: flex; align-items: center; gap: var(--space-2); flex: 1; max-width: 360px; min-height: 2.75rem; padding: 0 var(--space-4); border-radius: var(--radius-pill); background: var(--color-surface); box-shadow: var(--shadow-sm); color: var(--color-text-muted); }
    .search input { flex: 1; min-width: 0; border: 0; background: none; font-size: 1rem; color: var(--color-text); }
    .search input:focus { outline: none; }
    .search:focus-within { box-shadow: 0 0 0 3px var(--color-primary-soft); }
    .new-muscle, .add { display: flex; gap: var(--space-2); }
    .new-muscle input { width: 12rem; }
    .muscles { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); gap: var(--space-4); align-items: start; }
    .muscle ul { display: grid; margin-bottom: var(--space-3); list-style: none; }
    .muscle li { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); padding: 0.2rem 0; border-bottom: var(--hairline); font-size: var(--text-sm); }
    .icon-btn { display: inline-grid; place-items: center; flex: none; width: 2rem; height: 2rem; border: 0; border-radius: 50%; background: transparent; color: var(--color-text-muted); }
    @media (hover: hover) and (pointer: fine) { .icon-btn:hover { background: var(--color-danger-soft); color: var(--color-danger); } }
  `,
})
export class ExercisesAdmin extends CatalogPage {
  private readonly panelApi = inject(PanelApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly search = signal('');

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

  protected addMuscle(input: HTMLInputElement): void {
    const name = input.value.trim();
    if (!name) return;
    this.panelApi.createCatalogItem('muscles', { name }).subscribe(() => {
      input.value = '';
      this.toast.success(`Músculo "${name}" agregado.`);
      this.reload();
    });
  }

  protected addExercise(muscle: Muscle, input: HTMLInputElement): void {
    const name = input.value.trim();
    if (!name) return;
    this.panelApi.createCatalogItem('exercises', { muscleId: muscle.id, name }).subscribe(() => {
      input.value = '';
      this.reload();
    });
  }

  protected removeExercise(exercise: Exercise): void {
    this.panelApi.deleteCatalogItem('exercises', exercise.id).subscribe(() => {
      this.toast.info(`"${exercise.name}" eliminado del catálogo. Las semanas que ya lo usan no cambian.`);
      this.reload();
    });
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
}
