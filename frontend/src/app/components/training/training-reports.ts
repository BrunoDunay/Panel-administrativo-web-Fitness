import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { TrainingView, WEEK_DAYS } from '../../core/types/training.model';
import { formatNumber, formatPercent } from '../../core/utils/format';
import { sessionTone } from '../../core/utils/visuals';
import { Icon } from '../icon/icon';

/** Cuántas semanas se comparan a la vez; 0 = todas. Con muchas semanas, la tabla completa no cabe en un teléfono. */
const RANGES = [
  { value: 4, label: 'Últimas 4' },
  { value: 8, label: 'Últimas 8' },
  { value: 0, label: 'Todas' },
] as const;

/**
 * Volumen por músculo, progreso por ejercicio y cumplimiento de cardio (lo que eran las hojas automáticas).
 * Es información técnica: cada panel llega contraído y, al abrirlo, compara solo las últimas semanas
 * (se puede ampliar). El progreso por ejercicio se abre día por día.
 */
@Component({
  selector: 'app-training-reports',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <details class="card panel">
      <summary class="panel__head">
        <span class="tile-icon tone--emerald"><app-icon name="layers" [size]="20" /></span>
        <span class="panel__title"><b>Volumen semanal por músculo</b><small>Series por semana y prioridad del bloque</small></span>
        <app-icon class="panel__chevron" name="chevronDown" [size]="20" />
      </summary>
      <div class="panel__body">
        @if (plan().volume.length) {
          <div class="controls">
            <div class="tabs" role="tablist" aria-label="Series a mostrar">
              <button type="button" class="tab" role="tab" [attr.aria-selected]="mode() === 'planned'" (click)="mode.set('planned')">Programadas</button>
              <button type="button" class="tab" role="tab" [attr.aria-selected]="mode() === 'done'" (click)="mode.set('done')">Realizadas</button>
            </div>
            @if (canRange()) {
              <div class="tabs" role="tablist" aria-label="Semanas a comparar">
                @for (option of ranges; track option.value) {
                  <button type="button" class="tab" role="tab" [attr.aria-selected]="range() === option.value" (click)="range.set(option.value)">{{ option.label }}</button>
                }
              </div>
            }
          </div>
          <div class="table-wrap">
            <table class="report">
              <thead>
                <tr>
                  <th>Músculo</th>
                  <th class="num">Frec.</th>
                  @for (week of weeks(); track week.number) {
                    <th class="num">S{{ week.number }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of plan().volume; track row.muscle) {
                  <tr>
                    <td>
                      {{ row.muscle }}
                      @if (row.priority) {
                        <span class="badge" [class.badge--success]="row.priority === 'P1'" [class.badge--steel]="row.priority === 'P2'">{{ row.priority }}</span>
                      }
                    </td>
                    <td class="num">{{ row.weeks[row.weeks.length - 1]?.frequency || '—' }}</td>
                    @for (week of lastOf(row.weeks); track week.number) {
                      <td class="num">{{ (mode() === 'planned' ? week.planned : week.done) || '—' }}</td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="text-muted">Aparecerá cuando la primera semana tenga ejercicios.</p>
        }
      </div>
    </details>

    <details class="card panel">
      <summary class="panel__head">
        <span class="tile-icon tone--steel"><app-icon name="chart" [size]="20" /></span>
        <span class="panel__title"><b>Progreso por ejercicio</b><small>Fuerza estimada (e1RM) y tonelaje, semana a semana</small></span>
        <app-icon class="panel__chevron" name="chevronDown" [size]="20" />
      </summary>
      <div class="panel__body">
        @if (plan().progress.length) {
          <p class="card__hint">e1RM = mejor serie de la semana estimada a 1RM (Epley). Tonelaje = Σ carga × reps.</p>
          <div class="controls">
            <div class="tabs" role="tablist" aria-label="Métrica">
              <button type="button" class="tab" role="tab" [attr.aria-selected]="metric() === 'e1rm'" (click)="metric.set('e1rm')">e1RM</button>
              <button type="button" class="tab" role="tab" [attr.aria-selected]="metric() === 'tonnage'" (click)="metric.set('tonnage')">Tonelaje</button>
            </div>
            @if (canRange()) {
              <div class="tabs" role="tablist" aria-label="Semanas a comparar">
                @for (option of ranges; track option.value) {
                  <button type="button" class="tab" role="tab" [attr.aria-selected]="range() === option.value" (click)="range.set(option.value)">{{ option.label }}</button>
                }
              </div>
            }
          </div>
          <!-- Un día a la vez: abrir uno cierra el anterior, así la lista nunca se hace eterna. -->
          @for (group of progressByDay(); track group.day) {
            <details [class]="'daygroup tone--' + tone(group.session)" name="progress-day">
              <summary>
                <span class="daygroup__badge">{{ group.name.slice(0, 3) }}</span>
                <span class="daygroup__title"><b>{{ group.session }}</b><small>{{ group.rows.length }} ejercicio(s)</small></span>
                <app-icon class="panel__chevron" name="chevronDown" [size]="18" />
              </summary>
              <div class="table-wrap">
                <table class="report">
                  <thead>
                    <tr>
                      <th>Ejercicio</th>
                      @for (week of weeks(); track week.number) {
                        <th class="num">S{{ week.number }}</th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of group.rows; track row.exercise) {
                      <tr>
                        <td>{{ row.exercise }}<span class="sub">{{ row.muscle }}@if (row.reps) { · {{ row.reps }} reps }</span></td>
                        @for (week of lastOf(row.weeks); track week.number) {
                          <td class="num">
                            @let trend = metric() === 'e1rm' ? week.e1rmTrend : week.tonnageTrend;
                            <span [class.trend--up]="trend === 'up'" [class.trend--down]="trend === 'down'">
                              {{ fmt(metric() === 'e1rm' ? week.e1rm : week.tonnage, metric() === 'e1rm' ? 1 : 0) }}
                              @if (trend === 'up') { <span aria-label="mejoró">▲</span> }
                              @if (trend === 'down') { <span aria-label="bajó">▼</span> }
                            </span>
                          </td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </details>
          }
        } @else {
          <p class="text-muted">Aparecerá cuando haya cargas registradas.</p>
        }
      </div>
    </details>

    @if (plan().cardioMinutesPerWeek) {
      <details class="card panel">
        <summary class="panel__head">
          <span class="tile-icon tone--teal"><app-icon name="run" [size]="20" /></span>
          <span class="panel__title"><b>Cumplimiento de cardio</b><small>Pauta: {{ plan().cardioMinutesPerWeek }} min en {{ plan().cardioSessions }} sesiones por semana</small></span>
          <app-icon class="panel__chevron" name="chevronDown" [size]="20" />
        </summary>
        <div class="panel__body">
          <div class="cardio-grid">
            @for (week of weeks(); track week.number) {
              <div class="stat">
                <span class="stat__label">Semana {{ week.number }}</span>
                <span class="stat__value small-value">{{ week.cardio.done ?? '—' }}<small> / {{ week.cardio.planned }} min</small></span>
                <div class="meter" [class.meter--warning]="(week.cardio.compliance ?? 1) < 0.8"><span [style.width.%]="pct(week.cardio.compliance)"></span></div>
                <span class="stat__note">{{ percent(week.cardio.compliance) }}</span>
              </div>
            }
          </div>
        </div>
      </details>
    }
  `,
  styles: `
    :host { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-3); }
    .panel { padding: 0; }
    .panel__head { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-4) var(--space-5); list-style: none; cursor: pointer; }
    .panel__head::-webkit-details-marker, .daygroup > summary::-webkit-details-marker { display: none; }
    .panel__title { display: grid; flex: 1; min-width: 0; line-height: 1.3; }
    .panel__title b { font-size: var(--text-base); }
    .panel__title small { font-size: var(--text-xs); color: var(--color-text-muted); }
    .panel__chevron { flex: none; color: var(--color-text-muted); transition: transform var(--duration) var(--ease-out); }
    details[open] > summary .panel__chevron { transform: rotate(180deg); }
    .panel__body { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-3); padding: 0 var(--space-5) var(--space-5); animation: panel-open var(--duration) var(--ease-out); }
    @keyframes panel-open { from { opacity: 0; transform: translateY(-8px); } }
    .controls { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); }
    /* Tabla propia del reporte (no la del panel, que en teléfono se convierte en fichas y la alargaría):
       compacta, con la primera columna fija al desplazarse y las cifras en monoespaciada. */
    .table-wrap { overflow-x: auto; }
    .report { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
    .report th, .report td { padding: 0.55rem 0.6rem; border-bottom: 1px solid var(--color-border); text-align: left; vertical-align: middle; }
    .report th { font-family: var(--font-mono); font-size: var(--text-xs); font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-text-muted); white-space: nowrap; }
    .report tbody tr:last-child td { border-bottom: 0; }
    .report td:first-child { font-weight: 600; line-height: 1.3; }
    .report .num { text-align: right; }
    .trend--up { color: var(--color-success); }
    .trend--down { color: var(--color-danger); }
    .report th:first-child, .report td:first-child { position: sticky; left: 0; z-index: 1; min-width: 8.5rem; background: var(--color-surface); }
    .report td.num, .report th.num { font-family: var(--font-mono); white-space: nowrap; }
    .report .badge { margin-left: var(--space-1); }
    .sub { display: block; font-size: var(--text-xs); color: var(--color-text-muted); }
    .small-value { font-size: var(--text-xl); }
    .cardio-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: var(--space-4); }
    /* Progreso por día: cada día es su propio renglón plegable, con el color de su sesión. */
    .daygroup { border-radius: var(--radius-md); background: var(--color-background); overflow: hidden; }
    .daygroup > summary { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-3) var(--space-2) var(--space-2); list-style: none; cursor: pointer; }
    .daygroup__badge { display: grid; place-items: center; flex: none; width: 2.75rem; height: 2.75rem; border-radius: var(--radius-sm); background: var(--tone-gradient); font-family: var(--font-mono); font-size: var(--text-xs); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-text-inverse); }
    .daygroup__title { display: grid; flex: 1; min-width: 0; line-height: 1.25; }
    .daygroup__title small { font-size: var(--text-xs); color: var(--color-text-muted); }
    .daygroup .table-wrap { padding: 0 var(--space-2) var(--space-2); animation: panel-open var(--duration) var(--ease-out); }
    .daygroup .report th:first-child, .daygroup .report td:first-child { background: var(--color-background); }
    @media (max-width: 720px) {
      .panel__head { padding: var(--space-3) var(--space-4); }
      .panel__body { padding: 0 var(--space-3) var(--space-4); }
      .report th, .report td { padding: 0.5rem 0.4rem; }
      .report th:first-child, .report td:first-child { min-width: 7rem; max-width: 9.5rem; }
      .cardio-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  `,
})
export class TrainingReports {
  readonly plan = input.required<TrainingView>();
  protected readonly mode = signal<'planned' | 'done'>('planned');
  protected readonly metric = signal<'e1rm' | 'tonnage'>('e1rm');
  protected readonly range = signal<number>(4);
  protected readonly ranges = RANGES;
  protected readonly fmt = formatNumber;
  protected readonly percent = formatPercent;
  protected readonly tone = sessionTone;

  /** Con cuatro semanas o menos no hay nada que recortar. */
  protected readonly canRange = computed(() => this.plan().weeks.length > 4);
  protected readonly weeks = computed(() => this.lastOf(this.plan().weeks));

  protected readonly progressByDay = computed(() => {
    const plan = this.plan();
    const days = [...new Set(plan.progress.map((row) => row.day))].sort((a, b) => a - b);
    return days.map((day) => ({ day, name: WEEK_DAYS[day - 1] ?? '', session: plan.split[day - 1] ?? '', rows: plan.progress.filter((row) => row.day === day) }));
  });

  /** Las últimas semanas según el rango elegido (todas si es 0). */
  protected lastOf<T>(items: T[]): T[] {
    const count = this.range();
    return count ? items.slice(-count) : items;
  }

  protected pct(value: number | null): number {
    return Math.min(100, Math.round((value ?? 0) * 100));
  }
}
