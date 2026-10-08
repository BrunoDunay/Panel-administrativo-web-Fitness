import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_URL } from '../config/api.config';
import { AuthService } from '../services/auth.service';

/** Agrega el JWT solo a peticiones dirigidas a nuestra API (nunca a Cloudinary u otros hosts). */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiUrl = inject(API_URL);
  const token = inject(AuthService).token();

  if (!token || !req.url.startsWith(apiUrl)) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
