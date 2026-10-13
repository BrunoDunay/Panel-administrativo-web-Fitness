import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  /** Tiempo que permanece visible (ms): el aviso dibuja con él su cuenta regresiva. */
  duration: number;
  /** Ya se está desmaterializando: se quita al terminar la animación de salida. */
  leaving: boolean;
}

/** Lo que dura la animación de salida del aviso. */
const LEAVE_MS = 460;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  success(message: string) {
    this.show('success', message);
  }

  error(message: string) {
    this.show('error', message, 6000);
  }

  info(message: string) {
    this.show('info', message);
  }

  /** Cierra un aviso: primero se desvanece y después se retira de la lista. */
  dismiss(id: number) {
    if (!this.toasts().some((t) => t.id === id && !t.leaving)) return;
    this.toasts.update((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => this.toasts.update((list) => list.filter((t) => t.id !== id)), LEAVE_MS);
  }

  private show(kind: ToastKind, message: string, duration = 4000) {
    const id = this.nextId++;
    this.toasts.update((list) => [...list.slice(-3), { id, kind, message, duration, leaving: false }]);
    setTimeout(() => this.dismiss(id), duration);
  }
}
