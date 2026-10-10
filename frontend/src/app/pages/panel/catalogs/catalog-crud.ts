import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Btn } from '../../../components/buttons/btn';
import { Icon, IconName } from '../../../components/icon/icon';
import { ExerciseFigure } from '../../../components/visual/exercise-figure';
import { FigureDef } from '../../../components/visual/figure-rig';
import { PanelApi } from '../../../core/services/api/panel-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { CatalogResource } from '../../../core/types/catalog.model';
import { ApiError } from '../../../core/types/common.model';
import { EmojiGroup, Tone } from '../../../core/utils/visuals';
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
  /** Título de sección que se muestra antes de este campo. */
  section?: string;
}

export type Row = Record<string, unknown> & { id?: number };

export interface CrudColumn {
  key: string;
  label: string;
  numeric?: boolean;
  /** Muestra el valor como etiqueta del color que devuelva. */
  tone?: (value: unknown, row: Row) => Tone;
  /** Barra con la proporción de calorías de proteína, carbos y grasa de la fila. */
  macros?: boolean;
  /** Texto secundario bajo el valor. */
  sub?: (row: Row) => string;
}

/** Miniatura de la fila: un emoji, un ícono o un dibujo animado sobre el color de su tipo. */
export interface RowVisual {
  emoji?: string;
  icon?: IconName;
  /** Dibujo animado (caminata, bicicleta, sentadilla…): tiene prioridad sobre el ícono. */
  figure?: FigureDef;
  tone: Tone;
}

/** Opciones para que el coach elija el ícono de un registro (se guarda en el campo `icon`). */
export type IconPicker = { kind: 'emoji'; groups: EmojiGroup[] } | { kind: 'icon'; options: { name: IconName; label: string }[] };

/**
 * Listado de un catálogo (alimentos, suplementos, protocolos) con búsqueda, filtros y un
 * formulario que muestra en vivo cómo quedará el registro y deja elegir su ícono.
 */
@Component({
  selector: 'app-catalog-crud',
  imports: [FormsModule, Btn, Icon, ExerciseFigure],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalog-crud.html',
  styleUrl: './catalog-crud.css',
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
  readonly picker = input<IconPicker | null>(null);
  /** Columna por la que se puede filtrar con botones (por ejemplo, el grupo). */
  readonly filterKey = input<string | null>(null);
  readonly filterLabel = input('tipo');
  /** Valores iniciales de un registro nuevo. */
  readonly defaults = input<Row>({});
  /** Se emite tras crear, editar o eliminar: la página vuelve a pedir el catálogo. */
  readonly changed = output<void>();

  protected readonly search = signal('');
  protected readonly filter = signal<string | null>(null);
  protected readonly editing = signal<Row | null>(null);
  protected readonly saving = signal(false);
  protected readonly errors = signal<Record<string, string>>({});

  protected readonly filterOptions = computed(() => {
    const key = this.filterKey();
    if (!key) return [];
    return [...new Set(this.items().map((row) => row[key]).filter((value): value is string => typeof value === 'string' && value !== ''))].sort((a, b) => a.localeCompare(b, 'es'));
  });

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

  /** Elige un ícono; null vuelve al automático. */
  protected pick(value: string | null): void {
    this.editing.update((row) => (row ? { ...row, icon: value } : row));
  }

  protected save(): void {
    const row = this.editing();
    if (!row) return;
    // Solo los campos del formulario (más el ícono): la API rechaza valores de más o calculados.
    const body: Record<string, unknown> = Object.fromEntries(this.fields().map((field) => [field.key, row[field.key] ?? (field.type === 'checkbox' ? false : null)]));
    if (this.picker()) body['icon'] = row['icon'] || null;
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
