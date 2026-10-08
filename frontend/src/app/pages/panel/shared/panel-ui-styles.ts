import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

/** Inyecta panel-ui.css (sin encapsulación) una sola vez, solo cuando se carga el panel. */
@Component({
  selector: 'app-panel-ui-styles',
  template: '',
  styleUrl: './panel-ui.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelUiStyles {}
