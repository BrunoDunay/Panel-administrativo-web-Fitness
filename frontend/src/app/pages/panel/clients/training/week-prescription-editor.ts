import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { switchMap } from 'rxjs';
import { Btn } from '../../../../components/buttons/btn';
import { Icon } from '../../../../components/icon/icon';
import { ExerciseFigure } from '../../../../components/visual/exercise-figure';
import { ClientStore } from '../../../../core/services/client-store';
import { Catalog } from '../../../../core/types/catalog.model';
import { PrescriptionRow, REST, TrainingWeek, WEEK_DAYS } from '../../../../core/types/training.model';
import { SESSION_NAMES, muscleTone, sessionTone } from '../../../../core/utils/visuals';

/** Nombre que recibe un día con ejercicios al que no se le puso nombre de sesión. */
const UNNAMED = 'Entrenamiento';

/**
 * Pauta del coach para una semana. Muestra los 7 días: en cualquiera se pueden agregar
 * ejercicios (aunque el split diga "Descanso") y nombrar la sesión ahí mismo.
 */
@Component({
  selector: 'app-week-prescription-editor',
  imports: [FormsModule, Btn, Icon, ExerciseFigure],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="strip" aria-label="Días de la semana">
      @for (day of days(); track day.day) {
        <button type="button" [class]="'strip__day tone--' + day.tone" [class.is-rest]="!day.active" (click)="goTo(day.day)">
          <span class="strip__short">{{ day.short }}</span>
          <b>{{ day.active ? day.session || 'Sin nombre' : 'Descanso' }}</b>
          <small>{{ day.active ? day.sets + ' series' : '—' }}</small>
        </button>
      }
    </nav>

    @if (!trainingDays()) {
      <p class="notice">
        <app-icon name="info" [size]="18" />
        <span>Esta semana está vacía. Elige un día, ponle nombre a la sesión (<b>Torso</b>, <b>Pierna</b>…) y agrega sus ejercicios.</span>
      </p>
    }

    @for (day of days(); track day.day) {
      @if (day.active) {
        <section [id]="'day-' + day.day" [class]="'card day tone--' + day.tone">
          <header class="day__head icon-hover">
            <span class="day__badge">{{ day.short }}</span>
            <label class="day__name">
              <span class="day__eyebrow">Día {{ day.day }} · {{ day.name }}</span>
              <input class="day__input" list="week-sessions" maxlength="40" placeholder="Nombre de la sesión" [value]="day.session" (change)="rename(day.day, $any($event.target).value)" [attr.aria-label]="'Nombre de la sesión del ' + day.name" />
            </label>
            <span class="badge badge--tone">{{ day.rows.length }} ejercicio(s) · {{ day.sets }} series</span>
          </header>

          @if (day.rows.length) {
            <ol class="rows">
              @for (row of day.rows; track row; let i = $index) {
                <li [class]="'ex icon-hover tone--' + tone(row.muscle)">
                  <span class="thumb ex__figure">
                    @if (row.exercise) {
                      <app-exercise-figure [exercise]="row.exercise" [muscle]="row.muscle" [figure]="drawings().get(row.exercise)" [size]="56" [intro]="false" />
                    } @else {
                      <b>{{ i + 1 }}</b>
                    }
                  </span>

                  <div class="ex__main">
                    <label class="mini">
                      <span>Músculo</span>
                      <select class="cell-input" [(ngModel)]="row.muscle" (ngModelChange)="onMuscle(row)">
                        <option value="" disabled>Elige</option>
                        @for (muscle of catalog().muscles; track muscle.id) { <option [value]="muscle.name">{{ muscle.name }}</option> }
                      </select>
                    </label>
                    <label class="mini">
                      <span>Ejercicio</span>
                      <select class="cell-input" [(ngModel)]="row.exercise" (ngModelChange)="refresh()" [disabled]="!row.muscle">
                        <option value="" disabled>{{ row.muscle ? 'Elige el ejercicio' : 'Primero el músculo' }}</option>
                        @for (exercise of exercisesOf(row); track exercise) { <option [value]="exercise">{{ exercise }}</option> }
                      </select>
                    </label>
                  </div>

                  <div class="ex__nums">
                    <label class="mini"><span>Series</span><input class="cell-input cell-input--num" type="number" inputmode="numeric" min="1" max="10" [(ngModel)]="row.sets" (ngModelChange)="refresh()" /></label>
                    <label class="mini"><span>Reps</span><input class="cell-input" [(ngModel)]="row.reps" placeholder="8 a 10" maxlength="30" /></label>
                    <label class="mini">
                      <span>RIR</span>
                      <select class="cell-input" [(ngModel)]="row.rir">
                        <option [ngValue]="null">—</option>
                        @for (n of [0, 1, 2, 3, 4, 5]; track n) { <option [ngValue]="n">{{ n }}</option> }
                      </select>
                    </label>
                    <label class="mini">
                      <span>Símbolo</span>
                      <select class="cell-input" [(ngModel)]="row.symbol">
                        <option [ngValue]="null">—</option>
                        @for (item of catalog().lists.symbols; track item.symbol) { <option [value]="item.symbol" [title]="item.hint">{{ item.symbol }} {{ item.label }}</option> }
                      </select>
                    </label>
                  </div>

                  <label class="ex__notes">
                    <span class="visually-hidden">Notas del coach para el ejercicio {{ i + 1 }}</span>
                    <input class="cell-input" [(ngModel)]="row.coachNotes" maxlength="500" placeholder="Notas del coach: técnica, tempo, qué cuidar…" />
                  </label>

                  <div class="ex__actions">
                    <button type="button" class="icon-btn" [disabled]="i === 0" (click)="move(row, -1)" aria-label="Subir ejercicio"><app-icon name="arrowUp" [size]="16" /></button>
                    <button type="button" class="icon-btn" [disabled]="i === day.rows.length - 1" (click)="move(row, 1)" aria-label="Bajar ejercicio"><app-icon name="arrowDown" [size]="16" /></button>
                    <button type="button" class="icon-btn icon-btn--danger" (click)="remove(row)" aria-label="Quitar ejercicio"><app-icon name="trash" [size]="16" /></button>
                  </div>
                </li>
              }
            </ol>
          } @else {
            <p class="text-muted empty-day">Sin ejercicios todavía.</p>
          }

          <div class="row row--between">
            <button appBtn type="button" variant="soft" size="sm" (click)="add(day.day)"><app-icon name="plus" [size]="16" />Agregar ejercicio</button>
            @if (!day.rows.length) {
              <button appBtn type="button" variant="ghost" size="sm" (click)="rest(day.day)">Dejar como descanso</button>
            }
          </div>
        </section>
      } @else {
        <section [id]="'day-' + day.day" class="rest">
          <span class="day__badge day__badge--rest">{{ day.short }}</span>
          <p><b>{{ day.name }}</b> · Descanso</p>
          <button appBtn type="button" variant="soft" size="sm" (click)="add(day.day)"><app-icon name="plus" [size]="16" />Agregar ejercicios</button>
        </section>
      }
    }

    <datalist id="week-sessions">
      @for (session of sessions; track session) { <option [value]="session"></option> }
    </datalist>

    <div class="actions">
      @if (incomplete()) {
        <span class="badge badge--warning">Hay filas sin músculo o ejercicio: no se guardarán</span>
      }
      <button appBtn type="button" size="lg" [loading]="saving()" [disabled]="saving()" (click)="save()"><app-icon name="check" [size]="18" />Guardar pauta de la semana {{ week().number }}</button>
    </div>
  `,
  styles: `
    :host { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }

    /* La semana de un vistazo. */
    .strip { display: grid; grid-template-columns: repeat(7, minmax(6.2rem, 1fr)); gap: var(--space-2); overflow-x: auto; padding-bottom: 2px; }
    .strip__day { display: grid; gap: 1px; padding: var(--space-2) var(--space-3); border: 0; border-radius: var(--radius-md); background: var(--tone-soft); text-align: left; line-height: 1.25; color: var(--tone-ink); transition: transform 140ms var(--ease-out); }
    .strip__day:active { transform: scale(0.97); }
    .strip__day b { overflow: hidden; font-size: var(--text-sm); text-overflow: ellipsis; white-space: nowrap; color: var(--color-text); }
    .strip__day small { font-size: var(--text-xs); }
    .strip__short { font-size: 0.68rem; font-weight: 700; letter-spacing: var(--tracking-wider); }
    .strip__day.is-rest { background: transparent; box-shadow: inset 0 0 0 1px var(--color-border-strong); color: var(--color-text-muted); }
    .strip__day.is-rest b { font-weight: 600; color: var(--color-text-muted); }

    .day { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); border-top: 4px solid var(--tone); scroll-margin-top: var(--space-4); }
    .day__head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
    .day__badge { display: grid; place-items: center; flex: none; width: 3.25rem; height: 3.25rem; border-radius: var(--radius-md); background: var(--tone-gradient); font-size: var(--text-sm); font-weight: 700; letter-spacing: var(--tracking-wide); color: var(--color-text-inverse); box-shadow: 0 8px 16px -8px var(--tone); }
    .day__badge--rest { background: var(--color-surface-alt); color: var(--color-text-muted); box-shadow: none; }
    .day__name { display: grid; flex: 1; min-width: min(100%, 12rem); }
    .day__eyebrow { font-size: var(--text-xs); font-weight: 700; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--tone-ink); }
    .day__input { width: 100%; padding: 0.1rem 0.4rem; margin-left: -0.4rem; border: 1px solid transparent; border-radius: var(--radius-sm); background: transparent; font-size: var(--text-xl); font-weight: 700; text-transform: uppercase; letter-spacing: -0.01em; }
    .day__input::placeholder { font-weight: 600; text-transform: none; color: var(--color-text-muted); }
    .day__input:focus { outline: none; border-color: var(--tone); background: var(--color-surface); box-shadow: 0 0 0 3px var(--tone-soft); }

    .rows { display: grid; gap: var(--space-2); list-style: none; }
    .ex { display: grid; grid-template-columns: auto minmax(0, 1.5fr) minmax(0, 1.25fr) auto; grid-template-areas: 'fig main nums act' 'fig notes notes act'; align-items: end; gap: var(--space-2) var(--space-3); padding: var(--space-3); border-left: 4px solid var(--tone, var(--color-border-strong)); border-radius: var(--radius-md); background: var(--color-background); }
    .ex__figure { grid-area: fig; align-self: center; width: 4rem; height: 4rem; font-size: var(--text-lg); --figure-accent: var(--tone); --figure-surface: var(--tone-soft); }
    .ex__main { grid-area: main; display: grid; grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.5fr); gap: var(--space-2); }
    .ex__nums { grid-area: nums; display: grid; grid-template-columns: 0.8fr 1.2fr 0.8fr 1.2fr; gap: var(--space-2); }
    .ex__notes { grid-area: notes; }
    .ex__actions { grid-area: act; display: flex; align-self: center; }
    .mini { display: grid; gap: 2px; min-width: 0; }
    .mini > span { font-size: 0.68rem; font-weight: 700; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--color-text-muted); }
    .mini .cell-input { min-width: 0; }
    .empty-day { font-size: var(--text-sm); }

    .rest { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); border: 1px dashed var(--color-border-strong); border-radius: var(--radius-lg); scroll-margin-top: var(--space-4); }
    .rest p { flex: 1; font-size: var(--text-sm); color: var(--color-text-muted); }
    .rest .day__badge { width: 2.5rem; height: 2.5rem; font-size: var(--text-xs); }

    .icon-btn { display: inline-grid; place-items: center; width: 2rem; height: 2rem; border: 0; border-radius: 50%; background: transparent; color: var(--color-text-muted); }
    .icon-btn:disabled { opacity: 0.3; }
    .actions { position: sticky; bottom: var(--space-3); z-index: 2; display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: var(--space-3); }
    .actions button { box-shadow: var(--shadow-md); }
    .notice { align-items: center; }

    @media (hover: hover) and (pointer: fine) {
      .icon-btn:not(:disabled):hover { background: var(--color-surface-alt); color: var(--color-text); }
      .icon-btn--danger:hover { background: var(--color-danger-soft) !important; color: var(--color-danger) !important; }
    }
    @media (max-width: 1000px) {
      .ex { grid-template-columns: auto minmax(0, 1fr) auto; grid-template-areas: 'fig main act' 'nums nums nums' 'notes notes notes'; }
    }
    @media (max-width: 560px) {
      .ex__main { grid-template-columns: minmax(0, 1fr); }
      .ex__actions { flex-direction: column; }
    }
  `,
})
export class WeekPrescriptionEditor {
  private readonly store = inject(ClientStore);
  readonly week = input.required<TrainingWeek>();
  readonly catalog = input.required<Catalog>();

  protected readonly sessions = SESSION_NAMES;
  protected readonly tone = muscleTone;
  protected readonly rows = signal<PrescriptionRow[]>([]);
  /** Nombre de la sesión de cada día; se guarda en el split del plan. */
  protected readonly split = signal<string[]>(Array<string>(7).fill(REST));
  protected readonly saving = signal(false);

  /** Los 7 días. Un día está activo si tiene sesión en el split o ya tiene ejercicios. */
  protected readonly days = computed(() => {
    const rows = this.rows();
    return this.split().map((session, i) => {
      const day = i + 1;
      const own = rows.filter((row) => row.day === day);
      const named = session !== REST;
      return {
        day,
        name: WEEK_DAYS[i]!,
        short: WEEK_DAYS[i]!.slice(0, 3).toUpperCase(),
        session: named ? session : '',
        active: named || own.length > 0,
        rows: own,
        sets: own.reduce((sum, row) => sum + (Number(row.sets) || 0), 0),
        tone: named || own.length ? sessionTone(session) : 'slate',
      };
    });
  });
  protected readonly trainingDays = computed(() => this.days().filter((day) => day.active).length);
  protected readonly incomplete = computed(() => this.rows().some((row) => !row.muscle || !row.exercise));
  /** Dibujo elegido en el catálogo para cada ejercicio. */
  protected readonly drawings = computed(() => new Map(this.catalog().muscles.flatMap((muscle) => muscle.exercises.map((exercise) => [exercise.name, exercise.movement] as const))));

  constructor() {
    effect(() => {
      const week = this.week();
      this.split.set(week.days.map((day) => day.session || REST));
      this.rows.set(
        week.days.flatMap((day) => day.exercises.map(({ id, muscle, exercise, sets, reps, rir, coachNotes, symbol }) => ({ id, day: day.day, muscle, exercise, sets, reps, rir, coachNotes, symbol }))),
      );
    });
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

  protected goTo(day: number): void {
    document.getElementById(`day-${day}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected rename(day: number, value: string): void {
    this.split.update((split) => split.map((session, i) => (i === day - 1 ? value.trim() || UNNAMED : session)));
  }

  /** Un día sin ejercicios puede volver a ser de descanso. */
  protected rest(day: number): void {
    this.split.update((split) => split.map((session, i) => (i === day - 1 ? REST : session)));
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
    const complete = this.rows()
      .filter((row) => row.muscle && row.exercise)
      .map((row) => ({ ...row, sets: Math.min(10, Math.max(1, Math.round(Number(row.sets) || 1))) }));
    // Un día con ejercicios deja de ser descanso aunque no se le haya puesto nombre.
    const used = new Set(complete.map((row) => row.day));
    const split = this.split().map((session, i) => (session === REST && used.has(i + 1) ? UNNAMED : session));
    const splitChanged = split.some((session, i) => session !== (this.week().days[i]?.session || REST));

    const week = this.week().id;
    const saveWeek = this.store.saveWeek(week, complete);
    this.saving.set(true);
    // El nombre de las sesiones vive en el plan (aplica a todas las semanas): se guarda primero.
    (splitChanged ? this.store.saveTrainingPlan({ split }, '').pipe(switchMap(() => saveWeek)) : saveWeek).subscribe({ next: () => this.saving.set(false), error: () => this.saving.set(false) });
  }
}
