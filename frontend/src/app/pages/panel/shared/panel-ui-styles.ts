import { ChangeDetectionStrategy, Component, DestroyRef, ViewEncapsulation, afterNextRender, inject } from '@angular/core';

/** Copia el encabezado de cada columna a sus celdas: en el teléfono la tabla se apila y cada dato lleva su etiqueta. */
function labelTables(root: ParentNode): void {
  for (const table of root.querySelectorAll<HTMLTableElement>('table.table')) {
    const heads = Array.from(table.querySelectorAll('thead tr:last-child th'), (th) => (th.textContent ?? '').replace(/\s+/g, ' ').trim());
    if (!heads.length) continue;
    for (const row of table.querySelectorAll('tbody tr, tfoot tr')) {
      let column = 0;
      for (const cell of row.children as HTMLCollectionOf<HTMLTableCellElement>) {
        const label = heads[column] ?? '';
        if (cell.dataset['label'] !== label) cell.dataset['label'] = label;
        column += cell.colSpan || 1;
      }
    }
  }
}

/**
 * Inyecta panel-ui.css (sin encapsulación) una sola vez, solo cuando se carga el panel o el portal,
 * y mantiene etiquetadas las celdas de todas las tablas para su versión apilada de teléfono.
 */
@Component({
  selector: 'app-panel-ui-styles',
  template: '',
  styleUrl: './panel-ui.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelUiStyles {
  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      let pending = 0;
      const run = () => {
        pending = 0;
        labelTables(document);
      };
      // Las tablas cambian con cada dato nuevo: se vuelve a etiquetar, como mucho, una vez por cuadro.
      const observer = new MutationObserver(() => (pending ||= requestAnimationFrame(run)));
      observer.observe(document.body, { childList: true, subtree: true });
      run();
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
