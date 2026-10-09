import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { ComputedItem, EquivalentFood, NutritionComputed } from '../../core/types/nutrition.model';
import { formatNumber, formatSigned, portionAmount } from '../../core/utils/format';
import { foodEmoji, supplementEmoji } from '../../core/utils/visuals';
import { Icon } from '../icon/icon';

/** Renglón de una comida tal como se muestra: el alimento del plan o el que el cliente eligió en su lugar. */
interface ShownItem extends ComputedItem {
  /** Identifica el renglón para recordar el cambio. */
  key: string;
  swapped: boolean;
  canSwap: boolean;
}

const STORAGE_KEY = 'fbe.cambios';

/**
 * Plan de alimentación ya calculado: el menú de cada día por comida, con la cantidad de cada
 * alimento, sus notas y los alimentos adicionales. Al tocar un alimento se puede cambiar por otro
 * equivalente del mismo grupo: la cantidad se recalcula con las mismas porciones.
 */
@Component({
  selector: 'app-nutrition-plan-view',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'swapping.set(null)' },
  template: `
    @let c = computed();

    <section class="card card--vivid tone--emerald summary">
      <div class="stat">
        <span class="stat__label">Tu menú de cada día</span>
        <span class="stat__value big">{{ num(c.diet.totals.kcal, 0) }}<small> kcal</small></span>
        <span class="stat__note">Objetivo: {{ num(c.targetKcal, 0) }} kcal</span>
      </div>
      @for (macro of macros(); track macro.label) {
        <div class="stat">
          <span class="stat__label">{{ macro.label }}</span>
          <span class="stat__value">{{ num(macro.plan, 0) }}<small> g</small></span>
          <div class="meter"><span [style.width.%]="macro.pct"></span></div>
          <span class="stat__note">Objetivo: {{ num(macro.target, 0) }} g</span>
        </div>
      }
    </section>

    @if (canSwap()) {
      <p class="notice"><app-icon name="swap" [size]="18" /><span>¿No tienes algún alimento? <b>Tócalo</b> y elige otro del mismo grupo: te damos la cantidad equivalente para que tu plan no cambie.</span></p>
    }

    <div class="meals">
      @for (meal of meals(); track meal.number) {
        <article class="card meal">
          <header class="meal__head">
            <div>
              <h3>{{ meal.name }}</h3>
              @if (meal.time) { <p class="text-muted">{{ meal.time }}</p> }
            </div>
            @if (meal.kcal) { <p class="meal__kcal">{{ num(meal.kcal, 0) }} <small>kcal</small></p> }
          </header>

          @if (meal.items.length) {
            <ul class="items">
              @for (item of meal.items; track item.key) {
                <li>
                  <button type="button" class="item" [class.is-swapped]="item.swapped" [disabled]="!item.canSwap" (click)="swapping.set(item)" [attr.aria-label]="item.canSwap ? 'Cambiar ' + item.name + ' por un alimento equivalente' : null">
                    <span [class]="'thumb thumb--sm tone--' + item.tone">{{ emoji(item.name, item.icon) }}</span>
                    <span class="item__name">{{ item.name }}<small>{{ num(item.portions) }} {{ item.portions === 1 ? 'porción' : 'porciones' }} · {{ item.groupLabel }}@if (item.swapped) { · <b>cambiado por ti</b> }</small></span>
                    <span class="item__amount">{{ item.grams }} g<small>{{ item.measure }}</small></span>
                    @if (item.canSwap) { <app-icon class="item__swap" name="swap" [size]="16" /> }
                  </button>
                </li>
              }
            </ul>
          } @else {
            <p class="text-muted">Tu coach todavía no elige los alimentos de esta comida.</p>
          }

          @if (meal.extras.length) {
            <div class="extras">
              <p class="extras__title">Adicional</p>
              @for (extra of meal.extras; track extra.foodId) {
                <div class="item item--static">
                  <span class="thumb thumb--sm">{{ emoji(extra.name, extra.icon) }}</span>
                  <span class="item__name">{{ extra.name }}@if (extra.note) { <small><span class="badge badge--steel">{{ extra.note }}</span></small> }</span>
                  <span class="item__amount">{{ extra.grams }} g<small>{{ extra.measure }}</small></span>
                </div>
              }
            </div>
          }

          @if (meal.notes) {
            <details class="details prep">
              <summary>Cómo prepararlo</summary>
              <p class="details__body">{{ meal.notes }}</p>
            </details>
          }
        </article>
      }
    </div>

    @if (c.intra) {
      <section class="card card--tint tone--teal intra">
        <div>
          <p class="eyebrow">Intra-entreno · solo días de entreno</p>
          <strong>{{ c.intra.name }}</strong>
          <p class="text-muted">Tómalo durante el entrenamiento: aporta {{ c.intra.carbsG }} g de carbohidratos.</p>
        </div>
        <p class="meal__kcal">{{ c.intra.amount }} <small>{{ c.intra.unit }}</small></p>
      </section>
    }

    <div class="grid grid--2">
      <section class="card">
        <header class="card__head">
          <h3 class="card__title">Lista del súper</h3>
          <label class="row weeks">
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
          <p class="card__hint foot">Con los alimentos de tu plan original, en peso neto (sin cáscara ni hueso). Los adicionales no se incluyen.</p>
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
            <dt>Objetivo</dt><dd>{{ num(c.targetKcal, 0) }} kcal/día</dd>
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

    <!-- Alimentos equivalentes: mismas porciones, otro alimento del grupo. -->
    @if (swapping(); as item) {
      <div class="modal-backdrop" (click)="swapping.set(null)"></div>
      <div class="modal fade-up swap" role="dialog" aria-modal="true" aria-labelledby="swap-title">
        <header class="modal__head">
          <span [class]="'thumb tone--' + item.tone">{{ emoji(item.name, item.icon) }}</span>
          <div>
            <h2 id="swap-title">Cambiar {{ item.name }}</h2>
            <p class="card__hint">{{ num(item.portions) }} {{ item.portions === 1 ? 'porción' : 'porciones' }} de {{ item.groupLabel }}. Cualquiera de estos equivale a lo mismo:</p>
          </div>
        </header>
        <ul class="options">
          @for (option of options(); track option.foodId) {
            <li>
              <button type="button" class="option" [class.is-current]="option.foodId === item.foodId" (click)="choose(item, option.foodId)">
                <span class="thumb thumb--sm">{{ emoji(option.name, option.icon) }}</span>
                <span class="item__name">{{ option.name }}@if (option.original) { <small>el de tu plan</small> }</span>
                <span class="item__amount">{{ option.grams }} g<small>{{ option.measure }}</small></span>
              </button>
            </li>
          }
        </ul>
        <p class="card__hint">El cambio es solo en este dispositivo, para tu referencia: el plan de tu coach no se modifica.</p>
        <button type="button" class="close" (click)="swapping.set(null)">Cerrar</button>
      </div>
    }
  `,
  styles: `
    :host { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-5); }
    .summary .meter { background: rgba(255, 255, 255, 0.14); }
    .summary .meter > span { background: var(--color-mint); }
    .big { font-size: var(--text-3xl); }
    .notice { align-items: center; }
    .meals { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 330px), 1fr)); gap: var(--space-4); }
    .meal { display: grid; gap: var(--space-3); align-content: start; }
    .meal__head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); }
    .meal__head h3 { font-size: var(--text-lg); }
    .meal__head p { font-size: var(--text-sm); }
    .meal__kcal { font-size: var(--text-xl); font-weight: 700; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .meal__kcal small { font-size: var(--text-xs); font-weight: 600; color: var(--color-text-muted); }
    .items { display: grid; list-style: none; }
    .items li { border-top: var(--hairline); }
    .item { display: flex; align-items: center; gap: var(--space-3); width: 100%; padding: var(--space-2) var(--space-1); border: 0; border-radius: var(--radius-sm); background: transparent; text-align: left; color: inherit; transition: background-color var(--duration-fast), transform 140ms var(--ease-out); }
    button.item:not(:disabled):active { transform: scale(0.99); }
    button.item:disabled { cursor: default; opacity: 1; }
    .item.is-swapped { background: var(--tone-steel-soft); }
    .item small, .option small { display: block; font-size: var(--text-xs); font-weight: 400; color: var(--color-text-muted); }
    .item small b { color: var(--tone-steel-ink); }
    .item__name { flex: 1; min-width: 0; font-weight: 700; }
    .item__amount { font-weight: 700; text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .item__swap { flex: none; color: var(--color-text-muted); }
    .extras { display: grid; gap: var(--space-1); padding: var(--space-2) var(--space-3); border: 1px dashed var(--color-border-strong); border-radius: var(--radius-md); }
    .extras__title { font-size: var(--text-xs); font-weight: 700; letter-spacing: var(--tracking-wider); text-transform: uppercase; color: var(--color-text-muted); }
    .item--static { padding-inline: 0; }
    .item--static .badge { margin-top: 2px; white-space: normal; }
    .prep p { white-space: pre-line; }
    .intra { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); }
    .intra p { font-size: var(--text-sm); }
    .head { margin-bottom: var(--space-3); }
    .foot { margin-top: var(--space-3); }
    .weeks select { width: 4rem; }
    .grocery { display: inline-flex; align-items: center; gap: var(--space-3); }
    .link { font-weight: 600; color: var(--color-primary); text-decoration: underline; }

    .swap { gap: var(--space-3); }
    .options { display: grid; gap: 2px; max-height: 50dvh; margin: 0; padding: 0; list-style: none; overflow-y: auto; }
    .option { display: flex; align-items: center; gap: var(--space-3); width: 100%; padding: var(--space-2); border: 1px solid transparent; border-radius: var(--radius-sm); background: transparent; text-align: left; color: inherit; }
    .option.is-current { border-color: var(--color-primary); background: var(--color-primary-soft); }
    .close { justify-self: end; min-height: 2.4rem; padding: 0.3rem 1.2rem; border: 0; border-radius: var(--radius-pill); background: var(--color-surface-alt); font-size: var(--text-sm); font-weight: 600; }
    @media (hover: hover) and (pointer: fine) {
      button.item:not(:disabled):hover, .option:hover { background: var(--color-background); }
    }
  `,
})
export class NutritionPlanView {
  readonly computed = input.required<NutritionComputed>();
  protected readonly weeks = signal(1);
  protected readonly num = formatNumber;
  protected readonly signed = formatSigned;
  protected readonly emoji = foodEmoji;
  protected readonly supplement = supplementEmoji;

