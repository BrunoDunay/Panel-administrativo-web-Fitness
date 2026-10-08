import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { Icon } from '../../components/icon/icon';
import { AuthService } from '../../core/services/auth.service';
import { initials } from '../../core/utils/format';
import { PANEL_NAV } from './panel-nav';
import { PanelUiStyles } from '../../pages/panel/shared/panel-ui-styles';
import { ConfirmDialog } from '../../pages/panel/shared/confirm-dialog';

/** Layout del panel: barra lateral verde bosque + contenido claro en un panel redondeado. */
@Component({
  selector: 'app-panel-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, PanelUiStyles, ConfirmDialog, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './panel-layout.html',
  styleUrl: './panel-layout.css',
})
export class PanelLayout {
  protected readonly auth = inject(AuthService);
  protected readonly nav = PANEL_NAV;
  protected readonly menuOpen = signal(false);
  protected readonly initials = initials;

  constructor() {
    // En móvil, cerrar el menú al navegar.
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menuOpen.set(false));
  }
}
