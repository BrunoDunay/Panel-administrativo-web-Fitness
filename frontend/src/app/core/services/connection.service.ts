import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { API_URL } from '../config/api.config';

/** Cada cuánto se vuelve a intentar sola la conexión mientras se ve la pantalla de error. */
const RETRY_MS = 6000;

/**
 * Estado de la conexión con el servidor. El interceptor de errores avisa cuando una carga falla
 * por red; la app muestra entonces la pantalla "Sin conexión" y reintenta hasta que el servidor responde.
 */
@Injectable({ providedIn: 'root' })
export class ConnectionService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_URL);
  private timer: ReturnType<typeof setInterval> | undefined;

  readonly lost = signal(false);
  readonly checking = signal(false);

  report(): void {
    if (this.lost()) return;
    this.lost.set(true);
    this.timer = setInterval(() => this.retry(true), RETRY_MS);
  }

  /** Pregunta al servidor si ya responde; al volver, recarga para que cada pantalla pida sus datos. */
  retry(silent = false): void {
    if (this.checking()) return;
    if (!silent) this.checking.set(true);
    this.http.get(`${this.api}/health`).subscribe({
      next: () => {
        clearInterval(this.timer);
        window.location.reload();
      },
      error: () => setTimeout(() => this.checking.set(false), 700),
    });
  }
}
