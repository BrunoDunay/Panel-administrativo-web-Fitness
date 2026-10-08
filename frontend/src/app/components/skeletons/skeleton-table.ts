import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-skeleton-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    @for (row of rowList(); track $index) {
      <div class="row" [style.grid-template-columns]="'repeat(' + columns() + ', 1fr)'">
        @for (col of colList(); track $index) {
          <span class="skeleton cell" [style.width]="$index === 0 ? '80%' : '55%'"></span>
        }
      </div>
    }
  `,
  styles: `
    :host { display: block; }
    .row { display: grid; gap: var(--space-4); padding: var(--space-4) 0; border-bottom: var(--hairline); }
    .cell { height: 0.9em; }
  `,
})
export class SkeletonTable {
  readonly rows = input(6);
  readonly columns = input(4);
  protected readonly rowList = computed(() => Array.from({ length: this.rows() }));
  protected readonly colList = computed(() => Array.from({ length: this.columns() }));
}
