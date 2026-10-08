import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonTable } from './skeleton-table';

@Component({
  selector: 'app-skeleton-dashboard',
  imports: [SkeletonTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <div class="stats">
      @for (stat of stats; track $index) {
        <div class="stat">
          <span class="skeleton label"></span>
          <span class="skeleton value"></span>
        </div>
      }
    </div>
    <app-skeleton-table [rows]="5" [columns]="4" />
  `,
  styles: `
    :host { display: grid; gap: var(--space-6); }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-4); }
    .stat { display: grid; gap: var(--space-3); padding: var(--space-5); border: var(--hairline); background: var(--color-surface); }
    .label { width: 50%; height: 0.75em; }
    .value { width: 35%; height: 1.8em; }
  `,
})
export class SkeletonDashboard {
  protected readonly stats = Array.from({ length: 3 });
}
