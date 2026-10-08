import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonTable } from '../../../components/skeletons/skeleton-table';
import { PageHeader } from '../shared/page-header';
import { FoodFlags, foodEmoji, foodRole, foodTone } from '../../../core/utils/visuals';
import { CatalogCrud, CrudColumn, CrudField, Row, RowVisual } from './catalog-crud';
import { CatalogPage } from './catalog-page';

@Component({
  selector: 'app-foods-admin',
  imports: [PageHeader, CatalogCrud, SkeletonTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Alimentos" subtitle="Valores por porción (SMAE y USDA). Los gramos del plan son peso neto. Lo que agregues aparece solo en los planes." />
    <div class="top">
      @if (catalog(); as c) {
        <app-catalog-crud resource="foods" addLabel="Agregar alimento" [items]="rows(c.foods)" [columns]="columns" [fields]="fields" [defaults]="defaults" [visual]="visual" filterKey="group" filterLabel="grupo" (changed)="reload()" />
        <p class="legend">
          <span><i class="dot tone--coral"></i><b>Proteína</b></span>
          <span><i class="dot tone--steel"></i><b>Carbohidratos y fruta</b></span>
          <span><i class="dot tone--amber"></i><b>Grasa</b></span>
          <span><i class="dot tone--emerald"></i><b>Verdura</b></span>
          <span>El color de cada alimento indica su papel en el plan; la barra, de dónde vienen sus calorías.</span>
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
export class FoodsAdmin extends CatalogPage {
  protected readonly defaults = { portionQty: 1, portionUnit: 'g', fiberG: 0, foodType: 'Vegetal', style: 'Ambos', asProtein: false, asCarb: false, asFat: false, asVegetable: false, asFruit: false };

  protected readonly visual = (row: Row): RowVisual => ({ emoji: foodEmoji(String(row['name'] ?? '')), tone: foodTone(row as FoodFlags) });

  protected readonly columns: CrudColumn[] = [
    { key: 'name', label: 'Alimento', sub: (row) => `${foodRole(row as FoodFlags)} · ${row['group'] ?? ''}` },
    { key: 'macros', label: 'Calorías de', macros: true },
    { key: 'portionQty', label: 'Cant.', numeric: true },
    { key: 'portionUnit', label: 'Unidad' },
    { key: 'netWeightG', label: 'Neto (g)', numeric: true },
    { key: 'kcal', label: 'kcal', numeric: true },
    { key: 'proteinG', label: 'Prot', numeric: true },
    { key: 'carbsG', label: 'Carb', numeric: true },
    { key: 'fatG', label: 'Grasa', numeric: true },
    { key: 'foodType', label: 'Tipo', tone: (value) => (value === 'Vegetal' ? 'emerald' : value === 'Huevo/lácteo' ? 'amber' : value === 'Pescado/marisco' ? 'steel' : 'coral') },
    { key: 'style', label: 'Estilo' },
  ];

  protected readonly fields: CrudField[] = [
    { key: 'name', label: 'Alimento', wide: true },
    { key: 'group', label: 'Grupo' },
    { key: 'portionQty', label: 'Cantidad de la porción', type: 'number', hint: 'Ej. 0.5 (media taza)' },
    { key: 'portionUnit', label: 'Unidad (g, pieza, taza…)' },
    { key: 'grossWeightG', label: 'Peso bruto (g)', type: 'number' },
    { key: 'netWeightG', label: 'Peso neto (g)', type: 'number' },
    { key: 'kcal', label: 'kcal', type: 'number' },
    { key: 'proteinG', label: 'Proteína (g)', type: 'number' },
    { key: 'fatG', label: 'Grasa (g)', type: 'number' },
    { key: 'carbsG', label: 'Carbos (g)', type: 'number' },
    { key: 'fiberG', label: 'Fibra (g)', type: 'number' },
    { key: 'foodType', label: 'Tipo de alimento', type: 'select', options: ['Vegetal', 'Carne/pollo', 'Pescado/marisco', 'Huevo/lácteo', 'Miel'], hint: 'Define en qué tipos de alimentación aparece' },
    { key: 'style', label: 'Estilo', type: 'select', options: ['Dulce', 'Salado', 'Ambos'] },
    { key: 'asProtein', label: 'Aparece como proteína', type: 'checkbox' },
    { key: 'asCarb', label: 'Aparece como carbo', type: 'checkbox' },
    { key: 'asFat', label: 'Aparece como grasa', type: 'checkbox' },
    { key: 'asVegetable', label: 'Aparece como verdura', type: 'checkbox' },
    { key: 'asFruit', label: 'Aparece como fruta', type: 'checkbox' },
  ];
}
