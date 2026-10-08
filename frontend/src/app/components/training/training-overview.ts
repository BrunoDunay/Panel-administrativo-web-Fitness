import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { REST, TrainingView, WEEK_DAYS } from '../../core/types/training.model';
import { formatDate, formatNumber } from '../../core/utils/format';

/** Resumen de lectura del plan: objetivo, bloque, split, prioridades, pasos, cardio y calentamiento. */
@Component({
  selector: 'app-training-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card card--vivid tone--slate hero">
      <div>
        <p class="hero__eyebrow">{{ plan().name }}</p>
        <h3>{{ plan().objective.primary || 'Objetivo por definir' }}</h3>
        @if (plan().objective.secondary) {
          <p class="hero__sub">{{ plan().objective.secondary }}</p>
        }
      </div>
      <div class="hero__stats">
        <div class="stat"><span class="stat__label">Bloque</span><span class="stat__value">{{ plan().blockPhase || '—' }}</span></div>
        <div class="stat"><span class="stat__label">Semanas</span><span class="stat__value">{{ plan().blockWeeks ?? '—' }}</span></div>
        <div class="stat"><span class="stat__label">Inicio → fin</span><span class="stat__value dates">{{ date(plan().blockStart, true) }} → {{ date(plan().blockEnd, true) }}</span></div>
        <div class="stat"><span class="stat__label">Días de entreno</span><span class="stat__value">{{ plan().trainingDays }}</span></div>
      </div>
    </section>

    @if (plan().objective.startingPoint || plan().objective.trajectory) {
      <section class="card grid grid--2">
        @if (plan().objective.startingPoint) {
          <div><h4 class="label">Punto de partida</h4><p>{{ plan().objective.startingPoint }}</p></div>
        }
        @if (plan().objective.trajectory) {
          <div><h4 class="label">Trayectoria</h4><p>{{ plan().objective.trajectory }}</p></div>
        }
      </section>
    }

    <section class="card">
      <h3 class="card__title head">Split semanal</h3>
      <ol class="split">
        @for (session of plan().split; track $index) {
          <li [class.is-rest]="session === rest">
            <span>{{ days[$index].slice(0, 3) }}</span>
            <strong>{{ session }}</strong>
          </li>
        }
      </ol>
    </section>

    <div class="grid grid--2">
      <section class="card">
        <h3 class="card__title head">Prioridades musculares del bloque</h3>
        <dl class="dl">
          @for (level of levels; track level.key) {
            @if (plan().priorities[level.key]?.length) {
              <dt>{{ level.label }}</dt>
              <dd>
                {{ plan().priorities[level.key].join(', ') }}
                @if (plan().priorities.notes?.[level.key]; as note) {
                  <span class="note">{{ noteText(note) }}</span>
                }
              </dd>
            }
          } @empty {}
        </dl>
        @if (!hasPriorities()) {
          <p class="text-muted">Sin prioridades definidas.</p>
        }
      </section>

      <section class="card">
        <h3 class="card__title head">Pasos diarios (NEAT)</h3>
        <div class="grid" style="--min: 110px">
          <div class="stat"><span class="stat__label">Días de entreno</span><span class="stat__value steps">{{ num(plan().steps.trainingDay, 0) }}</span></div>
          <div class="stat"><span class="stat__label">Días de descanso</span><span class="stat__value steps">{{ num(plan().steps.restDay, 0) }}</span></div>
          <div class="stat"><span class="stat__label">Promedio semanal</span><span class="stat__value steps">{{ num(plan().steps.weeklyAverage, 0) }}</span></div>
        </div>
      </section>
    </div>

    @if (hasWarmup()) {
      <section class="card">
        <h3 class="card__title head">Calentamiento por día</h3>
        <p class="card__hint head">Son pautas generales: individualiza según cómo llegues ese día. Las series de aproximación van solo donde las necesites.</p>
        <div class="stack stack--sm">
          @for (day of plan().warmup; track day.day) {
            @if (day.protocol) {
              <details class="details">
                <summary>Día {{ day.day }} · {{ days[day.day - 1] }} · {{ day.session }} — {{ day.protocol }} @if (day.duration) { ({{ day.duration }}) }</summary>
                <div class="details__body">
                  <dl class="dl">
                    @if (day.general) { <dt>General</dt><dd>{{ day.general }}</dd> }
                    @if (day.mobility) { <dt>Movilidad</dt><dd>{{ day.mobility }}</dd> }
                    @if (day.activation) { <dt>Activación</dt><dd>{{ day.activation }}</dd> }
                    @if (day.rampUpSets) { <dt>Aproximación</dt><dd>{{ day.rampUpSets }}</dd> }
                    @if (day.notes) { <dt>Ajustes</dt><dd>{{ day.notes }}</dd> }
                  </dl>
                </div>
              </details>
            }
          }
        </div>
      </section>
    }

    @if (plan().macroBlocks.length) {
      <section class="card">
        <h3 class="card__title head">Planeación de bloques</h3>
        <div class="table-wrap">
          <table class="table table--compact">
            <thead><tr><th>#</th><th>Fase</th><th class="num">Semanas</th><th>Enfoque</th><th>Inicio</th><th>Fin</th></tr></thead>
            <tbody>
              @for (block of plan().macroBlocks; track $index) {
                <tr>
                  <td>{{ $index + 1 }}</td>
                  <td>{{ block.phase || '—' }}</td>
                  <td class="num">{{ block.weeks ?? '—' }}</td>
                  <td>{{ block.focus || '—' }}</td>
                  <td>{{ date(block.startDate, true) }}</td>
                  <td>{{ date(block.endDate, true) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }
  `,
  styles: `
    :host { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
    .hero { display: grid; gap: var(--space-5); }
    .hero__eyebrow { font-size: var(--text-xs); font-weight: 700; letter-spacing: var(--tracking-wider); text-transform: uppercase; color: var(--color-mint); }
    .hero h3 { font-size: var(--text-2xl); }
    .hero__sub { opacity: 0.75; }
    .hero__stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: var(--space-4); }
    .hero .stat__value { font-size: var(--text-xl); }
    .hero .dates { font-size: var(--text-base); }
    .head { margin-bottom: var(--space-3); }
    .label { margin-bottom: var(--space-1); font-size: var(--text-xs); font-weight: 700; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--color-primary); }
    .split { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: var(--space-2); list-style: none; }
    .split li { display: grid; gap: 2px; padding: var(--space-3) var(--space-2); border-radius: var(--radius-md); background: var(--gradient-emerald); text-align: center; color: var(--color-text-inverse); }
    .split span { font-size: var(--text-xs); opacity: 0.8; }
    .split strong { font-size: var(--text-sm); overflow-wrap: anywhere; }
    .split .is-rest { background: var(--color-surface-alt); color: var(--color-text-muted); }
    .steps { font-size: var(--text-xl); }
    .note { display: block; font-size: var(--text-xs); font-weight: 400; color: var(--color-text-muted); }
    @media (max-width: 640px) {
      .split { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    }
  `,
})
export class TrainingOverview {
  readonly plan = input.required<TrainingView>();
  protected readonly days = WEEK_DAYS;
  protected readonly rest = REST;
  protected readonly date = formatDate;
  protected readonly num = formatNumber;
  protected readonly levels = [
    { key: 'p1', label: 'Prioridad 1' },
    { key: 'p2', label: 'Prioridad 2' },
    { key: 'p3', label: 'Prioridad 3' },
    { key: 'maintenance', label: 'Mantenimiento' },
  ] as const;

  protected hasPriorities(): boolean {
    return this.levels.some((level) => this.plan().priorities[level.key]?.length);
  }

  protected hasWarmup(): boolean {
    return this.plan().warmup.some((day) => day.protocol);
  }

  protected noteText(note: { sets?: string | null; frequency?: string | null; strategy?: string | null }): string {
    return [note.sets ? `${note.sets} series/sem` : null, note.frequency ? `frecuencia ${note.frequency}` : null, note.strategy].filter(Boolean).join(' · ');
  }
}
