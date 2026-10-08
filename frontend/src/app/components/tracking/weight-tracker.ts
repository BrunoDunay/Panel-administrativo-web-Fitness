import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LineChart } from '../charts/line-chart';
import { ClientStore } from '../../core/services/client-store';
import { formatDate, formatNumber, formatPercent, formatSigned, toNumber } from '../../core/utils/format';

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAY_MS = 864e5;

/** Peso diario en ayunas: registro de la semana, promedio semanal y cambio real contra el esperado. */
@Component({
  selector: 'app-weight-tracker',
  imports: [LineChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card">
      <header class="card__head">
        <div>
          <h3 class="card__title">Peso en ayunas</h3>
          <p class="card__hint">Pésate al despertar, después de ir al baño y antes de comer o beber.</p>
        </div>
        <div class="row no-print">
          <button type="button" class="chip" (click)="shift(-7)" aria-label="Semana anterior">←</button>
          <span class="week-label">Semana del {{ date(weekStart(), true) }}</span>
          <button type="button" class="chip" (click)="shift(7)" [disabled]="isCurrentWeek()" aria-label="Semana siguiente">→</button>
        </div>
      </header>

      <div class="days">
        @for (day of days(); track day.date) {
          <label class="field day" [class.is-today]="day.date === store.today()">
            <span class="field__label">{{ day.name }} {{ day.date.slice(8) }}</span>
            <input class="cell-input cell-input--num" type="number" inputmode="decimal" min="25" max="350" step="0.1" placeholder="kg" [disabled]="day.date > store.today()" [value]="day.weightKg ?? ''" (change)="save(day.date, $any($event.target).value)" />
          </label>
        }
      </div>
    </section>

    <section class="card">
      <header class="card__head">
        <h3 class="card__title">Promedio semanal: real contra esperado</h3>
        @if (weight()?.weeklyChangeKg; as change) {
          <span class="badge badge--steel">Esperado: {{ signed(change, 2) }} kg por semana</span>
        }
      </header>
      <app-line-chart [labels]="chartLabels()" [series]="chartSeries()" unit="kg" label="Peso promedio semanal real contra esperado" emptyText="Registra tu peso al menos dos semanas para ver la tendencia." />

      @if (weeks().length) {
        <div class="table-wrap table-top">
          <table class="table table--compact">
            <thead><tr><th>Semana</th><th class="num">Promedio</th><th class="num">Cambio</th><th class="num">Cambio %</th><th class="num">Esperado</th></tr></thead>
            <tbody>
              @for (week of weeks(); track week.number) {
                <tr>
                  <td>{{ week.number }} · {{ date(week.start, true) }}</td>
                  <td class="num">{{ num(week.average, 2) }}</td>
                  <td class="num">{{ signed(week.changeKg, 2) }}</td>
                  <td class="num">{{ week.changePct === null ? '—' : pct(week.changePct, 2) }}</td>
                  <td class="num">{{ num(week.expected, 2) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  styles: `
    :host { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
    .days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: var(--space-2); }
    .day.is-today .field__label { color: var(--color-primary); font-weight: 700; }
    .week-label { font-size: var(--text-sm); font-weight: 600; }
    .table-top { margin-top: var(--space-4); }
    @media (max-width: 640px) {
      .days { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    }
  `,
})
export class WeightTracker {
  protected readonly store = inject(ClientStore);
  protected readonly date = formatDate;
  protected readonly num = formatNumber;
  protected readonly signed = formatSigned;
  protected readonly pct = formatPercent;

  protected readonly weight = computed(() => this.store.tracking()?.weight ?? null);
  protected readonly weeks = computed(() => this.weight()?.weeks ?? []);

  /** Días de desplazamiento respecto a la semana actual (0, −7, −14…). */
  private readonly offset = signal(0);
  protected readonly isCurrentWeek = computed(() => this.offset() >= 0);

  protected readonly weekStart = computed(() => {
    const today = Date.parse(`${this.store.today()}T00:00:00Z`);
    const weekday = (new Date(today).getUTCDay() + 6) % 7;
    return new Date(today - weekday * DAY_MS + this.offset() * DAY_MS).toISOString().slice(0, 10);
  });

  protected readonly days = computed(() => {
    const logged = new Map(this.weeks().flatMap((week) => week.days).map((day) => [day.date, day.weightKg]));
    const start = Date.parse(`${this.weekStart()}T00:00:00Z`);
    return DAY_NAMES.map((name, i) => {
      const date = new Date(start + i * DAY_MS).toISOString().slice(0, 10);
      return { name, date, weightKg: logged.get(date) ?? null };
    });
  });

  protected readonly chartLabels = computed(() => this.weeks().map((week) => `Sem ${week.number}`));
  protected readonly chartSeries = computed(() => {
    const weeks = this.weeks();
    const series = [{ name: 'Promedio real', values: weeks.map((week) => week.average) }];
    if (weeks.some((week) => week.expected !== null)) series.push({ name: 'Esperado', values: weeks.map((week) => week.expected), dashed: true } as never);
    return series;
  });

  protected shift(days: number): void {
    this.offset.update((value) => Math.min(0, value + days));
  }

  protected save(date: string, value: string): void {
    this.store.saveWeight(date, { weightKg: toNumber(value) }).subscribe();
  }
}
