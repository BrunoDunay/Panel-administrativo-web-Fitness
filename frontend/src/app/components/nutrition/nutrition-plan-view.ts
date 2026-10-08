import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { DayKind, MealItemAmounts, NutritionComputed } from '../../core/types/nutrition.model';
import { formatNumber, formatPercent, formatSigned } from '../../core/utils/format';
import { foodEmoji, supplementEmoji } from '../../core/utils/visuals';

/**
 * Plan de alimentación ya calculado: resumen del día, comidas con gramos y cambios,
 * intra-entreno, lista del súper, hidratación y suplementos. Solo lectura.
 */
@Component({
  selector: 'app-nutrition-plan-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = computed();
    @let target = c.cycle[kind()];
    @let totals = c.dayTotals[kind()];

    <div class="row row--between no-print">
      <div class="tabs tabs--solid" role="tablist" aria-label="Tipo de día">
        <button type="button" class="tab" role="tab" [attr.aria-selected]="kind() === 'training'" (click)="kind.set('training')">Día de entreno</button>
        <button type="button" class="tab" role="tab" [attr.aria-selected]="kind() === 'rest'" (click)="kind.set('rest')">Día de descanso</button>
      </div>
      <p class="card__hint">{{ dayNote() }}</p>
    </div>

    <section class="card card--vivid tone--emerald summary">
      <div class="stat">
        <span class="stat__label">Calorías del día</span>
        <span class="stat__value big">{{ num(target.kcal, 0) }}<small> kcal</small></span>
        <span class="stat__note">Plan: {{ num(totals.kcal, 0) }} kcal</span>
      </div>
      @for (macro of macros(); track macro.label) {
        <div class="stat">
          <span class="stat__label">{{ macro.label }}</span>
          <span class="stat__value">{{ num(macro.target, 0) }}<small> g</small></span>
          <div class="meter"><span [style.width.%]="macro.pct"></span></div>
          <span class="stat__note">Plan: {{ num(macro.plan, 0) }} g</span>
        </div>
      }
    </section>

    <p class="notice" [class.notice--warning]="totals.fiberG < totals.fiberGoalG" [class.notice--success]="totals.fiberG >= totals.fiberGoalG">
      Fibra del día: {{ num(totals.fiberG, 0) }} g · meta {{ totals.fiberGoalG }} g (14 g por cada 1,000 kcal).
      {{ totals.fiberG < totals.fiberGoalG ? 'Falta fibra: sube verduras, fruta, leguminosas o cereales integrales.' : 'Fibra suficiente.' }}
      @if (c.vegetableProteinTarget !== null && totals.vegetableProteinPct !== null) {
        Proteína vegetal: {{ pct(totals.vegetableProteinPct) }} (meta {{ pct(c.vegetableProteinTarget) }}).
      }
    </p>

    <div class="meals">
      @for (meal of c.meals; track meal.number) {
        <article class="card meal">
          <header class="meal__head">
            <div>
              <h3>{{ meal.name }}</h3>
              <p class="text-muted">{{ meal.time }} @if (meal.moment) { · <span class="badge badge--success">{{ meal.moment }} entreno</span> }</p>
            </div>
            <p class="meal__kcal">{{ num(meal.totals[kind()].kcal, 0) }} <small>kcal</small></p>
          </header>
          @if (meal.items.length) {
            <ul class="items">
              @for (item of meal.items; track item.slot) {
                @if (grams(item) > 0) {
                  <li>
                    <div class="item">
                      <span [class]="'thumb thumb--sm tone--' + slotTone(item.slot)">{{ emoji(item.name, item.icon) }}</span>
                      <span class="item__name">{{ item.name }}<small>{{ item.label }}</small></span>
                      <span class="item__amount">{{ grams(item) }} g<small>{{ measure(item) }}</small></span>
                    </div>
                    @if (item.swaps.length) {
                      <p class="swaps">
                        <span>Puedes cambiarlo por:</span>
                        @for (swap of item.swaps; track swap.foodId) {
                          <span class="badge">{{ swap.name }} · {{ grams(swap) }} g @if (measure(swap)) { ({{ measure(swap) }}) }</span>
                        }
                      </p>
                    }
                  </li>
                }
              }
            </ul>
          } @else {
            <p class="text-muted">Sin alimentos elegidos todavía.</p>
          }
          <footer class="meal__foot">
            P {{ num(meal.totals[kind()].proteinG, 0) }} · C {{ num(meal.totals[kind()].carbsG, 0) }} · G {{ num(meal.totals[kind()].fatG, 0) }}
            <span class="text-muted">(meta P {{ num(meal.target[kind()].proteinG, 0) }} · C {{ num(meal.target[kind()].carbsG, 0) }} · G {{ num(meal.target[kind()].fatG, 0) }})</span>
          </footer>
        </article>
      }
    </div>

    @if (c.intra && kind() === 'training') {
      <section class="card card--tint tone--teal intra">
        <div>
          <p class="eyebrow">Intra-entreno · solo días de entreno</p>
          <strong>{{ c.intra.name }}</strong>
          <p class="text-muted">Aporta {{ c.intra.carbsG }} g de carbohidratos. Ya están descontados de las comidas, así el total del día no cambia.</p>
        </div>
        <p class="meal__kcal">{{ c.intra.amount }} <small>{{ c.intra.unit }}</small></p>
      </section>
    }

    <div class="grid grid--2">
      <section class="card">
        <header class="card__head">
          <h3 class="card__title">Lista del súper</h3>
          <label class="row weeks no-print">
            <span class="card__hint">Semanas</span>
            <select class="cell-input" [value]="weeks()" (change)="weeks.set(+$any($event.target).value)">
              @for (n of [1, 2, 3, 4]; track n) {
                <option [value]="n">{{ n }}</option>
              }
            </select>
          </label>
        </header>
        @if (c.grocery.length) {
          <div class="table-wrap">
            <table class="table table--compact">
              <thead><tr><th>Alimento</th><th class="num">Cantidad</th><th>Medida aprox.</th></tr></thead>
              <tbody>
                @for (item of grocery(); track item.name) {
                  <tr><td><span class="grocery"><span class="thumb thumb--sm">{{ emoji(item.name, item.icon) }}</span>{{ item.name }}</span></td><td class="num"><b>{{ item.amount }}</b></td><td>{{ item.measure || '—' }}</td></tr>
                }
              </tbody>
            </table>
          </div>
          <p class="card__hint foot">Peso neto (lo que te comes, sin cáscara ni hueso).</p>
        } @else {
          <p class="text-muted">Se arma sola cuando el plan tenga alimentos.</p>
        }
      </section>

      <div class="stack">
        <section class="card">
          <h3 class="card__title head">Hidratación</h3>
          <dl class="dl">
            <dt>Día de descanso</dt><dd>{{ num(c.hydration.restDayL) }} L de agua</dd>
            <dt>Día de entreno</dt><dd>{{ num(c.hydration.trainingDayL) }} L de agua</dd>
            <dt>4 h antes de entrenar</dt><dd>{{ c.hydration.preWorkoutMl.min }} – {{ c.hydration.preWorkoutMl.max }} ml</dd>
            <dt>Durante</dt><dd>No perder más de {{ num(c.hydration.maxLossKg) }} kg</dd>
            <dt>Después</dt><dd>{{ c.hydration.perKgLostL.min }} – {{ c.hydration.perKgLostL.max }} L por cada kg perdido</dd>
          </dl>
        </section>

        <section class="card">
          <h3 class="card__title head">Objetivo</h3>
          <dl class="dl">
            <dt>Mantenimiento</dt><dd>{{ num(c.maintenanceKcal, 0) }} kcal/día</dd>
            <dt>Objetivo</dt><dd>{{ num(c.targetKcal, 0) }} kcal/día (promedio semanal)</dd>
            <dt>Cambio esperado</dt><dd>{{ signed(c.weeklyChangeKg, 2) }} kg por semana · {{ signed(c.fourWeekChangeKg) }} kg en 4 semanas</dd>
          </dl>
        </section>
      </div>
    </div>

    @if (c.supplements.length) {
      <section class="card">
        <h3 class="card__title head">Suplementación</h3>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Suplemento</th><th>Dosis asignada</th><th>Cuándo</th><th>Para qué</th></tr></thead>
            <tbody>
              @for (s of c.supplements; track s.supplementId) {
                <tr>
                  <td>
                    <span class="grocery"><span class="thumb thumb--sm tone--emerald">{{ supplement(s.name, s.icon) }}</span><strong>{{ s.name }}</strong></span>
                    @if (s.brand) { <br /><span class="text-muted">{{ s.brand }}</span> }
                    @if (s.link) { <br /><a class="link" [href]="s.link" target="_blank" rel="noopener noreferrer">Ver producto</a> }
                  </td>
                  <td>{{ s.assignedDose || s.recommendedDose || '—' }}</td>
                  <td>{{ s.timing || '—' }}</td>
                  <td>{{ s.purpose || '—' }} @if (s.precautions) { <br /><span class="text-muted">{{ s.precautions }}</span> }</td>
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
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-5); }
    .summary .meter { background: rgba(255, 255, 255, 0.14); }
    .summary .meter > span { background: var(--color-mint); }
    .big { font-size: var(--text-3xl); }
    .meals { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 330px), 1fr)); gap: var(--space-4); }
    .meal { display: grid; gap: var(--space-3); align-content: start; }
    .meal__head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); }
    .meal__head h3 { font-size: var(--text-lg); }
    .meal__head p { font-size: var(--text-sm); }
    .meal__kcal { font-size: var(--text-xl); font-weight: 700; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .meal__kcal small { font-size: var(--text-xs); font-weight: 600; color: var(--color-text-muted); }
    .items { display: grid; list-style: none; }
    .items li { padding: var(--space-2) 0; border-top: var(--hairline); }
    .item { display: flex; align-items: center; gap: var(--space-3); }
    .item small { display: block; font-size: var(--text-xs); font-weight: 400; color: var(--color-text-muted); }
    .item__name { flex: 1; min-width: 0; font-weight: 700; }
    .item__amount { font-weight: 700; text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .swaps { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1) var(--space-2); margin-top: var(--space-2); font-size: var(--text-xs); color: var(--color-text-muted); }
    .swaps .badge { white-space: normal; }
    .meal__foot { padding-top: var(--space-2); border-top: var(--hairline); font-size: var(--text-sm); font-weight: 600; font-variant-numeric: tabular-nums; }
    .meal__foot span { display: block; font-size: var(--text-xs); font-weight: 400; }
    .intra { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); }
    .intra p { font-size: var(--text-sm); }
    .head { margin-bottom: var(--space-3); }
    .foot { margin-top: var(--space-3); }
    .weeks select { width: 4rem; }
    .grocery { display: inline-flex; align-items: center; gap: var(--space-3); }
    .link { font-weight: 600; color: var(--color-primary); text-decoration: underline; }
  `,
})
export class NutritionPlanView {
  readonly computed = input.required<NutritionComputed>();
  protected readonly kind = signal<DayKind>('training');
  protected readonly weeks = signal(1);
  protected readonly num = formatNumber;
  protected readonly pct = formatPercent;
  protected readonly signed = formatSigned;
  protected readonly emoji = foodEmoji;
  protected readonly supplement = supplementEmoji;

  protected slotTone(slot: string): string {
    return slot.startsWith('protein') ? 'coral' : slot === 'fat' ? 'amber' : slot === 'vegetable' ? 'emerald' : 'steel';
  }

  protected readonly macros = computed(() => {
    const target = this.computed().cycle[this.kind()];
    const totals = this.computed().dayTotals[this.kind()];
    const row = (label: string, goal: number, plan: number) => ({ label, target: goal, plan, pct: goal ? Math.min(100, (plan / goal) * 100) : 0 });
    return [row('Proteína', target.proteinG, totals.proteinG), row('Carbohidratos', target.carbsG, totals.carbsG), row('Grasa', target.fatG, totals.fatG)];
  });

  protected readonly dayNote = computed(() => {
    const { training, rest, trainingDays, restDays } = this.computed().cycle;
    if (training.kcal === rest.kcal && !this.computed().intra) return 'Con tu configuración, el día de entreno y el de descanso son iguales.';
    return `${trainingDays} días de entreno y ${restDays} de descanso por semana. Proteína y grasa son iguales los dos días: solo cambian los carbos.`;
  });

  protected readonly grocery = computed(() =>
    this.computed().grocery.map((item) => {
      const grams = item.grams * this.weeks();
      return { name: item.name, icon: item.icon, amount: grams >= 1000 ? `${formatNumber(grams / 1000, 2)} kg` : `${formatNumber(grams, 0)} g`, measure: this.weeks() === 1 ? item.measure : '' };
    }),
  );

  protected grams(item: MealItemAmounts): number {
    return this.kind() === 'training' ? item.trainingGrams : item.restGrams;
  }

  protected measure(item: MealItemAmounts): string {
    return this.kind() === 'training' ? item.trainingMeasure : item.restMeasure;
  }
}
