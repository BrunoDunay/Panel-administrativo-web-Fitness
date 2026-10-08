import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Btn } from '../buttons/btn';
import { MEASUREMENTS } from '../../core/config/tracking-lists';
import { ClientStore } from '../../core/services/client-store';
import { MeasurementEntry } from '../../core/types/client.model';
import { formatDate, formatNumber, formatPercent, formatSigned, toNumber } from '../../core/utils/format';

/** Circunferencias y mediciones: una columna por medición, con el cambio contra la inicial. */
@Component({
  selector: 'app-measurements-panel',
  imports: [Btn],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card">
      <header class="card__head">
        <div>
          <h3 class="card__title">Circunferencias y mediciones</h3>
          <p class="card__hint">Mide siempre en las mismas condiciones: en ayunas, mismo lado y cinta sin apretar.</p>
        </div>
        @if (!editing()) {
          <button appBtn type="button" variant="soft" size="sm" class="no-print" (click)="start()">Nueva medición</button>
        }
      </header>

      @if (editing(); as form) {
        <div class="stack editor">
          <div class="form-grid">
            <label class="field">
              <span class="field__label">Fecha de medición</span>
              <input class="field__control" type="date" [max]="store.today()" [value]="form.date" (change)="patch({ date: $any($event.target).value })" />
            </label>
            @for (item of items; track item.key) {
              <label class="field">
                <span class="field__label">{{ item.label }} ({{ item.unit }})</span>
                <input class="field__control" type="number" inputmode="decimal" min="0" step="0.1" [value]="form.values[item.key] ?? ''" (change)="setValue(item.key, $any($event.target).value)" />
              </label>
            }
            <label class="field span-all">
              <span class="field__label">Fotos de progreso (enlace)</span>
              <input class="field__control" type="url" placeholder="https://" [value]="form.photosLink ?? ''" (change)="patch({ photosLink: $any($event.target).value || null })" />
            </label>
            <label class="field span-all">
              <span class="field__label">Observaciones</span>
              <textarea class="field__control" [value]="form.notes ?? ''" (change)="patch({ notes: $any($event.target).value || null })"></textarea>
            </label>
          </div>
          <div class="row">
            <button appBtn type="button" [loading]="saving()" [disabled]="saving() || !form.date" (click)="save()">Guardar medición</button>
            <button appBtn type="button" variant="ghost" (click)="editing.set(null)">Cancelar</button>
          </div>
        </div>
      }

      @if (entries().length) {
        <div class="table-wrap">
          <table class="table table--compact">
            <thead>
              <tr>
                <th>Medida</th>
                @for (entry of entries(); track entry.date; let i = $index) {
                  <th class="num">
                    {{ i === 0 ? 'Inicial' : 'Medición ' + (i + 1) }}<br />
                    <button type="button" class="date-link no-print" (click)="edit(entry)" title="Editar esta medición">{{ date(entry.date, true) }}</button>
                  </th>
                }
                <th class="num">Δ total</th>
                <th class="num">Δ %</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.key) {
                <tr>
                  <td>{{ row.label }} <span class="text-muted">({{ row.unit }})</span></td>
                  @for (value of row.values; track $index) {
                    <td class="num">{{ num(value) }}</td>
                  }
                  <td class="num">{{ signed(row.delta) }}</td>
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
              @if (entry.photosLink) { <a [href]="entry.photosLink" target="_blank" rel="noopener noreferrer">Ver fotos</a> }
            </p>
          }
        }
      } @else if (!editing()) {
        <p class="text-muted">Todavía no hay mediciones. La primera será tu punto de partida.</p>
      }
    </section>
  `,
  styles: `
    .editor { margin-bottom: var(--space-5); padding: var(--space-4); border-radius: var(--radius-md); background: var(--color-background); }
    .date-link { padding: 0; border: 0; background: none; font-size: var(--text-xs); font-weight: 600; color: var(--color-primary); text-decoration: underline; }
    .entry-note { margin-top: var(--space-3); font-size: var(--text-sm); }
    .entry-note a { margin-left: var(--space-2); font-weight: 600; color: var(--color-primary); text-decoration: underline; }
  `,
})
export class MeasurementsPanel {
  protected readonly store = inject(ClientStore);
  protected readonly items = MEASUREMENTS;
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
    return this.items
      .map((item) => ({ ...item, values: entries.map((entry) => entry.values[item.key] ?? null), delta: deltas[item.key]?.delta ?? null, pct: deltas[item.key]?.pct ?? null }))
      .filter((row) => row.values.some((value) => value !== null));
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
