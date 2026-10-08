import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Renderizado híbrido:
 * - Panel, login y portal del cliente: solo en el navegador (contenido privado, sin SEO).
 * - Landing: SSR en cada petición (contenido editable + Open Graph).
 */
export const serverRoutes: ServerRoute[] = [
  { path: 'panel/**', renderMode: RenderMode.Client },
  { path: 'panel', renderMode: RenderMode.Client },
  { path: 'login', renderMode: RenderMode.Client },
  { path: 'mi-plan/**', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Server },
];
