import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonTable } from '../../../components/skeletons/skeleton-table';
import { PageHeader } from '../shared/page-header';
import { CatalogCrud, CrudColumn, CrudField } from './catalog-crud';
import { CatalogPage } from './catalog-page';

@Component({
  selector: 'app-supplements-admin',
  imports: [PageHeader, CatalogCrud, SkeletonTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Suplementos" subtitle="Los más comunes (AIS grupos A y B). Mín, máx y unidad calculan la dosis recomendada con el peso del cliente. Agrega tus marcas y enlaces." />
    <div class="top">
      @if (catalog(); as c) {
        <app-catalog-crud resource="supplements" addLabel="Agregar suplemento" [items]="rows(c.supplements)" [columns]="columns" [fields]="fields" (changed)="reload()" />
      } @else {
        <div class="card"><app-skeleton-table /></div>
      }
    </div>
  `,
  styles: `.top { margin-top: var(--space-5); }`,
})
export class SupplementsAdmin extends CatalogPage {
  protected readonly columns: CrudColumn[] = [
    { key: 'name', label: 'Suplemento' },
    { key: 'aisGroup', label: 'Grupo AIS' },
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
