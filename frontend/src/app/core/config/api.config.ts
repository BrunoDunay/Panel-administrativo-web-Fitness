import { DOCUMENT, InjectionToken, REQUEST, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

/** URL base de la API (absoluta para que funcione también en SSR). */
export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root',
  factory: () => environment.apiUrl,
});

/**
 * URL pública del sitio (enlaces de tickets, canonical, Open Graph).
 * Si el entorno no fija una, es el dominio con el que se está visitando:
 * en SSR sale de la petición y en el navegador, de la barra de direcciones.
 */
export const SITE_URL = new InjectionToken<string>('SITE_URL', {
  providedIn: 'root',
  factory: () => {
    if (environment.siteUrl) return environment.siteUrl;
    const request = inject(REQUEST, { optional: true });
    if (request) return new URL(request.url).origin;
    return inject(DOCUMENT).location?.origin ?? '';
  },
});
