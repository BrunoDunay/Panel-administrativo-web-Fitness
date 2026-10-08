import { AngularAppEngine, createRequestHandler } from '@angular/ssr';
import { getAllowedHosts, getContext, getTrustProxyHeaders } from '@netlify/angular-runtime/app-engine.js';
import { env } from 'node:process';
import { environment } from './environments/environment';

/**
 * Servidor del sitio (SSR) para Netlify: corre como Edge Function, sin Express.
 * También lo usa `ng serve` en desarrollo.
 *
 * El complemento de Netlify exige que este archivo exporte `netlifyAppEngineHandler` y `reqHandler`.
 */
const angularAppEngine = new AngularAppEngine({
  // En Netlify, los dominios permitidos salen de las variables del sitio (incluye el dominio propio si se conecta uno).
  allowedHosts: env['SITE_ID'] ? getAllowedHosts() : [],
  trustProxyHeaders: getTrustProxyHeaders(),
});

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  // El enlace privado del cliente va en la URL: nunca se comparte con otros sitios.
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  ...(environment.production ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {}),
};

/** robots.txt: el panel, el login y los planes de los clientes no se indexan. */
function robots(origin: string): Response {
  const body = ['User-agent: *', 'Allow: /', 'Disallow: /panel', 'Disallow: /login', 'Disallow: /mi-plan/', '', `Sitemap: ${origin}/sitemap.xml`, ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
}

function sitemap(origin: string): Response {
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${origin}/</loc></url>\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}

/** Agrega los encabezados de seguridad a la página renderizada. */
function secured(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export async function netlifyAppEngineHandler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === '/robots.txt') return robots(url.origin);
  if (url.pathname === '/sitemap.xml') return sitemap(url.origin);

  const context = getContext();
  const result = await angularAppEngine.handle(request, context);
  return result ? secured(result) : new Response('Not found', { status: 404 });
}

/**
 * Manejador usado por el Angular CLI (servidor de desarrollo y build).
 */
export const reqHandler = createRequestHandler(netlifyAppEngineHandler);
