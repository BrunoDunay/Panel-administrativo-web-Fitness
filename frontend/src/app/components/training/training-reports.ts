import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { TrainingView, WEEK_DAYS } from '../../core/types/training.model';
import { formatNumber, formatPercent } from '../../core/utils/format';

/** Volumen por músculo, progreso por ejercicio y cumplimiento de cardio (lo que eran las hojas automáticas). */
@Component({
  selector: 'app-training-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card">
      <header class="card__head">
        <div>
          <h3 class="card__title">Volumen semanal por músculo</h3>
          <p class="card__hint">Series por semana. La prioridad viene del bloque actual.</p>
        </div>
        <div class="tabs" role="tablist" aria-label="Series a mostrar">
          <button type="button" class="tab" role="tab" [attr.aria-selected]="mode() === 'planned'" (click)="mode.set('planned')">Programadas</button>
          <button type="button" class="tab" role="tab" [attr.aria-selected]="mode() === 'done'" (click)="mode.set('done')">Realizadas</button>
        </div>
      </header>
      @if (plan().volume.length) {
        <div class="table-wrap">
          <table class="table table--compact">
            <thead>
              <tr>
                <th>Músculo</th>
                <th>Prioridad</th>
                <th class="num">Frec.</th>
                @for (week of plan().weeks; track week.number) {
                  <th class="num">Sem {{ week.number }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of plan().volume; track row.muscle) {
                <tr>
                  <td>{{ row.muscle }}</td>
                  <td>
                    @if (row.priority) {
                      <span class="badge" [class.badge--success]="row.priority === 'P1'" [class.badge--steel]="row.priority === 'P2'">{{ row.priority }}</span>
                    }
                  </td>
                  <td class="num">{{ row.weeks[row.weeks.length - 1]?.frequency || '—' }}</td>
                  @for (week of row.weeks; track week.number) {
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
    </section>

    <section class="card">
      <header class="card__head">
        <div>
          <h3 class="card__title">Progreso por ejercicio</h3>
          <p class="card__hint">e1RM = mejor serie de la semana estimada a 1RM (Epley). Tonelaje = Σ carga × reps.</p>
        </div>
        <div class="tabs" role="tablist" aria-label="Métrica">
          <button type="button" class="tab" role="tab" [attr.aria-selected]="metric() === 'e1rm'" (click)="metric.set('e1rm')">e1RM</button>
          <button type="button" class="tab" role="tab" [attr.aria-selected]="metric() === 'tonnage'" (click)="metric.set('tonnage')">Tonelaje</button>
        </div>
      </header>
      @if (plan().progress.length) {
        <div class="table-wrap">
          <table class="table table--compact">
            <thead>
              <tr>
                <th>Ejercicio</th>
                <th>Reps obj.</th>
                @for (week of plan().weeks; track week.number) {
                  <th class="num">Sem {{ week.number }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (group of progressByDay(); track group.day) {
                <tr class="table__group"><td [attr.colspan]="plan().weeks.length + 2">Día {{ group.day }} · {{ group.name }} · {{ group.session }}</td></tr>
                @for (row of group.rows; track row.exercise) {
                  <tr>
                    <td>{{ row.exercise }}<br /><span class="text-muted small">{{ row.muscle }}</span></td>
                    <td>{{ row.reps || '—' }}</td>
                    @for (week of row.weeks; track week.number) {
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
              }
            </tbody>
          </table>
        </div>
      } @else {
        <p class="text-muted">Aparecerá cuando haya cargas registradas.</p>
      }
    </section>

    @if (plan().cardioMinutesPerWeek) {
      <section class="card">
        <header class="card__head">
          <h3 class="card__title">Cumplimiento de cardio</h3>
          <p class="card__hint">Pauta: {{ plan().cardioMinutesPerWeek }} min en {{ plan().cardioSessions }} sesiones por semana</p>
        </header>
        <div class="cardio-grid">
          @for (week of plan().weeks; track week.number) {
            <div class="stat">
              <span class="stat__label">Semana {{ week.number }}</span>
              <span class="stat__value small-value">{{ week.cardio.done ?? '—' }}<small> / {{ week.cardio.planned }} min</small></span>
              <div class="meter" [class.meter--warning]="(week.cardio.compliance ?? 1) < 0.8"><span [style.width.%]="pct(week.cardio.compliance)"></span></div>
              <span class="stat__note">{{ percent(week.cardio.compliance) }}</span>
            </div>
          }
        </div>
      </section>
    }
  `,
  styles: `
    :host { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
    .small { font-size: var(--text-xs); }
    .small-value { font-size: var(--text-xl); }
    .cardio-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: var(--space-4); }
  `,
})
export class TrainingReports {
  readonly plan = input.required<TrainingView>();
  protected readonly mode = signal<'planned' | 'done'>('planned');
  protected readonly metric = signal<'e1rm' | 'tonnage'>('e1rm');
  protected readonly fmt = formatNumber;
  protected readonly percent = formatPercent;

  protected readonly progressByDay = computed(() => {
    const plan = this.plan();
    const days = [...new Set(plan.progress.map((row) => row.day))].sort((a, b) => a - b);
    return days.map((day) => ({ day, name: WEEK_DAYS[day - 1], session: plan.split[day - 1], rows: plan.progress.filter((row) => row.day === day) }));
  });

  protected pct(value: number | null): number {
    return Math.min(100, Math.round((value ?? 0) * 100));
  }
}
