import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Btn } from '../../../components/buttons/btn';
import { Icon, IconName } from '../../../components/icon/icon';
import { PanelApi } from '../../../core/services/api/panel-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { CatalogResource } from '../../../core/types/catalog.model';
import { ApiError } from '../../../core/types/common.model';
import { Tone } from '../../../core/utils/visuals';
import { ConfirmService } from '../shared/confirm.service';

export interface CrudField {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'textarea' | 'select' | 'checkbox' | 'url';
  options?: string[];
  step?: number;
  /** Ocupa todo el ancho del formulario. */
  wide?: boolean;
  hint?: string;
}

export interface CrudColumn {
  key: string;
  label: string;
  numeric?: boolean;
  /** Muestra el valor como etiqueta del color que devuelva. */
  tone?: (value: unknown, row: Row) => Tone;
  /** Barra con la proporción de calorías de proteína, carbos y grasa de la fila. */
  macros?: boolean;
  /** Texto secundario bajo el valor (otra columna de la fila). */
  sub?: (row: Row) => string;
}

/** Miniatura de la fila: un emoji o un ícono sobre el color de su tipo. */
export interface RowVisual {
  emoji?: string;
  icon?: IconName;
  tone: Tone;
}

export type Row = Record<string, unknown> & { id?: number };

