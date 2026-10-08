import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Btn } from '../../../../components/buttons/btn';
import { Icon } from '../../../../components/icon/icon';
import { ClientStore } from '../../../../core/services/client-store';
import { Catalog } from '../../../../core/types/catalog.model';
import { PrescriptionRow, REST, TrainingWeek, WEEK_DAYS } from '../../../../core/types/training.model';

/** Pauta del coach para una semana: músculo → ejercicio, series, reps, RIR, notas y símbolo. */
@Component({
  selector: 'app-week-prescription-editor',
  imports: [FormsModule, Btn, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (day of days(); track day.day) {
      <section class="card">
        <header class="card__head">
          <div>
            <p class="eyebrow">Día {{ day.day }} · {{ day.name }}</p>
            <h3 class="card__title session">{{ day.session }}</h3>
          </div>
          <span class="badge">{{ setsOf(day.day) }} series</span>
        </header>

        @if (rowsOf(day.day).length) {
          <div class="table-wrap">
            <table class="table table--compact">
              <thead>
                <tr><th>#</th><th>Músculo</th><th>Ejercicio</th><th>Series</th><th>Reps</th><th>RIR</th><th>Notas del coach</th><th>Simb.</th><th></th></tr>
              </thead>
              <tbody>
                @for (row of rowsOf(day.day); track row; let i = $index) {
                  <tr>
                    <td>{{ i + 1 }}</td>
                    <td>
                      <select class="cell-input muscle" [(ngModel)]="row.muscle" (ngModelChange)="onMuscle(row)" [attr.aria-label]="'Músculo del ejercicio ' + (i + 1)">
                        <option value="" disabled>Músculo</option>
                        @for (muscle of catalog().muscles; track muscle.id) { <option [value]="muscle.name">{{ muscle.name }}</option> }
                      </select>
                    </td>
                    <td>
                      <select class="cell-input exercise" [(ngModel)]="row.exercise" [disabled]="!row.muscle" [attr.aria-label]="'Ejercicio ' + (i + 1)">
                        <option value="" disabled>{{ row.muscle ? 'Ejercicio' : 'Elige el músculo' }}</option>
                        @for (exercise of exercisesOf(row); track exercise) { <option [value]="exercise">{{ exercise }}</option> }
                      </select>
                    </td>
                    <td><input class="cell-input cell-input--num narrow" type="number" inputmode="numeric" min="1" max="10" [(ngModel)]="row.sets" (ngModelChange)="refresh()" [attr.aria-label]="'Series del ejercicio ' + (i + 1)" /></td>
                    <td><input class="cell-input reps" [(ngModel)]="row.reps" placeholder="8 a 10" maxlength="30" [attr.aria-label]="'Repeticiones del ejercicio ' + (i + 1)" /></td>
                    <td>
                      <select class="cell-input narrow" [(ngModel)]="row.rir" [attr.aria-label]="'RIR del ejercicio ' + (i + 1)">
                        <option [ngValue]="null">—</option>
                        @for (n of [0, 1, 2, 3, 4, 5]; track n) { <option [ngValue]="n">{{ n }}</option> }
                      </select>
                    </td>
                    <td><input class="cell-input notes" [(ngModel)]="row.coachNotes" maxlength="500" [attr.aria-label]="'Notas del ejercicio ' + (i + 1)" /></td>
                    <td>
                      <select class="cell-input narrow" [(ngModel)]="row.symbol" [attr.aria-label]="'Símbolo del ejercicio ' + (i + 1)">
                        <option [ngValue]="null">—</option>
                        @for (item of catalog().lists.symbols; track item.symbol) { <option [value]="item.symbol" [title]="item.hint">{{ item.symbol }} {{ item.label }}</option> }
                      </select>
                    </td>
                    <td class="row-actions">
                      <button type="button" class="icon-btn" [disabled]="i === 0" (click)="move(row, -1)" aria-label="Subir"><app-icon name="chevronDown" [size]="16" class="flip" /></button>
                      <button type="button" class="icon-btn icon-btn--danger" (click)="remove(row)" aria-label="Quitar ejercicio"><app-icon name="trash" [size]="16" /></button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        <button appBtn type="button" variant="soft" size="sm" class="add" (click)="add(day.day)"><app-icon name="plus" [size]="16" />Agregar ejercicio</button>
      </section>
    }

    <div class="actions no-print">
      @if (incomplete()) {
        <span class="badge badge--warning">Hay filas sin músculo o ejercicio: no se guardarán</span>
      }
      <button appBtn type="button" size="lg" [loading]="saving()" [disabled]="saving()" (click)="save()">Guardar pauta de la semana {{ week().number }}</button>
    </div>
  `,
  styles: `
    :host { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
    .session { text-transform: uppercase; }
    .muscle { min-width: 9rem; }
    .exercise { min-width: 15rem; }
    .reps { min-width: 5.5rem; }
    .notes { min-width: 11rem; }
    .narrow { min-width: 4.2rem; }
    .add { margin-top: var(--space-3); }
    .row-actions { white-space: nowrap; }
    .icon-btn { display: inline-grid; place-items: center; width: 2rem; height: 2rem; border: 0; border-radius: 50%; background: transparent; color: var(--color-text-muted); }
    .icon-btn:disabled { opacity: 0.3; }
    .flip { rotate: 180deg; }
    .actions { position: sticky; bottom: var(--space-3); z-index: 2; display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: var(--space-3); }
    .actions button { box-shadow: var(--shadow-md); }
    @media (hover: hover) and (pointer: fine) {
      .icon-btn:not(:disabled):hover { background: var(--color-surface-alt); color: var(--color-text); }
      .icon-btn--danger:hover { background: var(--color-danger-soft) !important; color: var(--color-danger) !important; }
    }
  `,
})
export class WeekPrescriptionEditor {
  private readonly store = inject(ClientStore);
  readonly week = input.required<TrainingWeek>();
  readonly catalog = input.required<Catalog>();

  protected readonly rows = signal<PrescriptionRow[]>([]);
  protected readonly saving = signal(false);

  /** Días con sesión en el split, más cualquier día que ya tenga ejercicios. */
  protected readonly days = computed(() => {
    const used = new Set(this.rows().map((row) => row.day));
    return this.week().days.filter((day) => day.session !== REST || used.has(day.day)).map((day) => ({ day: day.day, name: WEEK_DAYS[day.day - 1], session: day.session }));
  });
  protected readonly incomplete = computed(() => this.rows().some((row) => !row.muscle || !row.exercise));

  constructor() {
    effect(() => {
      this.rows.set(
        this.week().days.flatMap((day) =>
          day.exercises.map(({ id, muscle, exercise, sets, reps, rir, coachNotes, symbol }) => ({ id, day: day.day, muscle, exercise, sets, reps, rir, coachNotes, symbol })),
        ),
      );
    });
  }

  protected rowsOf(day: number): PrescriptionRow[] {
    return this.rows().filter((row) => row.day === day);
  }

  protected setsOf(day: number): number {
    return this.rowsOf(day).reduce((sum, row) => sum + (Number(row.sets) || 0), 0);
  }

  /** Ejercicios del músculo elegido; conserva el actual aunque ya no esté en el catálogo. */
  protected exercisesOf(row: PrescriptionRow): string[] {
    const names = this.catalog().muscles.find((muscle) => muscle.name === row.muscle)?.exercises.map((exercise) => exercise.name) ?? [];
    return row.exercise && !names.includes(row.exercise) ? [row.exercise, ...names] : names;
  }

  protected refresh(): void {
    this.rows.update((rows) => [...rows]);
  }

  /** Al cambiar el músculo, el ejercicio anterior deja de ser válido. */
  protected onMuscle(row: PrescriptionRow): void {
    row.exercise = '';
    this.refresh();
  }

  protected add(day: number): void {
    this.rows.update((rows) => [...rows, { day, muscle: '', exercise: '', sets: 3, reps: null, rir: null, coachNotes: null, symbol: null }]);
  }

  protected remove(row: PrescriptionRow): void {
    this.rows.update((rows) => rows.filter((item) => item !== row));
  }

  protected move(row: PrescriptionRow, direction: -1 | 1): void {
    const rows = [...this.rows()];
    const sameDay = rows.filter((item) => item.day === row.day);
    const target = sameDay[sameDay.indexOf(row) + direction];
    if (!target) return;
    const a = rows.indexOf(row);
    const b = rows.indexOf(target);
    [rows[a], rows[b]] = [rows[b]!, rows[a]!];
    this.rows.set(rows);
  }

  protected save(): void {
    const complete = this.rows().filter((row) => row.muscle && row.exercise);
    this.saving.set(true);
    this.store
      .saveWeek(
        this.week().id,
        complete.map((row) => ({ ...row, sets: Math.min(10, Math.max(1, Math.round(Number(row.sets) || 1))) })),
      )
      .subscribe({ next: () => this.saving.set(false), error: () => this.saving.set(false) });
  }
}
