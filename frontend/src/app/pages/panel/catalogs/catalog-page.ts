import { inject, signal } from '@angular/core';
import { PanelApi } from '../../../core/services/api/panel-api.service';
import { Catalog } from '../../../core/types/catalog.model';

/** Base de las pantallas de catálogo: carga los catálogos y los vuelve a pedir tras cada cambio. */
export abstract class CatalogPage {
  private readonly api = inject(PanelApi);
  protected readonly catalog = signal<Catalog | null>(null);

  constructor() {
    this.reload();
  }

  protected reload(): void {
    this.api.catalog().subscribe((catalog) => this.catalog.set(catalog));
  }

  /** Las filas del catálogo como registros genéricos para la tabla. */
  protected rows<T extends object>(items: T[] | undefined): (Record<string, unknown> & { id?: number })[] {
    return (items ?? []) as unknown as (Record<string, unknown> & { id?: number })[];
  }
}
