import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandMark } from '../../components/brand/brand-mark';
import { SeoService } from '../../core/services/seo.service';
import { LEGAL_DOCS, LegalDoc } from './legal-content';

/** Aviso de privacidad, términos y política de cookies: una sola página con tres contenidos. */
@Component({
  selector: 'app-legal',
  imports: [RouterLink, BrandMark],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="top">
      <div class="container top__inner">
        <a class="brand" routerLink="/" aria-label="Fitness by Evidence, inicio">
          <app-brand-mark tone="light" build="load" [replay]="true" />
          <span class="display">Fitness by Evidence</span>
        </a>
        <a class="back" routerLink="/">← Volver al sitio</a>
      </div>
    </header>

    <main class="container doc">
      <aside class="index">
        <p class="index__label">Documentos</p>
        <nav aria-label="Documentos legales">
          @for (item of docs; track item.slug) {
            <a [routerLink]="'/' + item.slug" [class.is-active]="item.slug === doc().slug">{{ item.title }}</a>
          }
        </nav>
      </aside>

      <article>
        <p class="eyebrow">Actualizado el {{ doc().updated }}</p>
        <h1 class="display">{{ doc().title }}</h1>
        <p class="summary">{{ doc().summary }}</p>

        @for (section of doc().sections; track section.title; let i = $index) {
          <section>
            <h2><span class="num">{{ i + 1 < 10 ? '0' + (i + 1) : i + 1 }}</span>{{ section.title }}</h2>
            @for (text of section.paragraphs ?? []; track $index) {
              <p>{{ text }}</p>
            }
            @if (section.items?.length) {
              <ul>
                @for (item of section.items; track $index) {
                  <li>{{ item }}</li>
                }
              </ul>
            }
          </section>
        }
      </article>
    </main>

    <footer class="foot">
      <div class="container foot__inner">
        <p>© {{ year }} Fitness by Evidence · Germain Camarillo</p>
        <nav aria-label="Legal">
          @for (item of docs; track item.slug) {
            <a [routerLink]="'/' + item.slug">{{ item.title }}</a>
          }
        </nav>
      </div>
    </footer>
  `,
  styles: `
    :host { display: block; min-height: 100dvh; background: var(--ink-0); color: var(--color-text-inverse); }
    .top { position: sticky; top: 0; z-index: var(--z-navbar); border-bottom: 1px solid var(--ink-line); background: color-mix(in srgb, var(--ink-0) 85%, transparent); backdrop-filter: blur(14px); }
    .top__inner { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); min-height: var(--navbar-height); }
    .brand { display: inline-flex; align-items: center; gap: var(--space-3); }
    .brand app-brand-mark { width: 64px; }
    .brand span { font-size: 1.02rem; }
    .back { font-size: var(--text-sm); color: var(--ink-muted); transition: color var(--duration-fast); }
    .doc { display: grid; grid-template-columns: 15rem minmax(0, 44rem); gap: var(--space-8); padding-block: var(--space-8) var(--space-9); }
    .index { position: sticky; top: calc(var(--navbar-height) + var(--space-6)); align-self: start; }
    .index__label, .eyebrow { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-mint); }
    .index nav { display: grid; margin-top: var(--space-3); border-left: 1px solid var(--ink-line); }
    .index a { padding: var(--space-2) var(--space-4); margin-left: -1px; border-left: 2px solid transparent; font-size: var(--text-sm); color: var(--ink-muted); transition: color var(--duration-fast), border-color var(--duration) var(--ease-out); }
    .index a.is-active { border-color: var(--color-mint); color: var(--color-text-inverse); font-weight: 600; }
    article { animation: doc-in 520ms var(--ease-out) both; }
    @keyframes doc-in { from { opacity: 0; transform: translateY(18px); } }
    h1 { margin-block: var(--space-3) var(--space-4); font-size: clamp(2rem, 1.2rem + 3.4vw, 3.6rem); line-height: 1.04; }
    .summary { padding-bottom: var(--space-6); border-bottom: 1px solid var(--ink-line); font-size: var(--text-lg); color: var(--ink-muted); }
    section { padding-block: var(--space-6); border-bottom: 1px solid var(--ink-line); }
    h2 { display: flex; align-items: baseline; gap: var(--space-3); margin-bottom: var(--space-3); font-size: var(--text-xl); font-weight: 600; letter-spacing: -0.02em; }
    .num { font-family: var(--font-mono); font-size: var(--text-xs); font-weight: 500; color: var(--color-mint); }
    section p, section li { color: var(--ink-muted); line-height: 1.7; }
    section p + p, section p + ul, section ul + p { margin-top: var(--space-3); }
    ul { display: grid; gap: var(--space-2); padding-left: 1.2rem; }
    li::marker { color: var(--color-mint); }
    .foot { border-top: 1px solid var(--ink-line); font-size: var(--text-sm); color: var(--ink-muted); }
    .foot__inner { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-3); padding-block: var(--space-5); }
    .foot nav { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-5); }
    @media (hover: hover) and (pointer: fine) { .back:hover, .index a:hover, .foot a:hover { color: var(--color-text-inverse); } }
    @media (max-width: 860px) {
      .doc { grid-template-columns: minmax(0, 1fr); gap: var(--space-5); padding-block: var(--space-6) var(--space-8); }
      .index { position: static; }
      .index nav { display: flex; flex-wrap: wrap; gap: var(--space-2); border-left: 0; }
      .index a { margin: 0; padding: var(--space-2) var(--space-4); border: 1px solid var(--ink-line); border-radius: var(--radius-pill); }
      .index a.is-active { border-color: var(--color-mint); }
      .brand span, .back { font-size: var(--text-xs); }
    }
  `,
})
export class Legal {
  /** Llega de los datos de la ruta. */
  readonly slug = input.required<LegalDoc['slug']>();
  protected readonly docs = Object.values(LEGAL_DOCS);
  protected readonly doc = computed(() => LEGAL_DOCS[this.slug()]);
  protected readonly year = new Date().getFullYear();

  constructor() {
    const seo = inject(SeoService);
    // El título se fija con el documento de la ruta inicial; al cambiar de documento se actualiza.
    queueMicrotask(() => seo.setPage({ title: `${this.doc().title} | Fitness by Evidence`, description: this.doc().summary, path: `/${this.doc().slug}` }));
  }
}
