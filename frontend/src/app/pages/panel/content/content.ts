import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Btn } from '../../../components/buttons/btn';
import { Icon } from '../../../components/icon/icon';
import { SkeletonDashboard } from '../../../components/skeletons/skeleton-dashboard';
import { PanelApi } from '../../../core/services/api/panel-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { SettingsSection, SiteSettings, TitledItem } from '../../../core/types/settings.model';
import { PageHeader } from '../shared/page-header';

/** Contenido de la landing: todo lo que ve el público se edita aquí, sin tocar código. */
@Component({
  selector: 'app-content',
  imports: [FormsModule, PageHeader, Btn, Icon, SkeletonDashboard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './content.html',
  styles: `
    .top { margin-top: var(--space-5); }
    .item { display: grid; grid-template-columns: 1fr auto; gap: var(--space-3); align-items: start; padding: var(--space-3); border-radius: var(--radius-md); background: var(--color-background); }
    .item__fields { display: grid; gap: var(--space-2); }
    .icon-btn { display: grid; place-items: center; width: 2.2rem; height: 2.2rem; border: 0; border-radius: 50%; background: transparent; color: var(--color-text-muted); }
    .foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3); }
    @media (hover: hover) and (pointer: fine) { .icon-btn:hover { background: var(--color-danger-soft); color: var(--color-danger); } }
  `,
})
export class Content {
  private readonly api = inject(PanelApi);
  private readonly toast = inject(ToastService);
  protected readonly site = signal<SiteSettings | null>(null);
  protected readonly saving = signal<SettingsSection | null>(null);

  constructor() {
    this.api.settings().subscribe((site) => this.site.set(structuredClone(site)));
  }

  protected addItem(list: TitledItem[]): void {
    list.push({ title: '', description: null });
  }

  protected addCredential(): void {
    this.site()!.about.credentials.push('');
  }

  protected remove<T>(list: T[], index: number): void {
    list.splice(index, 1);
  }

  /** Al guardar una sección, deja de estar marcada como provisional. */
  protected save<K extends SettingsSection>(section: K): void {
    const site = this.site();
    if (!site) return;
    const value = structuredClone(site[section]) as SiteSettings[K] & { isProvisional?: boolean; credentials?: string[]; items?: TitledItem[]; steps?: TitledItem[] };
    if ('isProvisional' in value) value.isProvisional = false;
    if (value.credentials) value.credentials = value.credentials.map((c) => c.trim()).filter(Boolean);
    if (value.items) value.items = value.items.filter((item) => item.title.trim());
    if (value.steps) value.steps = value.steps.filter((item) => item.title.trim());

    this.saving.set(section);
    this.api.saveSettings(section, value).subscribe({
      next: (saved) => {
        this.site.update((current) => (current ? { ...current, [section]: saved } : current));
        this.saving.set(null);
        this.toast.success('Sección guardada. Ya se ve en el sitio.');
      },
      error: () => this.saving.set(null),
    });
  }
}
