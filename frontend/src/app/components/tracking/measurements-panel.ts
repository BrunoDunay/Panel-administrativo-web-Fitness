import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Btn } from '../buttons/btn';
import { Icon } from '../icon/icon';
import { MEASUREMENTS } from '../../core/config/tracking-lists';
import { ClientStore } from '../../core/services/client-store';
import { MeasurementEntry } from '../../core/types/client.model';
import { formatDate, formatNumber, formatPercent, formatSigned, toNumber } from '../../core/utils/format';
import { Tone } from '../../core/utils/visuals';

/** Las medidas agrupadas por zona, para capturarlas en el orden en que se toman. */
const GROUPS: { label: string; tone: Tone; keys: string[] }[] = [
  { label: 'General', tone: 'emerald', keys: ['weight', 'bodyFat'] },
  { label: 'Tronco', tone: 'steel', keys: ['neck', 'shoulders', 'chest', 'waist', 'abdomen', 'hips'] },
  { label: 'Brazos', tone: 'coral', keys: ['armRight', 'armLeft', 'forearmRight', 'forearmLeft'] },
  { label: 'Piernas', tone: 'amber', keys: ['thighRight', 'thighLeft', 'calfRight', 'calfLeft'] },
];

/** Circunferencias y mediciones: una columna por medición, con el cambio contra la inicial. */
@Component({
  selector: 'app-measurements-panel',
  imports: [Btn, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card card--badge tone--amber icon-hover">
      <span class="card__badge"><app-icon name="ruler" [size]="26" /></span>
      <h3 class="form-section__title">Circunferencias y mediciones</h3>
      <p class="card__hint lead">Mide siempre en las mismas condiciones: <b>en ayunas</b>, mismo lado y cinta sin apretar.</p>

      @if (editing(); as form) {
        <div class="editor">
          <div class="editor__top">
            <label class="field">
              <span class="field__label">Fecha de medición</span>
              <input class="field__control" type="date" [max]="store.today()" [value]="form.date" (change)="patch({ date: $any($event.target).value })" />
            </label>
            <p class="card__hint">Llena solo lo que hayas medido: lo demás se queda vacío.</p>
          </div>

          <div class="groups">
            @for (group of groups; track group.label) {
              <fieldset [class]="'group tone--' + group.tone">
                <legend>{{ group.label }}</legend>
                @for (item of group.items; track item.key) {
                  <label class="measure">
                    <span>{{ item.label }}</span>
                    <span class="measure__input">
                      <input class="cell-input cell-input--num" type="number" inputmode="decimal" min="0" step="0.1" [value]="form.values[item.key] ?? ''" (change)="setValue(item.key, $any($event.target).value)" />
                      <small>{{ item.unit }}</small>
                    </span>
                  </label>
                }
              </fieldset>
            }
          </div>

          <div class="form-grid">
            <label class="field">
              <span class="field__label">Fotos de progreso (enlace)</span>
              <input class="field__control" type="url" placeholder="https://" [value]="form.photosLink ?? ''" (change)="patch({ photosLink: $any($event.target).value || null })" />
            </label>
            <label class="field">
              <span class="field__label">Observaciones</span>
              <input class="field__control" [value]="form.notes ?? ''" (change)="patch({ notes: $any($event.target).value || null })" />
            </label>
          </div>
          <div class="row">
            <button appBtn type="button" [loading]="saving()" [disabled]="saving() || !form.date" (click)="save()"><app-icon name="check" [size]="16" />Guardar medición</button>
            <button appBtn type="button" variant="ghost" (click)="editing.set(null)">Cancelar</button>
          </div>
        </div>
      } @else {
        <div class="center"><button appBtn type="button" (click)="start()"><app-icon name="plus" [size]="16" />Nueva medición</button></div>
      }

      @if (entries().length) {
        <div class="table-wrap history">
          <table class="table table--compact">
            <thead>
              <tr>
                <th>Medida</th>
                @for (entry of entries(); track entry.date; let i = $index) {
                  <th class="num">
                    {{ i === 0 ? 'Inicial' : 'Medición ' + (i + 1) }}<br />
                    <button type="button" class="date-link" (click)="edit(entry)" title="Editar esta medición">{{ date(entry.date, true) }}<app-icon name="edit" [size]="11" /></button>
                  </th>
                }
                <th class="num">Cambio</th>
                <th class="num">Cambio %</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.key) {
                <tr>
                  <td><span class="rowname"><i [class]="'dot tone--' + row.tone"></i>{{ row.label }} <span class="text-muted">({{ row.unit }})</span></span></td>
                  @for (value of row.values; track $index) {
                    <td class="num">{{ num(value) }}</td>
                  }
                  <td class="num"><b>{{ signed(row.delta) }}</b></td>
                  <td class="num">{{ row.pct === null ? '—' : pct(row.pct, 1) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @for (entry of entries(); track entry.date) {
          @if (entry.photosLink || entry.notes) {
            <p class="entry-note">
              <b>{{ date(entry.date, true) }}:</b> {{ entry.notes }}
              @if (entry.photosLink) { <a [href]="entry.photosLink" target="_blank" rel="noopener noreferrer"><app-icon name="camera" [size]="14" />Ver fotos</a> }
            </p>
          }
        }
      } @else if (!editing()) {
        <p class="card__hint lead">Todavía no hay mediciones. La primera será tu <b>punto de partida</b>.</p>
      }
    </section>
  `,
  styles: `
    .lead { max-width: 60ch; margin: var(--space-2) auto var(--space-4); text-align: center; }
    .center { display: flex; justify-content: center; }
    .editor { display: grid; gap: var(--space-4); margin-bottom: var(--space-2); padding: var(--space-4); border-radius: var(--radius-md); background: var(--color-background); }
    .editor__top { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--space-3) var(--space-4); }
    .editor__top .field { width: min(100%, 13rem); }

    /* Una tarjeta por zona del cuerpo. */
    .groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr)); gap: var(--space-3); }
    .group { display: grid; align-content: start; gap: var(--space-2); min-width: 0; margin: 0; padding: var(--space-3); border: 0; border-top: 4px solid var(--tone); border-radius: var(--radius-md); background: var(--color-surface); }
    .group legend { float: left; width: 100%; margin-bottom: var(--space-2); padding: 0; font-size: var(--text-xs); font-weight: 700; letter-spacing: var(--tracking-wider); text-transform: uppercase; color: var(--tone-ink); }
    .measure { display: grid; grid-template-columns: minmax(0, 1fr) 6.2rem; align-items: center; gap: var(--space-2); clear: both; font-size: var(--text-sm); }
    .measure__input { display: flex; align-items: center; gap: var(--space-1); }
    .measure__input small { width: 1.5rem; font-size: var(--text-xs); color: var(--color-text-muted); }

    .history { margin-top: var(--space-5); }
    .rowname { display: inline-flex; align-items: center; gap: var(--space-2); }
    .date-link { display: inline-flex; align-items: center; gap: 3px; padding: 0; border: 0; background: none; font-size: var(--text-xs); font-weight: 600; color: var(--color-primary); text-decoration: underline; }
    .entry-note { margin-top: var(--space-3); font-size: var(--text-sm); }
    .entry-note a { display: inline-flex; align-items: center; gap: 4px; margin-left: var(--space-2); font-weight: 600; color: var(--color-primary); text-decoration: underline; }
  `,
})
export class MeasurementsPanel {
  protected readonly store = inject(ClientStore);
  protected readonly groups = GROUPS.map((group) => ({ ...group, items: MEASUREMENTS.filter((item) => group.keys.includes(item.key)) }));
  protected readonly date = formatDate;
  protected readonly num = formatNumber;
  protected readonly signed = formatSigned;
  protected readonly pct = formatPercent;
  protected readonly saving = signal(false);
  protected readonly editing = signal<MeasurementEntry | null>(null);

  protected readonly entries = computed(() => this.store.tracking()?.measurements.entries ?? []);
  /** Solo las medidas que tienen al menos un dato. */
  protected readonly rows = computed(() => {
    const entries = this.entries();
    const deltas = this.store.tracking()?.measurements.deltas ?? {};
    return MEASUREMENTS.map((item) => ({
      ...item,
      tone: GROUPS.find((group) => group.keys.includes(item.key))?.tone ?? 'slate',
      values: entries.map((entry) => entry.values[item.key] ?? null),
      delta: deltas[item.key]?.delta ?? null,
      pct: deltas[item.key]?.pct ?? null,
    })).filter((row) => row.values.some((value) => value !== null));
  });

  protected start(): void {
    this.editing.set({ date: this.store.today(), values: {}, photosLink: null, notes: null });
  }

  protected edit(entry: MeasurementEntry): void {
    this.editing.set({ ...entry, values: { ...entry.values } });
  }

  protected patch(changes: Partial<MeasurementEntry>): void {
    this.editing.update((form) => (form ? { ...form, ...changes } : form));
  }

  protected setValue(key: string, value: string): void {
    const form = this.editing();
    if (form) this.patch({ values: { ...form.values, [key]: toNumber(value) } });
  }

  protected save(): void {
    const form = this.editing();
    if (!form) return;
    this.saving.set(true);
    const { date, ...body } = form;
    this.store.saveMeasurement(date, body).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(null);
      },
      error: () => this.saving.set(false),
    });
  }
}
