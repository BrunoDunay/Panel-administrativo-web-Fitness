import { HttpInterceptorFn } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { timeout } from 'rxjs';

/** Tiempo máximo que el render en servidor espera a la API. */
const SSR_TIMEOUT_MS = 8000;

/**
 * Durante el render en servidor (SSR) ninguna petición a la API espera más de unos segundos.
 * Si el backend está lento o despertando, la página se entrega igual (con sus esqueletos de carga)
 * y el navegador vuelve a pedir los datos; así el sitio nunca se queda colgado.
 */
export const ssrTimeoutInterceptor: HttpInterceptorFn = (req, next) =>
  isPlatformServer(inject(PLATFORM_ID)) ? next(req).pipe(timeout(SSR_TIMEOUT_MS)) : next(req);
