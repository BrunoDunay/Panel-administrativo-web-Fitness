import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonTable } from '../../../components/skeletons/skeleton-table';
import { PageHeader } from '../shared/page-header';
import { FOOD_EMOJI_CHOICES, FoodFlags, foodEmoji, foodRole, foodTone } from '../../../core/utils/visuals';
import { CatalogCrud, CrudColumn, CrudField, IconPicker, Row, RowVisual } from './catalog-crud';
import { CatalogPage } from './catalog-page';

/** Grupos del Sistema Mexicano de Alimentos Equivalentes, más los que quedan fuera del dietocálculo. */
const FOOD_GROUPS = [
  'Verduras', 'Frutas', 'Cereales y tubérculos sin grasa', 'Cereales y tubérculos con grasa', 'Leguminosas',
  'AOA muy bajo en grasa', 'AOA bajo en grasa', 'AOA moderado en grasa', 'AOA alto en grasa',
  'Leche descremada', 'Leche semidescremada', 'Leche entera', 'Leche con azúcar',
  'Aceites y grasas sin proteína', 'Aceites y grasas con proteína', 'Azúcares sin grasa', 'Azúcares con grasa',
  'Bebidas deportivas', 'Suplemento proteico', 'Otros (fuera del dietocálculo)',
];

@Component({
  selector: 'app-foods-admin',
  imports: [PageHeader, CatalogCrud, SkeletonTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Alimentos" subtitle="Valores por porción (SMAE y USDA). Los gramos del plan son peso neto. Lo que agregues aparece solo en los planes." />
    <div class="top">
      @if (catalog(); as c) {
        <app-catalog-crud resource="foods" addLabel="Agregar alimento" [items]="rows(c.foods)" [columns]="columns" [fields]="fields" [defaults]="defaults" [visual]="visual" [picker]="picker" filterKey="group" filterLabel="grupo" (changed)="reload()">
          <p legend class="legend">
            <span><b>Color del alimento = su papel en el plan:</b></span>
            <span><i class="dot tone--coral"></i>Proteína</span>
            <span><i class="dot tone--steel"></i>Carbohidratos y fruta</span>
            <span><i class="dot tone--amber"></i>Grasa</span>
            <span><i class="dot tone--emerald"></i>Verdura</span>
            <span><b>Barra = de dónde vienen sus calorías:</b></span>
            <span><span class="macro-bar"><span class="is-protein" style="flex: 1"></span></span>Proteína</span>
            <span><span class="macro-bar"><span class="is-carbs" style="flex: 1"></span></span>Carbohidratos</span>
            <span><span class="macro-bar"><span class="is-fat" style="flex: 1"></span></span>Grasa</span>
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
export class FoodsAdmin extends CatalogPage {
  protected readonly defaults = { portionQty: 1, portionUnit: 'g', fiberG: 0, foodType: 'Vegetal', style: 'Ambos', asProtein: false, asCarb: false, asFat: false, asVegetable: false, asFruit: false };

  protected readonly visual = (row: Row): RowVisual => ({ emoji: foodEmoji(String(row['name'] ?? ''), row['icon'] as string | null), tone: foodTone(row as FoodFlags) });
  protected readonly picker: IconPicker = { kind: 'emoji', groups: FOOD_EMOJI_CHOICES };

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
    { key: 'name', label: 'Alimento', wide: true, section: 'Identificación' },
    { key: 'group', label: 'Grupo de equivalentes', type: 'select', options: FOOD_GROUPS, hint: 'Define en qué grupo del dietocálculo aparece. La porción de abajo debe ser 1 equivalente de ese grupo.' },
    { key: 'portionQty', label: 'Cantidad de la porción', type: 'number', hint: 'Ej. 0.5 (media taza)', section: 'Porción' },
    { key: 'portionUnit', label: 'Unidad (g, pieza, taza…)' },
    { key: 'grossWeightG', label: 'Peso bruto (g)', type: 'number' },
    { key: 'netWeightG', label: 'Peso neto (g)', type: 'number' },
    { key: 'kcal', label: 'kcal', type: 'number', section: 'Valores por porción' },
    { key: 'proteinG', label: 'Proteína (g)', type: 'number' },
    { key: 'fatG', label: 'Grasa (g)', type: 'number' },
    { key: 'carbsG', label: 'Carbos (g)', type: 'number' },
    { key: 'fiberG', label: 'Fibra (g)', type: 'number' },
    { key: 'foodType', label: 'Tipo de alimento', type: 'select', section: 'En qué listas del plan aparece', options: ['Vegetal', 'Carne/pollo', 'Pescado/marisco', 'Huevo/lácteo', 'Miel'], hint: 'Define en qué tipos de alimentación aparece' },
    { key: 'style', label: 'Estilo', type: 'select', options: ['Dulce', 'Salado', 'Ambos'] },
    { key: 'asProtein', label: 'Aparece como proteína', type: 'checkbox' },
    { key: 'asCarb', label: 'Aparece como carbo', type: 'checkbox' },
    { key: 'asFat', label: 'Aparece como grasa', type: 'checkbox' },
    { key: 'asVegetable', label: 'Aparece como verdura', type: 'checkbox' },
    { key: 'asFruit', label: 'Aparece como fruta', type: 'checkbox' },
  ];
}
