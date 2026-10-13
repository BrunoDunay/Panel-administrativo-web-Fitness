import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { BrandLoader } from './components/brand/brand-loader';
import { ConnectionLost } from './components/brand/connection-lost';
import { ToastOutlet } from './components/toast/toast-outlet';
import { ConnectionService } from './core/services/connection.service';

/** Una navegación más rápida que esto no enseña cargador: evitaría un parpadeo. */
const LOADER_DELAY_MS = 220;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastOutlet, BrandLoader, ConnectionLost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Van antes que la página: si una pantalla falla al pintarse sin datos, estas capas ya se actualizaron. -->
    @if (connection.lost()) {
      <app-connection-lost />
    }
    @if (navigating()) {
      <app-brand-loader [overlay]="true" [dark]="true" />
    }
    <router-outlet />
    <app-toast-outlet />
  `,
})
export class App {
  protected readonly connection = inject(ConnectionService);
  /** Se está descargando la siguiente sección (las pantallas se cargan bajo demanda). */
  protected readonly navigating = signal(false);

  constructor() {
    // En el servidor no hay nada que esperar: la página sale ya renderizada.
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
    inject(Router)
      .events.pipe(takeUntilDestroyed())
      .subscribe((event) => {
        if (event instanceof NavigationStart) {
          clearTimeout(timer);
          timer = setTimeout(() => this.navigating.set(true), LOADER_DELAY_MS);
        } else if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
          clearTimeout(timer);
          this.navigating.set(false);
        }
      });
  }
}
