import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Btn } from '../../../components/buttons/btn';
import { Icon } from '../../../components/icon/icon';
import { SkeletonDashboard } from '../../../components/skeletons/skeleton-dashboard';
import { PanelApi } from '../../../core/services/api/panel-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { formatDate, initials } from '../../../core/utils/format';
import { PageHeader } from '../shared/page-header';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, PageHeader, Btn, Icon, SkeletonDashboard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly api = inject(PanelApi);
  protected readonly name = inject(AuthService).admin()?.name.split(' ')[0] ?? '';
  protected readonly data = toSignal(this.api.dashboard());
  protected readonly site = toSignal(this.api.settings());
  protected readonly date = formatDate;
  protected readonly initials = initials;

  /** Secciones de la landing que siguen con contenido provisional. */
  protected pendingSections(): string[] {
    const site = this.site();
    if (!site) return [];
    const labels: Record<string, string> = { hero: 'Portada', services: 'Servicios', method: 'Método', about: 'Sobre el coach', contact: 'Contacto' };
    return Object.entries(labels)
      .filter(([key]) => (site as unknown as Record<string, { isProvisional?: boolean }>)[key]?.isProvisional)
      .map(([, label]) => label);
  }
}
