import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BrandLoader } from '../brand/brand-loader';

/** Carga de un listado: muestra el cargador de la marca en el espacio que ocupará la tabla. */
@Component({
  selector: 'app-skeleton-table',
  imports: [BrandLoader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-brand-loader [style.--loader-min]="rows() * 2.6 + 'rem'" />`,
  styles: `:host { display: block; }`,
})
export class SkeletonTable {
  readonly rows = input(6);
  /** Se conserva por compatibilidad con quien ya lo usa; el cargador no dibuja columnas. */
  readonly columns = input(4);
}