  /** Renglón cuyo cambio se está eligiendo. */
  protected readonly swapping = signal<ShownItem | null>(null);
  /** Cambios del cliente: renglón → alimento elegido. Se guardan en el dispositivo. */
  private readonly swaps = signal<Record<string, number>>(this.restore());

  /** El coach puede apagar los cambios: entonces no llegan equivalentes. */
  protected readonly canSwap = computed(() => Object.keys(this.computed().equivalents).length > 0);

  protected readonly macros = computed(() => {
    const { totals } = this.computed().diet;
    const ideal = this.computed().ideal;
    const row = (label: string, plan: number, target: number) => ({ label, plan, target, pct: target ? Math.min(100, (plan / target) * 100) : 0 });
    return [row('Proteína', totals.proteinG, ideal.proteinG), row('Carbohidratos', totals.carbsG, ideal.carbsG), row('Grasa', totals.fatG, ideal.fatG)];
  });

  /** Las comidas con los cambios del cliente aplicados; solo se muestran renglones con alimento. */
  protected readonly meals = computed(() => {
    const { meals, equivalents } = this.computed();
    const swaps = this.swaps();
    return meals.map((meal) => ({
      ...meal,
      items: meal.items
        .filter((item) => item.foodId)
        .map((item, index): ShownItem => {
          const key = `${meal.number}|${index}|${item.group}|${item.foodId}`;
          const options = equivalents[item.group] ?? [];
          const chosen = options.find((food) => food.foodId === swaps[key] && food.foodId !== item.foodId);
          const base = { ...item, key, canSwap: options.length > 1, swapped: false };
          return chosen ? { ...base, ...portionAmount(chosen, item.portions), foodId: chosen.foodId, name: chosen.name, icon: chosen.icon, swapped: true } : base;
        }),
    }));
  });

  /** Equivalentes del renglón que se está cambiando, ya con la cantidad para sus porciones. */
  protected readonly options = computed(() => {
    const item = this.swapping();
    if (!item) return [];
    const original = Number(item.key.split('|')[3]);
    return (this.computed().equivalents[item.group] ?? []).map((food: EquivalentFood) => ({ ...food, ...portionAmount(food, item.portions), original: food.foodId === original }));
  });

  protected readonly grocery = computed(() =>
    this.computed().grocery.map((item) => {
      const grams = item.grams * this.weeks();
      return { name: item.name, icon: item.icon, amount: grams >= 1000 ? `${formatNumber(grams / 1000, 2)} kg` : `${formatNumber(grams, 0)} g`, measure: this.weeks() === 1 ? item.measure : '' };
    }),
  );

  protected choose(item: ShownItem, foodId: number): void {
    const original = Number(item.key.split('|')[3]);
    const next = { ...this.swaps() };
    if (foodId === original) delete next[item.key];
    else next[item.key] = foodId;
    this.swaps.set(next);
    this.swapping.set(null);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Sin almacenamiento (modo privado): el cambio dura mientras la página siga abierta.
    }
  }

  private restore(): Record<string, number> {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, number>;
    } catch {
      return {};
    }
  }
}
