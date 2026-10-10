import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { SYMBOLS } from '../../core/config/tracking-lists';
import { ClientStore } from '../../core/services/client-store';
import { CardioDay, LoggedSet, REST, TrainingWeek, WarmupDay, WeekDay, WeekExercise, weekDayOf } from '../../core/types/training.model';
import { formatNumber, toNumber } from '../../core/utils/format';
import { exerciseEquipment, muscleTone } from '../../core/utils/visuals';
import { Icon } from '../icon/icon';
import { ExerciseFigure } from '../visual/exercise-figure';

/**
 * Hoja de la semana: la pauta del coach y el registro de carga y reps por serie.
 * La usan el cliente (portal) y el coach (expediente); cada cambio se guarda al salir del campo.
 */
@Component({
  selector: 'app-week-sheet',
  imports: [ExerciseFigure, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!hasTraining()) {
      <div class="card empty"><h3>Sin días de entreno</h3><p>El split semanal todavía no tiene sesiones.</p></div>
    }

    <!-- Los siete días en su orden: los de descanso van entre los de entreno, no al final. -->
    @for (day of days(); track day.day) {
      @if (isRest(day)) {
        <article class="card rest" [class.is-today]="day.day === todayDay()">
          <header class="rest__head">
            <span class="rest__icon"><app-icon name="moon" [size]="20" /></span>
            <div>
              <p class="day__eyebrow">Día {{ day.day }} · {{ day.name }} @if (day.day === todayDay()) { <span class="today">Hoy</span> }</p>
              <h3>Descanso</h3>
            </div>
            @if (steps()?.restDay; as restSteps) {
              <div class="stat rest__steps">
                <span class="stat__label">Meta de pasos</span>
                <span class="stat__value day__sets">{{ fmt(restSteps, 0) }}</span>
              </div>
            }
          </header>
          @if (cardioFor(day.day); as cardio) {
            <section class="cardio">
              <div>
                <p class="day__eyebrow">Cardio · {{ cardio.moment || 'Cuando puedas' }}</p>
                <strong>{{ cardio.protocol }}</strong>
                <p class="text-muted">{{ cardioDetail(cardio) }}</p>
              </div>
              @if (cardio.durationMin) {
                <label class="field cardio__log">
                  <span class="field__label">Minutos realizados</span>
                  <input class="cell-input cell-input--num" type="number" inputmode="numeric" min="0" [placeholder]="cardio.durationMin" [value]="day.cardioDoneMin ?? ''" (change)="setCardio(day, $any($event.target).value)" />
                </label>
              }
            </section>
          } @else {
            <p class="rest__note">Sin entrenamiento ni cardio: recupérate para tu siguiente sesión.</p>
          }
        </article>
      } @else {
      <article class="card day" [class.is-today]="day.day === todayDay()">
        <header class="day__head">
          <div>
            <p class="day__eyebrow">Día {{ day.day }} · {{ day.name }} @if (day.day === todayDay()) { <span class="today">Hoy</span> }</p>
            <h3>{{ day.session }}</h3>
          </div>
          <div class="day__meta">
            <label class="field day__date">
              <span class="field__label">Fecha</span>
              <input class="cell-input" type="date" [value]="day.date ?? ''" (change)="setDate(day, $any($event.target).value)" />
            </label>
            <div class="stat">
              <span class="stat__label">Series ✓</span>
              <span class="stat__value day__sets">{{ day.setsDone }}<small> de {{ day.setsPlanned }}</small></span>
            </div>
          </div>
        </header>

        <!-- El calentamiento abre la sesión de ese día. -->
        @if (warmupFor(day.day); as warm) {
          <details class="details warmup" [open]="day.day === todayDay()">
            <summary><span><app-icon name="flame" [size]="16" /> Calentamiento · {{ warm.protocol }} @if (warm.duration) { <small>({{ warm.duration }})</small> }</span></summary>
            <div class="details__body">
              <dl class="dl">
                @if (warm.general) { <dt>General</dt><dd>{{ warm.general }}</dd> }
                @if (warm.mobility) { <dt>Movilidad</dt><dd>{{ warm.mobility }}</dd> }
                @if (warm.activation) { <dt>Activación</dt><dd>{{ warm.activation }}</dd> }
                @if (warm.rampUpSets) { <dt>Aproximación</dt><dd>{{ warm.rampUpSets }}</dd> }
                @if (warm.notes) { <dt>Ajustes</dt><dd>{{ warm.notes }}</dd> }
              </dl>
            </div>
          </details>
        }

        @for (exercise of day.exercises; track exercise.id) {
          <section [class]="'exercise icon-hover tone--' + tone(exercise.muscle)" [class.is-done]="done(exercise)">
            <div class="exercise__head">
              <span class="thumb figure"><app-exercise-figure [exercise]="exercise.exercise" [muscle]="exercise.muscle" [figure]="exercise.movement" [size]="62" /></span>
              <div class="exercise__name">
                <strong>{{ exercise.exercise }}</strong>
                <span><b class="muscle">{{ exercise.muscle }}</b>@if (equipment(exercise.exercise)) { · {{ equipment(exercise.exercise) }} }</span>
              </div>
              @if (done(exercise)) {
                <span class="badge badge--success done-badge"><span aria-hidden="true">✓</span> Completado</span>
              } @else if (started(exercise)) {
                <span class="badge">{{ exercise.setsDone }} de {{ exercise.sets }} series</span>
              }
              @if (exercise.symbol) {
                <span class="badge badge--warning" [title]="hint(exercise.symbol)">{{ exercise.symbol }} {{ symbolLabel(exercise.symbol) }}</span>
              }
            </div>

            <dl class="pauta">
              <div><dt>Series</dt><dd>{{ exercise.sets }}</dd></div>
              <div><dt>Reps</dt><dd>{{ exercise.reps || '—' }}</dd></div>
              <div><dt>RIR</dt><dd>{{ exercise.rir ?? '—' }}</dd></div>
              <div><dt>e1RM</dt><dd>{{ fmt(exercise.e1rm) }}</dd></div>
              <div><dt>Tonelaje</dt><dd>{{ fmt(exercise.tonnage, 0) }}</dd></div>
            </dl>

            @if (exercise.description) {
              <details class="details how">
                <summary>Cómo se hace</summary>
                <p class="details__body">{{ exercise.description }}</p>
              </details>
            }

            @if (exercise.coachNotes) {
              <p class="coach-note"><b>Coach:</b> {{ exercise.coachNotes }}</p>
            }

            <div class="sets">
              @for (set of exercise.logged; track $index; let s = $index) {
                <fieldset class="set">
                  <legend>Serie {{ s + 1 }}</legend>
                  <label>
                    <span class="visually-hidden">Carga de la serie {{ s + 1 }} en kg</span>
                    <input class="cell-input cell-input--num" type="number" inputmode="decimal" min="0" step="0.5" placeholder="kg" [value]="set.load ?? ''" (change)="setLog(exercise, s, 'load', $any($event.target).value)" />
                  </label>
                  <span aria-hidden="true">×</span>
                  <label>
                    <span class="visually-hidden">Repeticiones de la serie {{ s + 1 }}</span>
                    <input class="cell-input cell-input--num" type="number" inputmode="numeric" min="0" step="1" placeholder="reps" [value]="set.reps ?? ''" (change)="setLog(exercise, s, 'reps', $any($event.target).value)" />
                  </label>
                </fieldset>
              }
            </div>

            <label class="field">
              <span class="field__label">Notas del cliente</span>
              <input class="cell-input" type="text" maxlength="1000" [value]="exercise.clientNotes ?? ''" (change)="setNotes(exercise, $any($event.target).value)" />
            </label>
          </section>
        } @empty {
          <p class="text-muted">Tu coach todavía no pauta ejercicios para este día.</p>
        }

        @if (cardioFor(day.day); as cardio) {
          <section class="cardio">
            <div>
              <p class="day__eyebrow">Cardio · {{ cardio.moment || 'Cuando puedas' }}</p>
              <strong>{{ cardio.protocol }}</strong>
              <p class="text-muted">{{ cardioDetail(cardio) }}</p>
            </div>
            @if (cardio.durationMin) {
              <label class="field cardio__log">
                <span class="field__label">Minutos realizados</span>
                <input class="cell-input cell-input--num" type="number" inputmode="numeric" min="0" [placeholder]="cardio.durationMin" [value]="day.cardioDoneMin ?? ''" (change)="setCardio(day, $any($event.target).value)" />
              </label>
            }
          </section>
        }
      </article>
      }
    }
  `,
  styles: `
    :host { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
    .day { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
    .day__head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: var(--space-3); }
    .day__eyebrow { font-size: var(--text-xs); font-weight: 700; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--color-primary); }
    .day__head h3 { font-size: var(--text-xl); text-transform: uppercase; }
    .day__meta { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--space-3) var(--space-5); }
    .day__date { width: 10rem; }
    .day__sets { font-size: var(--text-xl); }
    .exercise { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-3); padding: var(--space-4); border-radius: var(--radius-md); background: var(--color-background); }
    .exercise__head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
    /* Completado: todas las series con carga y repeticiones. */
    .exercise { border-left: 4px solid transparent; transition: background-color var(--duration); }
    .exercise.is-done { border-left-color: var(--color-success); background: var(--color-success-soft); }
    .exercise__index { display: grid; place-items: center; flex: none; width: 1.75rem; height: 1.75rem; border-radius: 50%; background: var(--color-secondary); font-size: var(--text-xs); font-weight: 700; color: var(--color-text-inverse); }
    .exercise__name { display: grid; flex: 1; min-width: 0; line-height: 1.3; }
    .exercise__name span { font-size: var(--text-xs); color: var(--color-text-muted); }
    .exercise__name strong { font-size: var(--text-base); }
    .muscle { color: var(--tone-ink); }
    .how { background: var(--color-surface); }
    .how p { white-space: pre-line; }
    .figure { width: 4.5rem; height: 4.5rem; --figure-accent: var(--tone); --figure-surface: var(--tone-soft); }
    .pauta { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-5); margin: 0; }
    .pauta dt { font-size: var(--text-xs); color: var(--color-text-muted); }
    .pauta dd { margin: 0; font-weight: 700; font-variant-numeric: tabular-nums; }
    .coach-note { padding: var(--space-2) var(--space-3); border-left: 3px solid var(--color-primary); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; background: var(--color-surface); font-size: var(--text-sm); }
    .sets { display: grid; grid-template-columns: repeat(auto-fill, minmax(11.5rem, 1fr)); gap: var(--space-2); }
    .set { display: flex; align-items: center; gap: var(--space-2); margin: 0; padding: 0; border: 0; min-width: 0; }
    .set legend { float: left; width: 3.6rem; padding: 0; font-size: var(--text-xs); font-weight: 600; color: var(--color-text-muted); }
    .set label { flex: 1; min-width: 0; }
    .cardio { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-4); border-radius: var(--radius-md); background: var(--tone-steel-soft); font-size: var(--text-sm); }
    /* Día de hoy: borde y etiqueta para ubicarse de un vistazo. */
    .is-today { outline: 2px solid var(--color-primary); outline-offset: 2px; scroll-margin-top: 5rem; }
    .today { display: inline-block; margin-left: var(--space-2); padding: 0.1rem 0.6rem; border-radius: var(--radius-pill); background: var(--color-primary); letter-spacing: var(--tracking-wide); color: var(--color-text-inverse); }
    /* Descanso: tarjeta gris, compacta, en su lugar de la semana. */
    .rest { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-3); padding-block: var(--space-4); background: var(--color-surface-alt); box-shadow: none; }
    .rest__head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
    .rest__head > div:first-of-type { flex: 1; min-width: 0; }
    .rest__head h3 { font-size: var(--text-lg); text-transform: uppercase; color: var(--color-text-muted); }
    .rest .day__eyebrow { color: var(--color-text-muted); }
    .rest__icon { display: grid; place-items: center; flex: none; width: 2.5rem; height: 2.5rem; border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-accent); }
    .rest__note { font-size: var(--text-sm); color: var(--color-text-muted); }
    .rest .cardio { background: var(--color-surface); }
    .warmup { background: var(--tone-amber-soft); }
    .warmup summary span { display: inline-flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); color: var(--tone-amber-ink); }
    .warmup summary small { font-weight: 500; }
    .cardio__log { width: 9rem; }
  `,
})
export class WeekSheet {
  private readonly store = inject(ClientStore);
  readonly week = input.required<TrainingWeek>();
  readonly cardio = input<CardioDay[]>([]);
  readonly warmup = input<WarmupDay[]>([]);
  readonly steps = input<{ trainingDay?: number | null; restDay?: number | null } | null>(null);
  /** Es la semana en curso: se marca el día de hoy. */
  readonly current = input(false);

  /** Lo que el usuario lleva escrito por ejercicio; manda sobre lo que llegue del servidor. */
  private readonly drafts = new Map<string, LoggedSet[]>();

  protected readonly hasTraining = computed(() => this.week().days.some((day) => !this.isRest(day)));
  protected readonly days = computed(() => (this.hasTraining() ? this.week().days : []));
  protected readonly todayDay = computed(() => (this.current() ? weekDayOf(this.store.today()) : null));

  protected isRest(day: WeekDay): boolean {
    return day.session === REST && !day.exercises.length;
  }

  protected warmupFor(day: number): WarmupDay | null {
    const entry = this.warmup().find((w) => w.day === day);
    return entry?.protocol ? entry : null;
  }

  protected cardioFor(day: number): CardioDay | null {
    const entry = this.cardio().find((c) => c.day === day);
    return entry?.protocol && entry.type !== 'NEAT' ? entry : null;
  }

  protected cardioDetail(cardio: CardioDay): string {
    return [cardio.durationMin ? `${cardio.durationMin} min` : null, cardio.intervals && cardio.intervals !== '—' ? cardio.intervals : null, cardio.rpe && cardio.rpe !== '—' ? `RPE ${cardio.rpe}` : null, cardio.hrZone && cardio.hrZone !== '—' ? cardio.hrZone : null, cardio.instructions, cardio.notes]
      .filter(Boolean)
      .join(' · ');
  }

  /** Completado = todas las series tienen carga y repeticiones. Es solo visual. */
  protected done(exercise: WeekExercise): boolean {
    return exercise.logged.length > 0 && exercise.logged.every((set) => set.load !== null && set.reps !== null);
  }

  protected started(exercise: WeekExercise): boolean {
    return exercise.logged.some((set) => set.load !== null || set.reps !== null);
  }

  protected fmt = formatNumber;
  protected readonly tone = muscleTone;
  protected readonly equipment = exerciseEquipment;
  protected hint = (symbol: string) => SYMBOLS.find((s) => s.symbol === symbol)?.hint ?? '';
  protected symbolLabel = (symbol: string) => SYMBOLS.find((s) => s.symbol === symbol)?.label ?? '';

  protected setLog(exercise: WeekExercise, index: number, field: keyof LoggedSet, value: string): void {
    const draft = this.drafts.get(exercise.id) ?? exercise.logged.map((set) => ({ ...set }));
    draft[index] = { ...draft[index]!, [field]: toNumber(value) };
    this.drafts.set(exercise.id, draft);
    this.store.logExercise(exercise.id, { logged: draft }).subscribe();
  }

  protected setNotes(exercise: WeekExercise, value: string): void {
    this.store.logExercise(exercise.id, { clientNotes: value.trim() || null }).subscribe();
  }

  protected setDate(day: WeekDay, value: string): void {
    this.store.logWeek(this.week().id, { dayDates: { [day.day]: value || null } }).subscribe();
  }

  protected setCardio(day: WeekDay, value: string): void {
    this.store.logWeek(this.week().id, { cardioLog: { [day.day]: toNumber(value) } }).subscribe();
  }
}
