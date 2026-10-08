import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LineChart } from '../charts/line-chart';
import { Icon } from '../icon/icon';
import { ClientStore } from '../../core/services/client-store';
import { formatDate, formatNumber, formatPercent, formatSigned, toNumber } from '../../core/utils/format';

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAY_MS = 864e5;

/** Peso diario en ayunas: registro de la semana, promedio semanal y cambio real contra el esperado. */
@Component({
  selector: 'app-weight-tracker',
  imports: [LineChart, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card card--badge tone--emerald icon-hover">
      <span class="card__badge"><app-icon name="scale" [size]="26" /></span>
      <h3 class="form-section__title">Peso en ayunas</h3>
      <p class="card__hint lead">Pésate al despertar, después de ir al baño y <b>antes de comer o beber</b>. Se guarda solo al salir del campo.</p>

      <div class="weeknav">
        <button type="button" class="nav-btn" (click)="shift(-7)" aria-label="Semana anterior"><app-icon name="arrowLeft" [size]="18" /></button>
        <span class="week-label">Semana del {{ date(weekStart(), true) }}</span>
        <button type="button" class="nav-btn" (click)="shift(7)" [disabled]="isCurrentWeek()" aria-label="Semana siguiente"><app-icon name="arrowRight" [size]="18" /></button>
      </div>

      <div class="days">
        @for (day of days(); track day.date) {
          <label class="day" [class.is-today]="day.date === store.today()" [class.is-filled]="day.weightKg !== null" [class.is-future]="day.date > store.today()">
            <span class="day__name">{{ day.name }}</span>
            <span class="day__date">{{ day.date.slice(8) }}</span>
            <input class="day__input" type="number" inputmode="decimal" min="25" max="350" step="0.1" placeholder="kg" [disabled]="day.date > store.today()" [value]="day.weightKg ?? ''" (change)="save(day.date, $any($event.target).value)" [attr.aria-label]="'Peso del ' + day.name + ' ' + day.date.slice(8) + ' en kilos'" />
          </label>
        }
      </div>

      <div class="boxes">
        <div class="box tone--emerald"><span>Promedio de esta semana</span><b>{{ num(current().average, 2) }}<small> kg</small></b></div>
        <div class="box tone--steel"><span>Cambio vs. semana anterior</span><b>{{ signed(current().changeKg, 2) }}<small> kg</small></b></div>
        <div class="box tone--teal"><span>Cambio esperado por semana</span><b>{{ signed(weight()?.weeklyChangeKg, 2) }}<small> kg</small></b></div>
      </div>
    </section>

    <section class="card">
      <header class="card__head card__head--icon icon-hover">
        <span class="tile-icon tone--emerald"><app-icon name="chart" [size]="20" /></span>
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
    :host { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-5); }
    .lead { max-width: 60ch; margin: var(--space-2) auto var(--space-4); text-align: center; }
    .weeknav { display: flex; align-items: center; justify-content: center; gap: var(--space-3); margin-bottom: var(--space-3); }
    .week-label { min-width: 9.5rem; font-size: var(--text-sm); font-weight: 700; text-align: center; }
    .nav-btn { display: grid; place-items: center; width: 2.4rem; height: 2.4rem; border: 0; border-radius: 50%; background: var(--color-surface-alt); color: var(--color-text); transition: transform 140ms var(--ease-out); }
    .nav-btn:active { transform: scale(0.94); }
    .nav-btn:disabled { opacity: 0.35; }

    /* Un mosaico por día: se tiñe al registrar el peso y hoy lleva el borde de color. */
    .days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: var(--space-2); }
    .day { display: grid; justify-items: center; gap: 2px; padding: var(--space-3) var(--space-2); border: 2px solid transparent; border-radius: var(--radius-md); background: var(--color-background); transition: background-color var(--duration); }
    .day__name { font-size: 0.68rem; font-weight: 700; letter-spacing: var(--tracking-wider); text-transform: uppercase; color: var(--color-text-muted); }
    .day__date { font-size: var(--text-lg); font-weight: 700; line-height: 1.1; }
    .day__input { width: 100%; min-height: 2.4rem; margin-top: var(--space-1); padding: 0.2rem; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); font-size: 1rem; font-weight: 700; text-align: center; font-variant-numeric: tabular-nums; }
    .day__input:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-soft); }
    .day.is-filled { background: var(--tone-emerald-soft); }
    .day.is-filled .day__name { color: var(--tone-emerald-ink); }
    .day.is-today { border-color: var(--color-primary); }
    .day.is-future { opacity: 0.5; }

    .boxes { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 170px), 1fr)); gap: var(--space-2); margin-top: var(--space-4); }
    .box { display: grid; gap: 2px; padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); background: var(--tone-soft); }
    .box span { font-size: var(--text-xs); font-weight: 700; color: var(--tone-ink); }
    .box b { font-size: var(--text-xl); font-variant-numeric: tabular-nums; }
    .box small { font-size: 0.6em; color: var(--color-text-muted); }
    .table-top { margin-top: var(--space-4); }

    @media (hover: hover) and (pointer: fine) { .nav-btn:not(:disabled):hover { background: var(--color-primary-soft); color: var(--color-primary); } }
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

  /** Promedio y cambio de la semana que se está viendo. */
  protected readonly current = computed(() => {
    const week = this.weeks().find((item) => item.start === this.weekStart());
    return { average: week?.average ?? null, changeKg: week?.changeKg ?? null };
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
