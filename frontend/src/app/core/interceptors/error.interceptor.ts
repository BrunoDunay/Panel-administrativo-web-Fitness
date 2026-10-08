import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_URL } from '../config/api.config';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { ApiError } from '../types/common.model';

function toApiError(error: HttpErrorResponse): ApiError {
  if (error.status === 0) {
    return { status: 0, code: 'NETWORK_ERROR', message: 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.' };
  }
  const body = error.error?.error;
  return {
    status: error.status,
    code: body?.code ?? 'UNKNOWN_ERROR',
    message: body?.message ?? 'Ocurrió un error inesperado. Intenta de nuevo.',
    fields: body?.fields,
  };
}

/**
 * Normaliza los errores de la API a `ApiError`.
 * - 401 en el panel: cierra sesión y manda a /login conservando la página de retorno.
 * - Errores en acciones (POST/PUT/PATCH/DELETE) o de red/servidor: muestra un toast.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const apiUrl = inject(API_URL);
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || !req.url.startsWith(apiUrl)) return throwError(() => error);

      const apiError = toApiError(error);
      const isLogin = req.url.endsWith('/auth/login');

      if (apiError.status === 401 && !isLogin && auth.token()) {
        auth.logout(false);
        if (isBrowser) {
          toast.info(apiError.message);
          void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
        }
      } else if (isBrowser && !isLogin && apiError.status !== 401) {
        const isMutation = req.method !== 'GET';
        const isServerProblem = apiError.status === 0 || apiError.status >= 500;
        if ((isMutation && !apiError.fields) || isServerProblem) toast.error(apiError.message);
      }

      return throwError(() => apiError);
    }),
  );
};