/** Tabla con búsqueda y formulario para un catálogo (alimentos, suplementos, protocolos). */
@Component({
  selector: 'app-catalog-crud',
  imports: [FormsModule, Btn, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar no-print">
      <label class="search">
        <app-icon name="search" [size]="18" />
        <span class="visually-hidden">Buscar</span>
        <input type="search" placeholder="Buscar" [value]="search()" (input)="search.set($any($event.target).value)" />
      </label>
      <span class="card__hint"><b>{{ filtered().length }}</b> de {{ items().length }}</span>
      <button appBtn type="button" (click)="start()"><app-icon name="plus" [size]="18" />{{ addLabel() }}</button>
    </div>

    @if (filterOptions().length > 1) {
      <div class="chips no-print" role="group" [attr.aria-label]="'Filtrar por ' + filterLabel()">
        <button type="button" class="chip" [attr.aria-pressed]="filter() === null" (click)="filter.set(null)">Todos</button>
        @for (option of filterOptions(); track option) {
          <button type="button" class="chip" [attr.aria-pressed]="filter() === option" (click)="filter.set(option)">{{ option }}</button>
        }
      </div>
    }

    @if (editing(); as row) {
      <form class="card editor" (ngSubmit)="save()" novalidate>
        <h3 class="card__title">{{ row.id ? 'Editar' : addLabel() }}</h3>
        <div class="form-grid">
          @for (field of fields(); track field.key) {
            @if (field.type === 'checkbox') {
              <label class="check"><input type="checkbox" [name]="field.key" [(ngModel)]="row[field.key]" />{{ field.label }}</label>
            } @else {
              <label class="field" [class.span-all]="field.wide">
                <span class="field__label">{{ field.label }}</span>
                @switch (field.type) {
                  @case ('textarea') { <textarea class="field__control" [name]="field.key" [(ngModel)]="row[field.key]"></textarea> }
                  @case ('select') {
                    <select class="field__control" [name]="field.key" [(ngModel)]="row[field.key]">
                      <option [ngValue]="null">—</option>
                      @for (option of field.options; track option) { <option [value]="option">{{ option }}</option> }
                    </select>
                  }
                  @case ('number') { <input class="field__control" type="number" inputmode="decimal" [step]="field.step ?? 'any'" [name]="field.key" [(ngModel)]="row[field.key]" [attr.aria-invalid]="!!errors()[field.key]" /> }
                  @default { <input class="field__control" [type]="field.type === 'url' ? 'url' : 'text'" [name]="field.key" [(ngModel)]="row[field.key]" [attr.aria-invalid]="!!errors()[field.key]" /> }
                }
                @if (errors()[field.key]) { <span class="field__error">{{ errors()[field.key] }}</span> } @else if (field.hint) { <span class="field__hint">{{ field.hint }}</span> }
              </label>
            }
          }
        </div>
        <div class="row">
          <button appBtn type="submit" [loading]="saving()" [disabled]="saving()">Guardar</button>
          <button appBtn type="button" variant="ghost" (click)="editing.set(null)">Cancelar</button>
        </div>
      </form>
    }

    <div class="card card--flush">
      <div class="table-wrap">
        <table class="table table--hover">
          <thead>
            <tr>
              @for (column of columns(); track column.key) { <th [class.num]="column.numeric">{{ column.label }}</th> }
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (row of filtered(); track row.id) {
              <tr>
                @for (column of columns(); track column.key; let first = $first) {
                  <td [class.num]="column.numeric">
                    @if (first && visual(); as getVisual) {
                      @let v = getVisual(row);
                      <span class="lead">
                        <span class="thumb" [class]="'thumb tone--' + v.tone">@if (v.icon) { <app-icon [name]="v.icon" [size]="22" /> } @else { {{ v.emoji }} }</span>
                        <span class="lead__text">{{ display(row[column.key]) }}@if (column.sub) { <small>{{ column.sub(row) }}</small> }</span>
                      </span>
                    } @else if (column.macros) {
                      @let m = macroShares(row);
                      <span class="macro-bar" [title]="m.title"><span class="is-protein" [style.flex]="m.protein"></span><span class="is-carbs" [style.flex]="m.carbs"></span><span class="is-fat" [style.flex]="m.fat"></span></span>
                    } @else if (column.tone && row[column.key]) {
                      <span [class]="'badge badge--tone tone--' + column.tone(row[column.key], row)">{{ display(row[column.key]) }}</span>
                    } @else {
                      {{ display(row[column.key]) }}
                    }
                  </td>
                }
                <td class="row-actions">
                  <button type="button" class="icon-btn" (click)="edit(row)" [attr.aria-label]="'Editar ' + row['name']"><app-icon name="edit" [size]="16" /></button>
                  <button type="button" class="icon-btn icon-btn--danger" (click)="remove(row)" [attr.aria-label]="'Eliminar ' + row['name']"><app-icon name="trash" [size]="16" /></button>
                </td>
              </tr>
            } @empty {
              <tr><td [attr.colspan]="columns().length + 1" class="text-muted">Sin resultados.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: `
    :host { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
    .toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
    .search { display: flex; align-items: center; gap: var(--space-2); flex: 1; max-width: 360px; min-height: 2.75rem; padding: 0 var(--space-4); border-radius: var(--radius-pill); background: var(--color-surface); box-shadow: var(--shadow-sm); color: var(--color-text-muted); }
    .search input { flex: 1; min-width: 0; border: 0; background: none; font-size: 1rem; color: var(--color-text); }
    .search input:focus { outline: none; }
    .search:focus-within { box-shadow: 0 0 0 3px var(--color-primary-soft); }
    .toolbar button { margin-left: auto; }
    .editor { display: grid; gap: var(--space-4); }
    .lead { display: flex; align-items: center; gap: var(--space-3); min-width: 14rem; }
    .lead__text { display: grid; line-height: 1.3; }
    .lead__text small { display: -webkit-box; max-width: 30rem; overflow: hidden; -webkit-line-clamp: 2; -webkit-box-orient: vertical; font-size: var(--text-xs); font-weight: 400; color: var(--color-text-muted); }
    .legend { display: flex; flex-wrap: wrap; gap: var(--space-4); font-size: var(--text-xs); color: var(--color-text-muted); }
    .legend span { display: inline-flex; align-items: center; gap: var(--space-2); }
    .row-actions { white-space: nowrap; text-align: right; }
    .icon-btn { display: inline-grid; place-items: center; width: 2.2rem; height: 2.2rem; border: 0; border-radius: 50%; background: transparent; color: var(--color-text-muted); }
    @media (hover: hover) and (pointer: fine) {
      .icon-btn:hover { background: var(--color-surface-alt); color: var(--color-text); }
      .icon-btn--danger:hover { background: var(--color-danger-soft); color: var(--color-danger); }
    }
  `,
})
export class CatalogCrud {
  private readonly api = inject(PanelApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly resource = input.required<CatalogResource>();
  readonly items = input.required<Row[]>();
  readonly columns = input.required<CrudColumn[]>();
  readonly fields = input.required<CrudField[]>();
  readonly addLabel = input('Agregar');
  readonly visual = input<((row: Row) => RowVisual) | null>(null);
  /** Columna por la que se puede filtrar con botones (por ejemplo, el grupo). */
  readonly filterKey = input<string | null>(null);
  readonly filterLabel = input('tipo');
  /** Valores iniciales de un registro nuevo. */
  readonly defaults = input<Row>({});
  /** Se emite tras crear, editar o eliminar: la página vuelve a pedir el catálogo. */
  readonly changed = output<void>();

  protected readonly search = signal('');
  protected readonly filter = signal<string | null>(null);
  protected readonly filterOptions = computed(() => {
    const key = this.filterKey();
    if (!key) return [];
    return [...new Set(this.items().map((row) => row[key]).filter((value): value is string => typeof value === 'string' && value !== ''))].sort((a, b) => a.localeCompare(b, 'es'));
  });
  protected readonly editing = signal<Row | null>(null);
  protected readonly saving = signal(false);
  protected readonly errors = signal<Record<string, string>>({});

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const key = this.filterKey();
    const selected = this.filter();
    return this.items().filter(
      (row) => (!selected || !key || row[key] === selected) && (!term || this.columns().some((column) => String(row[column.key] ?? '').toLowerCase().includes(term))),
    );
  });

  protected display(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    return String(value);
  }

  protected macroShares(row: Row) {
    const protein = Number(row['proteinG']) * 4 || 0;
    const carbs = Number(row['carbsG']) * 4 || 0;
    const fat = Number(row['fatG']) * 9 || 0;
    const total = protein + carbs + fat || 1;
    const pct = (value: number) => Math.round((value / total) * 100);
    return { protein, carbs, fat, title: `Proteína ${pct(protein)} % · Carbos ${pct(carbs)} % · Grasa ${pct(fat)} % de las calorías` };
  }

  protected start(): void {
    this.errors.set({});
    this.editing.set({ ...this.defaults() });
  }

  protected edit(row: Row): void {
    this.errors.set({});
    this.editing.set({ ...row });
  }

  protected save(): void {
    const row = this.editing();
    if (!row) return;
    // Solo los campos del formulario: la API rechaza valores de más o calculados.
    const body = Object.fromEntries(this.fields().map((field) => [field.key, row[field.key] ?? (field.type === 'checkbox' ? false : null)]));
    this.saving.set(true);
    const request = row.id ? this.api.updateCatalogItem(this.resource(), row.id, body) : this.api.createCatalogItem(this.resource(), body);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(null);
        this.toast.success('Guardado.');
        this.changed.emit();
      },
      error: (error: ApiError) => {
        this.saving.set(false);
        this.errors.set(error.fields ?? {});
        if (error.fields) this.toast.error(error.message);
      },
    });
  }

  protected async remove(row: Row): Promise<void> {
    if (!row.id) return;
    const ok = await this.confirm.ask({
      title: `¿Eliminar "${row['name']}"?`,
      message: 'Dejará de aparecer en las listas. Los planes que ya lo usan conservan su nombre, pero ya no se podrán recalcular con él.',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    this.api.deleteCatalogItem(this.resource(), row.id).subscribe(() => {
      this.toast.success('Eliminado.');
      this.changed.emit();
    });
  }
}
