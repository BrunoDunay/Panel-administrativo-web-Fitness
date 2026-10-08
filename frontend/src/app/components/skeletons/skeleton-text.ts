import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Líneas de texto en carga. La última es más corta para parecer un párrafo real. */
@Component({
  selector: 'app-skeleton-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', class: 'skeleton-text' },
  template: `
    @for (width of widths(); track $index) {
      <span class="skeleton line" [style.width]="width" [style.height]="lineHeight()"></span>
    }
  `,
  styles: `
    :host { display: grid; gap: 0.6em; }
  `,
})
export class SkeletonText {
  readonly lines = input(3);
  readonly lineHeight = input('0.9em');
  protected readonly widths = computed(() =>
    Array.from({ length: this.lines() }, (_, i) => (i === this.lines() - 1 && this.lines() > 1 ? '60%' : '100%')),
  );
}
