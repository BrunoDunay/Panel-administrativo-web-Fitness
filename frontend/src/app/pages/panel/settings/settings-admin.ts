import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Btn } from '../../../components/buttons/btn';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiError } from '../../../core/types/common.model';
import { PageHeader } from '../shared/page-header';

@Component({
  selector: 'app-settings-admin',
  imports: [ReactiveFormsModule, PageHeader, Btn],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Cuenta" subtitle="Tu acceso al panel." />

    <div class="stack top">
      <section class="card">
        <dl class="dl">
          <dt>Nombre</dt><dd>{{ auth.admin()?.name }}</dd>
          <dt>Email</dt><dd>{{ auth.admin()?.email }}</dd>
        </dl>
      </section>

      <form class="card form-section" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <h2 class="form-section__title">Cambiar contraseña</h2>
        <div class="form-grid">
          <label class="field">
            <span class="field__label">Contraseña actual</span>
            <input class="field__control" type="password" formControlName="currentPassword" autocomplete="current-password" [attr.aria-invalid]="!!errors()['currentPassword']" />
            @if (errors()['currentPassword']) { <span class="field__error">{{ errors()['currentPassword'] }}</span> }
          </label>
          <label class="field">
            <span class="field__label">Nueva contraseña</span>
            <input class="field__control" type="password" formControlName="newPassword" autocomplete="new-password" [attr.aria-invalid]="invalid() || !!errors()['newPassword']" />
            @if (errors()['newPassword']) {
              <span class="field__error">{{ errors()['newPassword'] }}</span>
            } @else {
              <span class="field__hint">Mínimo 10 caracteres.</span>
            }
          </label>
        </div>
        <div><button appBtn type="submit" [loading]="saving()" [disabled]="saving()">Actualizar contraseña</button></div>
      </form>

      <section class="card row row--between">
        <div>
          <h2 class="card__title">Cerrar sesión</h2>
          <p class="card__hint">Sal del panel en este dispositivo.</p>
        </div>
        <button appBtn type="button" variant="outline" (click)="auth.logout()">Cerrar sesión</button>
      </section>
    </div>
  `,
  styles: `.top { margin-top: var(--space-5); max-width: 760px; }`,
})
export class SettingsAdmin {
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly saving = signal(false);
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly form = inject(NonNullableFormBuilder).group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(10)]],
  });

  protected invalid(): boolean {
    const control = this.form.controls.newPassword;
    return control.invalid && control.touched;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errors.set(this.form.controls.newPassword.invalid ? { newPassword: 'La nueva contraseña debe tener al menos 10 caracteres.' } : { currentPassword: 'Escribe tu contraseña actual.' });
      return;
    }
    this.saving.set(true);
    this.errors.set({});
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.reset();
        this.toast.success('Contraseña actualizada.');
      },
      error: (error: ApiError) => {
        this.saving.set(false);
        this.errors.set(error.fields ?? {});
      },
    });
  }
}
