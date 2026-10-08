import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Btn } from '../../../components/buttons/btn';
import { PanelApi } from '../../../core/services/api/panel-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiError } from '../../../core/types/common.model';
import { PageHeader } from '../shared/page-header';
import { ClientFormValue, ClientProfileForm } from './client-profile-form';

@Component({
  selector: 'app-client-create',
  imports: [PageHeader, ClientProfileForm, Btn, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Nuevo cliente" subtitle="Llena lo que tengas: solo el nombre es obligatorio. El resto se puede completar después." backLink="/panel/clients" backLabel="Clientes" />
    <div class="top">
      <app-client-profile-form submitLabel="Dar de alta" [saving]="saving()" [errors]="errors()" (save)="create($event)">
        <a appBtn variant="ghost" routerLink="/panel/clients">Cancelar</a>
      </app-client-profile-form>
    </div>
  `,
  styles: `.top { margin-top: var(--space-5); }`,
})
export class ClientCreate {
  private readonly api = inject(PanelApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly saving = signal(false);
  protected readonly errors = signal<Record<string, string>>({});

  protected create(value: ClientFormValue): void {
    this.saving.set(true);
    this.api.createClient(value).subscribe({
      next: (client) => {
        this.toast.success('Cliente dado de alta. Su enlace privado ya está listo.');
        void this.router.navigate(['/panel/clients', client.id]);
      },
      error: (error: ApiError) => {
        this.saving.set(false);
        this.errors.set(error.fields ?? {});
      },
    });
  }
}
