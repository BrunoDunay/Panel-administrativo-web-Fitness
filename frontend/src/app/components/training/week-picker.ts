import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/** Con más semanas que estas, el menú deja de mostrarlas todas y pasa a ventana + selector. */
const ALL_AT_ONCE = 6;
const WINDOW = 5;

/**
 * Selector de semana del plan. Con pocas semanas las muestra todas; con muchas (un cliente de un año
 * lleva más de cincuenta) enseña solo las vecinas de la elegida, flechas para avanzar y un selector
 * para saltar a cualquiera, de modo que nunca haya que desplazarse de lado.
 */
@Component({
  selector: 'app-week-picker',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (compact()) {
      <button type="button" class="arrow" (click)="step(-1)" [disabled]="index() <= 0" aria-label="Semana anterior"><app-icon name="arrowLeft" [size]="18" /></button>
    }
    <div class="weeks" role="tablist" aria-label="Semana">
      @for (item of visible(); track item.id) {
        <button type="button" class="week" role="tab" [attr.aria-selected]="item.id === selected()" (click)="pick.emit(item.id)">
          <small>Semana</small><b>{{ item.number }}</b>
        </button>
      }
    </div>
    @if (compact()) {
      <button type="button" class="arrow" (click)="step(1)" [disabled]="index() >= weeks().length - 1" aria-label="Semana siguiente"><app-icon name="arrowRight" [size]="18" /></button>
      <label class="jump">
        <span class="visually-hidden">Ir a la semana</span>
        <select (change)="pick.emit($any($event.target).value)">
          @for (item of weeks(); track item.id) {
            <option [value]="item.id" [selected]="item.id === selected()">Semana {{ item.number }} de {{ weeks().length }}</option>
          }
        </select>
      </label>
    }
    <ng-content />
  `,
  styles: `
    :host { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); min-width: 0; }
    .weeks { display: flex; gap: var(--space-2); min-width: 0; }
    .week {
      display: grid; justify-items: center; align-content: center; flex: none;
      min-width: 4.25rem; min-height: 3.25rem; padding: 0.3rem 0.75rem;
      border: 0; border-radius: var(--radius-md); background: var(--color-surface-alt); color: var(--color-text-muted);
      line-height: 1.1;
      transition: background-color var(--duration) var(--ease-out), color var(--duration-fast), transform var(--duration-fast) var(--ease-out), box-shadow var(--duration) var(--ease-out);
    }
    .week small { font-family: var(--font-mono); font-size: 0.62rem; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; }
    .week b { font-family: var(--font-mono); font-size: var(--text-lg); font-weight: 600; letter-spacing: -0.04em; }
    .week:active { transform: scale(0.95); }
    .week[aria-selected='true'] { background: var(--color-primary); color: var(--color-text-inverse); box-shadow: var(--shadow-md); animation: settle 380ms var(--ease-spring); }
    @keyframes settle { from { transform: scale(0.9); } }
    .arrow { display: grid; place-items: center; flex: none; width: 2.75rem; height: 2.75rem; border: 1px solid var(--color-border-strong); border-radius: 50%; background: var(--color-surface); transition: transform var(--duration-fast) var(--ease-out), border-color var(--duration-fast), color var(--duration-fast); }
    .arrow:active { transform: scale(0.92); }
    .arrow:disabled { opacity: 0.35; pointer-events: none; }
    .jump select { min-height: 2.75rem; padding: 0 2rem 0 0.9rem; border: 1px solid var(--color-border-strong); border-radius: var(--radius-pill); background: var(--color-surface); font-size: 1rem; }
    @media (hover: hover) and (pointer: fine) {
      .week:not([aria-selected='true']):hover { color: var(--color-text); background: var(--color-border); }
      .arrow:hover { border-color: var(--color-primary); color: var(--color-primary); }
    }
    /* Teléfono con muchas semanas: flechas a los lados, la semana elegida al centro y el selector abajo. */
    @media (max-width: 560px) {
      :host(.is-compact) .weeks { flex: 1; justify-content: center; }
      :host(.is-compact) .week:not([aria-selected='true']) { display: none; }
      :host(.is-compact) .week { flex: 1; }
      .jump { flex: 1 1 100%; }
      .jump select { width: 100%; }
    }
    /* Rediseño: semana elegida con degradado */
    .week { background: var(--color-surface); box-shadow: inset 0 0 0 1px var(--color-border-strong); }
    .week[aria-selected='true'] { background: var(--gradient-emerald); color: #ffffff; box-shadow: 0 10px 22px -12px var(--color-primary), inset 0 1px 0 rgba(255, 255, 255, 0.22); }
  `,
  host: { '[class.is-compact]': 'compact()' },
})
export class WeekPicker {
  readonly weeks = input.required<{ id: string; number: number }[]>();
  readonly selected = input<string | null>(null);
  readonly pick = output<string>();

  protected readonly compact = computed(() => this.weeks().length > ALL_AT_ONCE);
  protected readonly index = computed(() => {
    const found = this.weeks().findIndex((week) => week.id === this.selected());
    return found < 0 ? this.weeks().length - 1 : found;
  });
  /** Todas, o una ventana alrededor de la elegida (pegada a los extremos cuando toca). */
  protected readonly visible = computed(() => {
    const weeks = this.weeks();
    if (!this.compact()) return weeks;
    const start = Math.min(Math.max(this.index() - Math.floor(WINDOW / 2), 0), weeks.length - WINDOW);
    return weeks.slice(start, start + WINDOW);
  });

  protected step(delta: number): void {
    const target = this.weeks()[this.index() + delta];
    if (target) this.pick.emit(target.id);
  }
}
