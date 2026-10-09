import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, output, signal } from '@angular/core';
import { Food } from '../../core/types/catalog.model';
import { foodEmoji } from '../../core/utils/visuals';

export type OptionState = 'ok' | 'high';

/**
 * Selector de alimento con apoyo visual: cada opción lleva su ícono y una barra de color a la
 * derecha (verde = cabe en la comida, rojo = la haría pasarse de su meta). Los colores se piden
 * al abrir (`opened`) porque dependen de lo que ya está elegido en la comida.
 */
@Component({
  selector: 'app-food-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close()', '(window:scroll)': 'close()', '(window:resize)': 'close()' },
  template: `
    <button type="button" class="trigger" (click)="toggle()" aria-haspopup="listbox" [attr.aria-expanded]="open()" [attr.aria-label]="label()">
      @if (selected(); as food) {
        <span class="emoji" aria-hidden="true">{{ emoji(food) }}</span><span class="name">{{ food.name }}</span>
      } @else {
        <span class="name muted">—</span>
      }
      <span class="caret" aria-hidden="true">▾</span>
    </button>

    @if (open()) {
      <div class="backdrop" (click)="close()"></div>
      <div class="panel" role="listbox" [attr.aria-label]="label()" [style.top.px]="box().top" [style.left.px]="box().left" [style.width.px]="box().width" [style.max-height.px]="box().height">
        <input class="search" type="search" placeholder="Buscar alimento" autocomplete="off" [value]="term()" (input)="term.set($any($event.target).value)" />
        <ul>
          <li><button type="button" class="option" role="option" [attr.aria-selected]="value() === null" (click)="pick(null)"><span class="emoji" aria-hidden="true">✕</span><span class="name muted">Ninguno</span></button></li>
          @for (food of filtered(); track food.id) {
            @let state = states()?.[food.id];
            <li>
              <button type="button" class="option" role="option" [attr.aria-selected]="food.id === value()" [class.is-ok]="state === 'ok'" [class.is-high]="state === 'high'" (click)="pick(food.id)">
                <span class="emoji" aria-hidden="true">{{ emoji(food) }}</span>
                <span class="name">{{ food.name }}</span>
                @if (state === 'high') { <small>se pasa</small> }
              </button>
            </li>
          } @empty {
            <li class="none">Sin resultados</li>
          }
        </ul>
        <p class="legend"><span><i class="ok"></i>Cabe en la comida</span><span><i class="high"></i>Se pasa del margen (5 %)</span></p>
      </div>
    }
  `,
  styles: `
    :host { display: block; min-width: 13rem; }
    .trigger { display: flex; align-items: center; gap: var(--space-2); width: 100%; min-height: 2.2rem; padding: 0.25rem 0.5rem; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); font-size: var(--text-sm); text-align: left; }
    .trigger:focus-visible, .trigger[aria-expanded='true'] { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-soft); }
    .emoji { flex: none; width: 1.3rem; font-size: 1rem; line-height: 1; text-align: center; }
    .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .muted { color: var(--color-text-muted); }
    .caret { flex: none; font-size: 0.7rem; color: var(--color-text-muted); }

    .backdrop { position: fixed; inset: 0; z-index: var(--z-modal); }
    .panel { position: fixed; z-index: calc(var(--z-modal) + 1); display: grid; grid-template-rows: auto minmax(0, 1fr) auto; border-radius: var(--radius-md); background: var(--color-surface); box-shadow: var(--shadow-lg); overflow: hidden; animation: pop 140ms var(--ease-out); }
    @keyframes pop { from { opacity: 0; transform: scale(0.97); } }
    .search { margin: var(--space-2); min-height: 2.3rem; padding: 0.3rem 0.6rem; border: 1px solid var(--color-border-strong); border-radius: var(--radius-sm); font-size: 1rem; }
    .search:focus { outline: none; border-color: var(--color-primary); }
    ul { margin: 0; padding: 0 var(--space-2) var(--space-2); list-style: none; overflow-y: auto; }
    .option { display: flex; align-items: center; gap: var(--space-2); width: 100%; min-height: 2.3rem; margin-bottom: 2px; padding: 0.25rem 0.5rem; border: 0; border-right: 6px solid var(--color-border); border-radius: var(--radius-sm); background: transparent; font-size: var(--text-sm); text-align: left; }
    .option small { flex: none; font-size: 0.68rem; font-weight: 700; color: var(--color-danger); }
    /* La barra de la derecha dice si el alimento cabe en la comida. */
    .option.is-ok { border-right-color: var(--color-success); }
    .option.is-high { border-right-color: var(--color-danger); }
    .option[aria-selected='true'] { background: var(--color-primary-soft); font-weight: 700; }
    .none { padding: var(--space-3); font-size: var(--text-sm); color: var(--color-text-muted); }
    .legend { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-4); margin: 0; padding: var(--space-2) var(--space-3); border-top: var(--hairline); font-size: var(--text-xs); color: var(--color-text-muted); }
    .legend span { display: inline-flex; align-items: center; gap: var(--space-1); }
    .legend i { width: 0.4rem; height: 0.9rem; border-radius: 2px; }
    .legend .ok { background: var(--color-success); }
    .legend .high { background: var(--color-danger); }
    @media (hover: hover) and (pointer: fine) { .option:hover { background: var(--color-background); } }
  `,
})
export class FoodPicker {
  readonly foods = input.required<Food[]>();
  readonly value = input<number | null>(null);
  /** Estado de cada alimento candidato; null mientras se calcula. */
  readonly states = input<Record<number, OptionState> | null | undefined>(null);
  readonly label = input('Alimento');
  readonly valueChange = output<number | null>();
  readonly opened = output<void>();

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  protected readonly open = signal(false);
  protected readonly term = signal('');
  protected readonly box = signal({ top: 0, left: 0, width: 300, height: 360 });
  protected readonly selected = computed(() => this.foods().find((food) => food.id === this.value()) ?? null);
  protected readonly filtered = computed(() => {
    const term = this.term().trim().toLowerCase();
    return term ? this.foods().filter((food) => food.name.toLowerCase().includes(term)) : this.foods();
  });

  protected emoji(food: Food): string {
    return foodEmoji(food.name, food.icon);
  }

  protected toggle(): void {
    if (this.open()) return this.close();
    // La lista se ancla al botón: abajo si cabe, arriba si no.
    const rect = this.host.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 300), window.innerWidth - 16);
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const height = Math.min(380, Math.max(below, above));
    this.box.set({ top: below >= Math.min(260, above) ? rect.bottom + 4 : rect.top - height - 4, left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)), width, height });
    this.term.set('');
    this.open.set(true);
    this.opened.emit();
    setTimeout(() => this.host.querySelector<HTMLInputElement>('.search')?.focus());
  }

  protected close(): void {
    this.open.set(false);
  }

  protected pick(id: number | null): void {
    this.valueChange.emit(id);
    this.close();
  }
}
