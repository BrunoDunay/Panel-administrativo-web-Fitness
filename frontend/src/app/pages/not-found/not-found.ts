import { ChangeDetectionStrategy, Component, RESPONSE_INIT, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandMark } from '../../components/brand/brand-mark';
import { SeoService } from '../../core/services/seo.service';

/** Página no encontrada, con la voz de la marca: a esta barra le falta un disco. */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink, BrandMark],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid" aria-hidden="true"></div>
    <section class="box">
      <p class="number display" aria-hidden="true"><span>4</span><app-brand-mark tone="light" [broken]="true" /><span>4</span></p>
      <p class="code">Error 404</p>
      <h1 class="display">Esta repetición no cuenta</h1>
      <p class="text">La página que buscas no existe o cambió de lugar. Volvamos a una que sí esté en el plan.</p>
      <a class="cta" routerLink="/">Volver al inicio</a>
    </section>
  `,
  styles: `
    :host { position: relative; display: grid; place-items: center; min-height: 100dvh; padding: var(--space-6) var(--gutter); background: var(--ink-0); color: var(--color-text-inverse); overflow: hidden; }
    .grid { position: absolute; inset: 0; background: radial-gradient(ellipse 60% 55% at 50% 40%, color-mix(in srgb, var(--color-primary) 55%, transparent), transparent 70%), linear-gradient(var(--ink-line) 1px, transparent 1px) 0 0 / 56px 56px, linear-gradient(90deg, var(--ink-line) 1px, transparent 1px) 0 0 / 56px 56px; mask-image: radial-gradient(ellipse 80% 75% at 50% 45%, #000 25%, transparent 78%); }
    .box { position: relative; display: grid; justify-items: center; gap: var(--space-4); max-width: 38rem; text-align: center; }
    .number { display: flex; align-items: center; gap: clamp(0.5rem, 2vw, 1.5rem); margin-bottom: var(--space-6); font-size: clamp(5rem, 2rem + 16vw, 12rem); line-height: 0.9; }
    .number span { animation: digit 900ms var(--ease-out) both; }
    .number span:last-child { animation-delay: 140ms; }
    .number app-brand-mark { width: clamp(7rem, 3rem + 18vw, 15rem); }
    .code { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.12em; text-transform: uppercase; color: var(--color-mint); }
    h1 { font-size: clamp(1.8rem, 1.1rem + 3.2vw, 3.2rem); line-height: 1.04; }
    .text { max-width: 30rem; color: var(--ink-muted); }
    .cta { display: inline-flex; align-items: center; min-height: 3rem; margin-top: var(--space-2); padding: 0.5rem 1.6rem; border-radius: var(--radius-pill); background: var(--color-mint); font-weight: 650; color: var(--ink-0); transition: transform var(--duration-fast) var(--ease-out), box-shadow var(--duration) var(--ease-out); }
    .cta:active { transform: scale(0.97); }
    @media (hover: hover) and (pointer: fine) { .cta:hover { transform: translateY(-2px); box-shadow: 0 14px 34px -14px var(--color-mint); } }
    @keyframes digit { from { opacity: 0; transform: translateY(40px) rotate(6deg); } }
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
