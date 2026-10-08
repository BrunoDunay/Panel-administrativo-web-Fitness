import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { combineLatest, debounceTime, switchMap } from 'rxjs';
import { Btn } from '../../../components/buttons/btn';
import { Icon } from '../../../components/icon/icon';
import { SkeletonTable } from '../../../components/skeletons/skeleton-table';
import { PanelApi } from '../../../core/services/api/panel-api.service';
import { ClientStatus } from '../../../core/types/client.model';
import { formatDate, initials } from '../../../core/utils/format';
import { PageHeader } from '../shared/page-header';

const STATUS_LABELS: Record<ClientStatus, string> = { active: 'Activo', paused: 'En pausa', archived: 'Archivado' };

@Component({
  selector: 'app-clients-list',
  imports: [RouterLink, PageHeader, Btn, Icon, SkeletonTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Clientes" subtitle="Expediente, planes y seguimiento de cada persona.">
      <a appBtn routerLink="/panel/clients/new"><app-icon name="plus" [size]="18" />Nuevo cliente</a>
    </app-page-header>

    <div class="toolbar">
      <label class="search">
        <app-icon name="search" [size]="18" />
        <span class="visually-hidden">Buscar cliente por nombre</span>
        <input type="search" placeholder="Buscar por nombre" [value]="search()" (input)="search.set($any($event.target).value)" />
      </label>
      <div class="tabs" role="tablist" aria-label="Estado">
        @for (option of statuses; track option.key) {
          <button type="button" class="tab" role="tab" [attr.aria-selected]="status() === option.key" (click)="status.set(option.key)">{{ option.label }}</button>
        }
      </div>
    </div>

    @if (clients(); as list) {
      @if (list.length) {
        <div class="card card--flush">
          <div class="table-wrap">
            <table class="table table--hover">
              <thead>
                <tr><th>Cliente</th><th>Objetivo</th><th>Entrenamiento</th><th>Nutrición</th><th>Plan</th><th>Próximo pago</th></tr>
              </thead>
              <tbody>
                @for (client of list; track client.id) {
                  <tr>
                    <td>
                      <a class="client" [routerLink]="['/panel/clients', client.id]">
                        <span class="avatar">{{ initials(client.fullName) }}</span>
                        <span>
                          <b>{{ client.fullName }}</b>
                          <small>{{ client.age !== null ? client.age + ' años' : 'Edad sin capturar' }} @if (client.status !== 'active') { · {{ statusLabel(client.status) }} }</small>
                        </span>
                      </a>
                    </td>
                    <td>{{ client.objective || '—' }}</td>
                    <td>
                      @if (client.hasTraining) { <span class="badge badge--success">{{ client.blockPhase || 'Activo' }}</span> } @else { <span class="badge badge--warning">Por armar</span> }
                    </td>
                    <td>
                      @if (client.hasNutrition) { <span class="badge badge--steel">{{ client.goal || 'Activo' }}</span> } @else { <span class="badge badge--warning">Por armar</span> }
                    </td>
                    <td>{{ client.planType || '—' }}</td>
                    <td>{{ date(client.paymentDate, true) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      } @else {
        <div class="card empty">
          <h3>{{ search() ? 'Sin resultados' : 'No hay clientes en esta lista' }}</h3>
          <p>{{ search() ? 'Prueba con otro nombre.' : 'Da de alta a un cliente para empezar a armar su plan.' }}</p>
          @if (!search()) {
            <a appBtn variant="soft" routerLink="/panel/clients/new">Nuevo cliente</a>
          }
        </div>
      }
    } @else {
      <div class="card"><app-skeleton-table /></div>
    }
  `,
  styles: `
    .toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3); margin-block: var(--space-5) var(--space-4); }
    .search { display: flex; align-items: center; gap: var(--space-2); flex: 1; max-width: 360px; min-height: 2.75rem; padding: 0 var(--space-4); border-radius: var(--radius-pill); background: var(--color-surface); box-shadow: var(--shadow-sm); color: var(--color-text-muted); }
    .search input { flex: 1; min-width: 0; border: 0; background: none; font-size: 1rem; color: var(--color-text); }
    .search input:focus { outline: none; }
    .search:focus-within { box-shadow: 0 0 0 3px var(--color-primary-soft); }
    .client { display: flex; align-items: center; gap: var(--space-3); }
    .client span:last-child { display: grid; line-height: 1.35; }
    .client small { color: var(--color-text-muted); }
  `,
})
export class ClientsList {
  private readonly api = inject(PanelApi);
  protected readonly search = signal('');
  protected readonly status = signal<ClientStatus | 'all'>('active');
  protected readonly statuses: { key: ClientStatus | 'all'; label: string }[] = [
    { key: 'active', label: 'Activos' },
    { key: 'paused', label: 'En pausa' },
    { key: 'archived', label: 'Archivados' },
    { key: 'all', label: 'Todos' },
  ];
  protected readonly date = formatDate;
  protected readonly initials = initials;
  protected readonly statusLabel = (status: ClientStatus) => STATUS_LABELS[status];

  protected readonly clients = toSignal(
    combineLatest([toObservable(this.search).pipe(debounceTime(250)), toObservable(this.status)]).pipe(
      switchMap(([search, status]) => this.api.clients({ search: search.trim(), status })),
    ),
  );
}
