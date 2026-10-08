import { ChangeDetectionStrategy, Component, RESPONSE_INIT, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { Btn } from '../../components/buttons/btn';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, Btn],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section container container--narrow">
      <p class="eyebrow eyebrow--dash">Error 404</p>
      <h1>Esta página no existe</h1>
      <p class="text-muted">Puede que el enlace haya cambiado o que la página se haya eliminado.</p>
      <a appBtn variant="outline" routerLink="/">Volver al inicio</a>
    </section>
  `,
  styles: `
    section { display: grid; justify-items: center; gap: var(--space-4); text-align: center; min-height: 60vh; align-content: center; }
    h1 { font-size: var(--text-3xl); }
  `,
})
export class NotFound {
  constructor() {
    inject(SeoService).setPage({ title: 'Página no encontrada | Fitness by Evidence', noindex: true });
    // En SSR, responder con un 404 real (no un 200) para buscadores.
    const response = inject(RESPONSE_INIT, { optional: true });
    if (response) response.status = 404;
  }
}
