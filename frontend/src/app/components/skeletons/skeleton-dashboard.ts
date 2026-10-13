import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BrandLoader } from '../brand/brand-loader';

/** Carga de una pantalla completa (resumen, expediente, portal). */
@Component({
  selector: 'app-skeleton-dashboard',
  imports: [BrandLoader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-brand-loader style="--loader-min: min(60dvh, 30rem)" />`,
  styles: `:host { display: block; }`,
})
export class SkeletonDashboard {}
