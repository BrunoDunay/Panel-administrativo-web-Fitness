import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SITE_URL } from '../config/api.config';

export interface PageSeo {
  title: string;
  description?: string | null;
  image?: string | null;
  /** Ruta relativa, ej. "/events/weddings". */
  path?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | null;
}

/** Título, meta description, Open Graph, Twitter, canonical y JSON-LD. Funciona en SSR. */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly siteUrl = inject(SITE_URL);

  setPage(seo: PageSeo): void {
    const url = `${this.siteUrl}${seo.path ?? ''}`;
    this.title.setTitle(seo.title);

    this.setTag('name', 'description', seo.description);
    this.setTag('name', 'robots', seo.noindex ? 'noindex, nofollow' : 'index, follow');
    this.setTag('property', 'og:title', seo.title);
    this.setTag('property', 'og:description', seo.description);
    this.setTag('property', 'og:type', seo.type ?? 'website');
    this.setTag('property', 'og:url', url);
    this.setTag('property', 'og:image', seo.image);
    this.setTag('property', 'og:locale', 'es_MX');
    this.setTag('name', 'twitter:card', seo.image ? 'summary_large_image' : 'summary');
    this.setTag('name', 'twitter:title', seo.title);
    this.setTag('name', 'twitter:description', seo.description);
    this.setTag('name', 'twitter:image', seo.image);

    this.setCanonical(url);
    this.setJsonLd(seo.jsonLd ?? null);
  }

  private setTag(attr: 'name' | 'property', key: string, content?: string | null): void {
    const selector = `${attr}="${key}"`;
    if (content) this.meta.updateTag({ [attr]: key, content }, selector);
    else this.meta.removeTag(selector);
  }

  private setCanonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = url;
  }

  private setJsonLd(data: Record<string, unknown> | null): void {
    this.document.head.querySelector('script[data-seo="jsonld"]')?.remove();
    if (!data) return;
    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo', 'jsonld');
    // Escapa "<" para que el contenido no pueda cerrar la etiqueta <script>.
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    this.document.head.appendChild(script);
  }
}
