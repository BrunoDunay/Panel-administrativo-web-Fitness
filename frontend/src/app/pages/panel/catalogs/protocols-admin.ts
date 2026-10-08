import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { SkeletonTable } from '../../../components/skeletons/skeleton-table';
import { PageHeader } from '../shared/page-header';
import { IconName } from '../../../components/icon/icon';
import { Tone } from '../../../core/utils/visuals';
import { CatalogCrud, CrudColumn, CrudField, Row, RowVisual } from './catalog-crud';

const CARDIO: Record<string, { icon: IconName; tone: Tone }> = {
  Continuo: { icon: 'run', tone: 'emerald' },
  Intervalos: { icon: 'flame', tone: 'coral' },
  NEAT: { icon: 'steps', tone: 'steel' },
  Mixto: { icon: 'heart', tone: 'amber' },
};
import { CatalogPage } from './catalog-page';

@Component({
  selector: 'app-protocols-admin',
  imports: [PageHeader, CatalogCrud, SkeletonTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Protocolos" subtitle="Protocolos estándar de cardio y calentamiento. Son puntos de partida: cada cliente se individualiza en su plan." />
    <div class="tabs top" role="tablist" aria-label="Tipo de protocolo">
      <button type="button" class="tab" role="tab" [attr.aria-selected]="kind() === 'cardio'" (click)="kind.set('cardio')">Cardio</button>
      <button type="button" class="tab" role="tab" [attr.aria-selected]="kind() === 'warmup'" (click)="kind.set('warmup')">Calentamiento</button>
    </div>
    <div class="body">
      @if (catalog(); as c) {
        @if (kind() === 'cardio') {
          <app-catalog-crud resource="cardio-protocols" addLabel="Agregar protocolo" [items]="rows(c.cardioProtocols)" [columns]="cardioColumns" [fields]="cardioFields" [visual]="cardioVisual" (changed)="reload()" />
        } @else {
          <app-catalog-crud resource="warmup-protocols" addLabel="Agregar protocolo" [items]="rows(c.warmupProtocols)" [columns]="warmupColumns" [fields]="warmupFields" [visual]="warmupVisual" (changed)="reload()" />
        }
      } @else {
        <div class="card"><app-skeleton-table /></div>
      }
    </div>
  `,
  styles: `
    .top { margin-top: var(--space-5); }
    .body { margin-top: var(--space-4); }
  `,
})
export class ProtocolsAdmin extends CatalogPage {
  protected readonly kind = signal<'cardio' | 'warmup'>('cardio');

  protected readonly cardioVisual = (row: Row): RowVisual => CARDIO[String(row['type'])] ?? { icon: 'sliders', tone: 'slate' };
  protected readonly warmupVisual = (row: Row): RowVisual =>
    /inferior/i.test(String(row['name'])) ? { icon: 'stretch', tone: 'amber' } : /empuje|tracci/i.test(String(row['name'])) ? { icon: 'dumbbell', tone: 'steel' } : /molestia/i.test(String(row['name'])) ? { icon: 'scanHeart', tone: 'coral' } : { icon: 'flame', tone: 'emerald' };

  protected readonly cardioColumns: CrudColumn[] = [
    { key: 'name', label: 'Nombre', sub: (row) => String(row['notes'] ?? '') },
    { key: 'type', label: 'Tipo', tone: (value) => CARDIO[String(value)]?.tone ?? 'slate' },
    { key: 'durationMin', label: 'Min', numeric: true },
    { key: 'intervals', label: 'Intervalos' },
    { key: 'rpe', label: 'RPE' },
    { key: 'hrZone', label: 'Zona FC' },
  ];
  protected readonly cardioFields: CrudField[] = [
    { key: 'name', label: 'Nombre', wide: true },
    { key: 'type', label: 'Tipo', type: 'select', options: ['Continuo', 'Intervalos', 'NEAT', 'Mixto'] },
    { key: 'durationMin', label: 'Duración (min)', type: 'number', step: 1 },
    { key: 'intervals', label: 'Intervalos' },
    { key: 'rpe', label: 'RPE' },
    { key: 'hrZone', label: 'Zona FC' },
    { key: 'notes', label: 'Notas / instrucciones', type: 'textarea', wide: true },
  ];

  protected readonly warmupColumns: CrudColumn[] = [
    { key: 'name', label: 'Nombre', sub: (row) => String(row['general'] ?? '') },
    { key: 'duration', label: 'Duración' },
    { key: 'rampUpSets', label: 'Series de aproximación' },
  ];
  protected readonly warmupFields: CrudField[] = [
    { key: 'name', label: 'Nombre', wide: true },
    { key: 'duration', label: 'Duración' },
    { key: 'general', label: 'Bloque 1 · General', type: 'textarea', wide: true },
    { key: 'mobility', label: 'Bloque 2 · Movilidad', type: 'textarea', wide: true },
    { key: 'activation', label: 'Bloque 3 · Activación', type: 'textarea', wide: true },
    { key: 'rampUpSets', label: 'Series de aproximación', type: 'textarea', wide: true },
    { key: 'rationale', label: 'Fundamento (evidencia)', type: 'textarea', wide: true },
  ];
}
