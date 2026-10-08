import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonTable } from '../../../components/skeletons/skeleton-table';
import { PageHeader } from '../shared/page-header';
import { aisTone, supplementEmoji } from '../../../core/utils/visuals';
import { CatalogCrud, CrudColumn, CrudField, Row, RowVisual } from './catalog-crud';
import { CatalogPage } from './catalog-page';

@Component({
  selector: 'app-supplements-admin',
  imports: [PageHeader, CatalogCrud, SkeletonTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Suplementos" subtitle="Los más comunes (AIS grupos A y B). Mín, máx y unidad calculan la dosis recomendada con el peso del cliente. Agrega tus marcas y enlaces." />
    <div class="top">
      @if (catalog(); as c) {
        <app-catalog-crud resource="supplements" addLabel="Agregar suplemento" [items]="rows(c.supplements)" [columns]="columns" [fields]="fields" [visual]="visual" (changed)="reload()" />
        <p class="legend">
          <span><i class="dot tone--emerald"></i><b>Grupo A</b>: evidencia sólida</span>
          <span><i class="dot tone--steel"></i><b>Grupo B</b>: evidencia emergente</span>
          <span><i class="dot tone--amber"></i><b>Grupo C</b>: poca evidencia</span>
        </p>
      } @else {
        <div class="card"><app-skeleton-table /></div>
      }
    </div>
  `,
  styles: `
    .top { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); margin-top: var(--space-5); }
    .legend { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-5); font-size: var(--text-xs); color: var(--color-text-muted); }
    .legend span { display: inline-flex; align-items: center; gap: var(--space-2); }
  `,
})
export class SupplementsAdmin extends CatalogPage {
  protected readonly visual = (row: Row): RowVisual => ({ emoji: supplementEmoji(String(row['name'] ?? '')), tone: aisTone(row['aisGroup']) });

  protected readonly columns: CrudColumn[] = [
    { key: 'name', label: 'Suplemento', sub: (row) => String(row['purpose'] ?? '') },
    { key: 'aisGroup', label: 'Grupo AIS', tone: (value) => aisTone(value) },
    { key: 'doseText', label: 'Dosis' },
    { key: 'timing', label: 'Horario / uso' },
    { key: 'brand', label: 'Marca' },
  ];

  protected readonly fields: CrudField[] = [
    { key: 'name', label: 'Suplemento', wide: true },
    { key: 'aisGroup', label: 'Grupo AIS', type: 'select', options: ['A', 'B', 'C', 'D'] },
    { key: 'doseText', label: 'Dosis (texto)', hint: 'Ej. 3–5 g/día' },
    { key: 'doseMin', label: 'Mín', type: 'number' },
    { key: 'doseMax', label: 'Máx', type: 'number' },
    { key: 'doseUnit', label: 'Unidad', type: 'select', options: ['mg/kg', 'g/kg', 'ml/kg', 'g/día', 'mg/día', 'UI/día'], hint: 'Con unidades por kg, la dosis se calcula con el peso' },
    { key: 'purpose', label: 'Para qué', type: 'textarea', wide: true },
    { key: 'timing', label: 'Horario / uso', wide: true },
    { key: 'precautions', label: 'Precauciones', type: 'textarea', wide: true },
    { key: 'reference', label: 'Referencia', wide: true },
    { key: 'brand', label: 'Marca' },
    { key: 'link', label: 'Enlace del producto', type: 'url' },
  ];
}
