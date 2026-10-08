import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Encabezado de cada pantalla del panel: migas, título, descripción y acciones (ng-content). */
@Component({
  selector: 'app-page-header',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (backLink()) {
      <a class="back" [routerLink]="backLink()">← {{ backLabel() }}</a>
    }
    <div class="row">
      <div>
        <h1>{{ title() }}</h1>
        @if (subtitle()) {
          <p class="subtitle">{{ subtitle() }}</p>
        }
      </div>
      <div class="actions"><ng-content /></div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .back { display: inline-block; margin-bottom: var(--space-2); font-size: var(--text-sm); color: var(--color-text-muted); }
    .back:hover { color: var(--color-primary); }
    .row { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: var(--space-4); }
    h1 { font-size: var(--text-3xl); }
    .subtitle { margin-top: var(--space-1); color: var(--color-text-muted); }
    .actions { display: flex; flex-wrap: wrap; gap: var(--space-3); }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly backLink = input<string | null>(null);
  readonly backLabel = input('Volver');
}
