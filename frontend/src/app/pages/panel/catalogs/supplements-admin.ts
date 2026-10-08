import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonTable } from '../../../components/skeletons/skeleton-table';
import { PageHeader } from '../shared/page-header';
import { SUPPLEMENT_EMOJI_CHOICES, aisTone, supplementEmoji } from '../../../core/utils/visuals';
import { CatalogCrud, CrudColumn, CrudField, IconPicker, Row, RowVisual } from './catalog-crud';
import { CatalogPage } from './catalog-page';

@Component({
  selector: 'app-supplements-admin',
  imports: [PageHeader, CatalogCrud, SkeletonTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Suplementos" subtitle="Los más comunes (AIS grupos A y B). Mín, máx y unidad calculan la dosis recomendada con el peso del cliente. Agrega tus marcas y enlaces." />
    <div class="top">
      @if (catalog(); as c) {
        <app-catalog-crud resource="supplements" addLabel="Agregar suplemento" [items]="rows(c.supplements)" [columns]="columns" [fields]="fields" [visual]="visual" [picker]="picker" (changed)="reload()">
          <p legend class="legend">
            <span><b>Color = grupo de evidencia (AIS):</b></span>
            <span><i class="dot tone--emerald"></i><b>A</b> · evidencia sólida</span>
            <span><i class="dot tone--steel"></i><b>B</b> · evidencia emergente</span>
            <span><i class="dot tone--amber"></i><b>C</b> · poca evidencia</span>
            <span><i class="dot tone--coral"></i><b>D</b> · no recomendado</span>
          </p>
        </app-catalog-crud>
      } @else {
        <div class="card"><app-skeleton-table /></div>
      }
    </div>
  `,
  styles: `
    .top { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); margin-top: var(--space-5); }
  `,
})
export class SupplementsAdmin extends CatalogPage {
  protected readonly visual = (row: Row): RowVisual => ({ emoji: supplementEmoji(String(row['name'] ?? ''), row['icon'] as string | null), tone: aisTone(row['aisGroup']) });
  protected readonly picker: IconPicker = { kind: 'emoji', groups: SUPPLEMENT_EMOJI_CHOICES };

  protected readonly columns: CrudColumn[] = [
    { key: 'name', label: 'Suplemento', sub: (row) => String(row['purpose'] ?? '') },
    { key: 'aisGroup', label: 'Grupo AIS', tone: (value) => aisTone(value) },
    { key: 'doseText', label: 'Dosis' },
    { key: 'timing', label: 'Horario / uso' },
    { key: 'brand', label: 'Marca' },
  ];

  protected readonly fields: CrudField[] = [
    { key: 'name', label: 'Suplemento', wide: true, section: 'Identificación' },
    { key: 'aisGroup', label: 'Grupo AIS', type: 'select', options: ['A', 'B', 'C', 'D'] },
    { key: 'doseText', label: 'Dosis (texto)', hint: 'Ej. 3–5 g/día', section: 'Dosis' },
    { key: 'doseMin', label: 'Mín', type: 'number' },
    { key: 'doseMax', label: 'Máx', type: 'number' },
    { key: 'doseUnit', label: 'Unidad', type: 'select', options: ['mg/kg', 'g/kg', 'ml/kg', 'g/día', 'mg/día', 'UI/día'], hint: 'Con unidades por kg, la dosis se calcula con el peso' },
    { key: 'purpose', label: 'Para qué', type: 'textarea', wide: true, section: 'Uso' },
    { key: 'timing', label: 'Horario / uso', wide: true },
    { key: 'precautions', label: 'Precauciones', type: 'textarea', wide: true },
    { key: 'reference', label: 'Referencia', wide: true },
    { key: 'brand', label: 'Marca', section: 'Producto recomendado' },
    { key: 'link', label: 'Enlace del producto', type: 'url' },
  ];
}
