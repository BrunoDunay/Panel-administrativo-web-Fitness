import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { SkeletonTable } from '../../../components/skeletons/skeleton-table';
import { PageHeader } from '../shared/page-header';
import { IconName } from '../../../components/icon/icon';
import { Tone } from '../../../core/utils/visuals';
import { CatalogCrud, CrudColumn, CrudField, IconPicker, Row, RowVisual } from './catalog-crud';

const CARDIO: Record<string, { icon: IconName; tone: Tone }> = {
  Continuo: { icon: 'run', tone: 'emerald' },
  Intervalos: { icon: 'flame', tone: 'coral' },
  NEAT: { icon: 'steps', tone: 'steel' },
  Mixto: { icon: 'heart', tone: 'amber' },
};

/** Íconos que el coach puede elegir para un protocolo. */
const PROTOCOL_ICONS: { name: IconName; label: string }[] = [
  { name: 'run', label: 'Correr' },
  { name: 'steps', label: 'Pasos' },
  { name: 'heart', label: 'Corazón' },
  { name: 'scanHeart', label: 'Pulso' },
  { name: 'flame', label: 'Intensidad' },
  { name: 'gauge', label: 'Ritmo' },
  { name: 'clock', label: 'Tiempo' },
  { name: 'stretch', label: 'Movilidad' },
  { name: 'movement', label: 'Cuerpo completo' },
  { name: 'dumbbell', label: 'Fuerza' },
  { name: 'target', label: 'Específico' },
  { name: 'rocket', label: 'Exprés' },
  { name: 'drop', label: 'Sudor' },
  { name: 'sparkles', label: 'Suave' },
  { name: 'shield', label: 'Cuidado' },
];
const ICON_NAMES = new Set(PROTOCOL_ICONS.map((icon) => icon.name));
const chosenIcon = (row: Row): IconName | null => (ICON_NAMES.has(row['icon'] as IconName) ? (row['icon'] as IconName) : null);
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
          <app-catalog-crud resource="cardio-protocols" addLabel="Agregar protocolo" [items]="rows(c.cardioProtocols)" [columns]="cardioColumns" [fields]="cardioFields" [visual]="cardioVisual" [picker]="picker" (changed)="reload()">
            <p legend class="legend">
              <span><b>Color = tipo de cardio:</b></span>
              <span><i class="dot tone--emerald"></i>Continuo</span>
              <span><i class="dot tone--coral"></i>Intervalos</span>
              <span><i class="dot tone--steel"></i>NEAT (pasos)</span>
              <span><i class="dot tone--amber"></i>Mixto</span>
              <span>Si no eliges ícono, se asigna según el tipo.</span>
            </p>
          </app-catalog-crud>
        } @else {
          <app-catalog-crud resource="warmup-protocols" addLabel="Agregar protocolo" [items]="rows(c.warmupProtocols)" [columns]="warmupColumns" [fields]="warmupFields" [visual]="warmupVisual" [picker]="picker" (changed)="reload()">
            <p legend class="legend">
              <span><b>Color = zona que prepara:</b></span>
              <span><i class="dot tone--amber"></i>Tren inferior</span>
              <span><i class="dot tone--steel"></i>Tren superior</span>
              <span><i class="dot tone--coral"></i>Con molestias</span>
              <span><i class="dot tone--emerald"></i>General</span>
              <span>Elige el ícono de cada protocolo al crearlo o editarlo.</span>
            </p>
          </app-catalog-crud>
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

  protected readonly picker: IconPicker = { kind: 'icon', options: PROTOCOL_ICONS };

  /** Ícono elegido por el coach; si no eligió, el del tipo de cardio. */
  protected readonly cardioVisual = (row: Row): RowVisual => {
    const base = CARDIO[String(row['type'])] ?? { icon: 'sliders' as IconName, tone: 'slate' as Tone };
    return { icon: chosenIcon(row) ?? base.icon, tone: base.tone };
  };

  /** El calentamiento no tiene "tipo": el color sale del nombre y el ícono lo elige el coach. */
  protected readonly warmupVisual = (row: Row): RowVisual => {
    const name = String(row['name'] ?? '');
    const base: RowVisual = /inferior|pierna/i.test(name)
      ? { icon: 'stretch', tone: 'amber' }
      : /empuje|tracci|superior|torso/i.test(name)
        ? { icon: 'dumbbell', tone: 'steel' }
        : /molestia|lesi|fr[ií]o/i.test(name)
          ? { icon: 'shield', tone: 'coral' }
          : { icon: 'flame', tone: 'emerald' };
    return { icon: chosenIcon(row) ?? base.icon, tone: base.tone };
  };

  protected readonly cardioColumns: CrudColumn[] = [
    { key: 'name', label: 'Nombre', sub: (row) => String(row['notes'] ?? '') },
    { key: 'type', label: 'Tipo', tone: (value) => CARDIO[String(value)]?.tone ?? 'slate' },
    { key: 'durationMin', label: 'Min', numeric: true },
    { key: 'intervals', label: 'Intervalos' },
    { key: 'rpe', label: 'RPE' },
    { key: 'hrZone', label: 'Zona FC' },
  ];
  protected readonly cardioFields: CrudField[] = [
    { key: 'name', label: 'Nombre', wide: true, section: 'Identificación' },
    { key: 'type', label: 'Tipo', type: 'select', options: ['Continuo', 'Intervalos', 'NEAT', 'Mixto'] },
    { key: 'durationMin', label: 'Duración (min)', type: 'number', step: 1, section: 'Dosis' },
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
    { key: 'name', label: 'Nombre', wide: true, section: 'Identificación' },
    { key: 'duration', label: 'Duración' },
    { key: 'general', label: 'Bloque 1 · General', type: 'textarea', wide: true, section: 'Bloques del calentamiento' },
    { key: 'mobility', label: 'Bloque 2 · Movilidad', type: 'textarea', wide: true },
    { key: 'activation', label: 'Bloque 3 · Activación', type: 'textarea', wide: true },
    { key: 'rampUpSets', label: 'Series de aproximación', type: 'textarea', wide: true },
    { key: 'rationale', label: 'Fundamento (evidencia)', type: 'textarea', wide: true },
  ];
}
