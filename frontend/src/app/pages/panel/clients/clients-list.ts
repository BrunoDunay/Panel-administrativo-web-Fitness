import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { combineLatest, debounceTime, switchMap } from 'rxjs';
import { Btn } from '../../../components/buttons/btn';
import { Icon, IconName } from '../../../components/icon/icon';
import { SkeletonTable } from '../../../components/skeletons/skeleton-table';
import { PanelApi } from '../../../core/services/api/panel-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { ClientListItem, ClientStatus } from '../../../core/types/client.model';
import { formatDate, initials } from '../../../core/utils/format';
import { Tone } from '../../../core/utils/visuals';
import { ConfirmService } from '../shared/confirm.service';
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
      <div class="filters" role="tablist" aria-label="Estado">
        @for (option of statuses; track option.key) {
          <button type="button" [class]="'filter tone--' + option.tone" role="tab" [attr.aria-selected]="status() === option.key" (click)="status.set(option.key)">
            <app-icon [name]="option.icon" [size]="16" />{{ option.label }}<b>{{ counts()[option.key] }}</b>
          </button>
        }
      </div>
    </div>

    @if (visible(); as list) {
      @if (list.length) {
        <button type="button" class="expand-all" (click)="toggleAll(list)"><app-icon name="list" [size]="15" />{{ allOpen(list) ? 'Contraer todos' : 'Ver el detalle de todos' }}</button>
        <div class="card card--flush">
          <div class="table-wrap">
            <table class="table table--hover">
              <thead>
                <tr><th>Cliente</th><th>Objetivo</th><th>Semana</th><th>Entrenamiento</th><th>Nutrición</th><th>Pago</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                @for (client of list; track client.id) {
                  <tr [class.is-open]="open().has(client.id)">
                    <td>
                      <div class="who">
                        <a class="client" [routerLink]="['/panel/clients', client.id]">
                          <span [class]="'avatar status--' + client.status">{{ initials(client.fullName) }}</span>
                          <span>
                            <b>{{ client.fullName }}</b>
                            <small>{{ client.age !== null ? client.age + ' años' : 'Edad sin capturar' }} @if (client.status !== 'active') { · <em [class]="'state state--' + client.status">{{ statusLabel(client.status) }}</em> }</small>
                          </span>
                        </a>
                        <!-- Teléfono: cada cliente llega plegado; este botón despliega su detalle. -->
                        <button type="button" class="toggle" [attr.aria-expanded]="open().has(client.id)" [attr.aria-label]="(open().has(client.id) ? 'Ocultar' : 'Ver') + ' el detalle de ' + client.fullName" (click)="toggle(client.id)"><app-icon name="chevronDown" [size]="18" /></button>
                      </div>
                    </td>
                    <td>{{ client.objective || '—' }}</td>
                    <td>
                      @if (client.currentWeek) {
                        <span class="week">
                          <b>Semana {{ client.currentWeek }}</b>
                          <small [class.late]="(client.lastCheckinWeek ?? 0) < client.currentWeek - 1">{{ client.lastCheckinWeek ? 'Cuestionario: sem ' + client.lastCheckinWeek : 'Sin cuestionario' }}</small>
                        </span>
                      } @else {
                        —
                      }
                    </td>
                    <td>
                      @if (client.hasTraining) { <span class="badge badge--success">{{ client.blockPhase || 'Activo' }}</span> } @else { <span class="badge badge--warning">Por armar</span> }
                    </td>
                    <td>
                      @if (client.hasNutrition) { <span class="badge badge--steel">{{ client.goal || 'Activo' }}</span> } @else { <span class="badge badge--warning">Por armar</span> }
                    </td>
                    <!-- Pago en una sola columna: fecha, tipo de plan y, si venció, el acceso al enlace. -->
                    <td>
                      <span class="pay">
                        @if (client.paymentDate) {
                          <span class="badge" [class.badge--danger]="client.paymentState === 'overdue'" [class.badge--steel]="client.paymentState === 'soon'" [class.badge--success]="client.paymentState === 'ok'">{{ date(client.paymentDate, true) }}{{ client.paymentState === 'overdue' ? ' · vencido' : '' }}</span>
                        } @else if (!client.planType) {
                          —
                        }
                        @if (client.planType) { <small>Plan {{ client.planType.toLowerCase() }}</small> }
                        @if (client.paymentState === 'overdue') {
                          <button type="button" class="access" [class.is-locked]="client.paymentLocked" (click)="toggleAccess(client)" [title]="client.paymentLocked ? 'Su enlace está bloqueado por pago vencido. Clic para permitirle el acceso.' : 'Tiene permiso aunque el pago venció. Clic para bloquear.'">
                            <app-icon name="lock" [size]="14" />{{ client.paymentLocked ? 'Acceso bloqueado' : 'Acceso permitido' }}
                          </button>
                        }
                      </span>
                    </td>
                    <td>
                      <span class="acts">
                        @if (client.status === 'active') {
                          <button type="button" class="act act--pause" (click)="changeStatus(client, 'paused')"><app-icon name="clock" [size]="14" />Pausar</button>
                        } @else {
                          <button type="button" class="act act--resume" (click)="changeStatus(client, 'active')"><app-icon name="refresh" [size]="14" />Reactivar</button>
                        }
                        @if (client.status !== 'archived') {
                          <button type="button" class="act act--archive" (click)="changeStatus(client, 'archived')"><app-icon name="bookmark" [size]="14" />Archivar</button>
                        }
                      </span>
                    </td>
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
    .week { display: grid; line-height: 1.3; white-space: nowrap; }
    /* La tabla nunca se desplaza de lado: las etiquetas largas parten renglón antes de ensancharla. */
    .table .badge { white-space: normal; }
    .pay { display: grid; justify-items: start; gap: var(--space-1); line-height: 1.3; }
    .pay small { font-size: var(--text-xs); color: var(--color-text-muted); }
    .week small { font-size: var(--text-xs); color: var(--color-text-muted); }
    .week small.late { font-weight: 700; color: var(--color-warning); }
    .access { display: inline-flex; align-items: center; gap: var(--space-1); min-height: 2rem; padding: 0.2rem 0.7rem; border: 1px solid var(--color-success); border-radius: var(--radius-pill); background: var(--color-success-soft); font-size: var(--text-xs); font-weight: 700; white-space: nowrap; color: var(--color-success); transition: transform 140ms var(--ease-out); }
    .access:active { transform: scale(0.96); }

    /* Filtro por estado: cada uno con su color; el elegido va relleno. */
    .filters { display: flex; flex-wrap: wrap; gap: var(--space-2); }
    .filter { display: inline-flex; align-items: center; gap: var(--space-2); min-height: 2.5rem; padding: 0.3rem 0.9rem; border: 1.5px solid transparent; border-radius: var(--radius-pill); background: var(--tone-soft); font-size: var(--text-sm); font-weight: 700; white-space: nowrap; color: var(--tone-ink); transition: transform 140ms var(--ease-out), box-shadow var(--duration-fast); }
    .filter:active { transform: scale(0.97); }
    .filter b { min-width: 1.5rem; padding: 0 0.4rem; border-radius: var(--radius-pill); background: var(--color-surface); font-size: var(--text-xs); line-height: 1.5rem; text-align: center; font-variant-numeric: tabular-nums; color: var(--tone-ink); }
    .filter[aria-selected='true'] { background: var(--tone-gradient); color: var(--color-text-inverse); box-shadow: 0 8px 16px -8px var(--tone); }

    .who { display: flex; align-items: center; gap: var(--space-2); }
    .who .client { flex: 1; min-width: 0; }
    .avatar.status--paused { background: var(--tone-amber-soft); color: var(--tone-amber-ink); }
    .avatar.status--archived { background: var(--tone-slate-soft); color: var(--tone-slate-ink); }
    .state { font-style: normal; font-weight: 700; }
    .state--paused { color: var(--tone-amber-ink); }
    .state--archived { color: var(--tone-slate-ink); }
    .toggle, .expand-all { display: none; }

    /* Pausar, archivar o reactivar sin abrir el expediente. */
    .acts { display: inline-flex; flex-wrap: wrap; gap: var(--space-1); }
    .act { display: inline-flex; align-items: center; gap: var(--space-1); min-height: 2rem; padding: 0.2rem 0.7rem; border: 1px solid var(--color-border-strong); border-radius: var(--radius-pill); background: var(--color-surface); font-size: var(--text-xs); font-weight: 700; white-space: nowrap; color: var(--color-text-muted); transition: transform 140ms var(--ease-out); }
    .act:active { transform: scale(0.96); }
    .act--pause { border-color: var(--tone-amber); background: var(--tone-amber-soft); color: var(--tone-amber-ink); }
    .act--resume { border-color: var(--color-success); background: var(--color-success-soft); color: var(--color-success); }

    @media (max-width: 720px) {
      .filters { width: 100%; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .filter { justify-content: space-between; }
      .filter app-icon { flex: none; }
      .filter b { margin-left: auto; }
    }

    /* Pantallas medianas: el objetivo se consulta en el expediente y la tabla cabe sin desplazarse. */
    @media (min-width: 1281px) and (max-width: 1440px) {
      .table th:nth-child(2), .table td:nth-child(2) { display: none; }
    }

    /* Sin ancho para la tabla (tableta y teléfono): cada cliente es una tarjeta plegada con su nombre. */
    @media (max-width: 1280px) {
      .table, .table tbody, .table tr, .table td { display: block; width: 100%; }
      .table thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
      .table tr { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: var(--space-3) var(--space-4); padding: var(--space-3) var(--space-4); border-bottom: var(--hairline); }
      .table tbody tr:last-child { border-bottom: 0; }
      .table td { display: grid; align-content: start; justify-items: start; gap: 2px; min-width: 0; padding: 0; border: 0; text-align: left; }
      .table td::before { content: attr(data-label); font-size: 0.68rem; font-weight: 700; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--color-text-muted); }
      .table td:first-child, .table td:last-child { grid-column: 1 / -1; }
      .table td:first-child { font-size: var(--text-base); }
      .table td:first-child::before { content: none; }
      /* Plegado: solo el nombre. Al desplegar aparecen sus datos y sus acciones. */
      .table tr:not(.is-open) td:not(:first-child) { display: none; }
      .expand-all { display: inline-flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-3); padding: 0; border: 0; background: none; font-size: var(--text-sm); font-weight: 700; color: var(--color-primary); }
      /* El botón de desplegar va pegado al borde derecho de la tarjeta. */
      .who { width: 100%; max-width: none; justify-self: stretch; }
      .toggle { display: grid; place-items: center; flex: none; width: 2.5rem; height: 2.5rem; margin-left: auto; margin-right: calc(var(--space-3) * -1); border: 0; border-radius: 50%; background: var(--color-surface-alt); color: var(--color-text-muted); transition: rotate var(--duration) var(--ease-out); }
      .toggle[aria-expanded='true'] { background: var(--color-primary-soft); color: var(--color-primary); rotate: 180deg; }
    }
    .access.is-locked { border-color: var(--color-danger); background: var(--color-danger-soft); color: var(--color-danger); }
  `,
})
export class ClientsList {
  private readonly api = inject(PanelApi);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  protected readonly search = signal('');
  /** Cambia para volver a pedir la lista. */
  private readonly version = signal(0);
  protected readonly status = signal<ClientStatus | 'all'>('active');
  protected readonly statuses: { key: ClientStatus | 'all'; label: string; tone: Tone; icon: IconName }[] = [
    { key: 'active', label: 'Activos', tone: 'emerald', icon: 'userCheck' },
    { key: 'paused', label: 'En pausa', tone: 'amber', icon: 'clock' },
    { key: 'archived', label: 'Archivados', tone: 'slate', icon: 'bookmark' },
    { key: 'all', label: 'Todos', tone: 'steel', icon: 'users' },
  ];
  /** Clientes con el detalle desplegado (en teléfono llegan plegados). */
  protected readonly open = signal<ReadonlySet<string>>(new Set());
  protected readonly date = formatDate;
  protected readonly initials = initials;
  protected readonly statusLabel = (status: ClientStatus) => STATUS_LABELS[status];

  /** Se piden todos y el estado se filtra aquí: así cada filtro muestra cuántos tiene. */
  protected readonly clients = toSignal(
    combineLatest([toObservable(this.search).pipe(debounceTime(250)), toObservable(this.version)]).pipe(switchMap(([search]) => this.api.clients({ search: search.trim(), status: 'all' }))),
  );
  protected readonly visible = computed(() => {
    const status = this.status();
    return this.clients()?.filter((client) => status === 'all' || client.status === status);
  });
  protected readonly counts = computed(() => {
    const list = this.clients() ?? [];
    const of = (status: ClientStatus) => list.filter((client) => client.status === status).length;
    return { active: of('active'), paused: of('paused'), archived: of('archived'), all: list.length };
  });

  protected toggle(id: string): void {
    const next = new Set(this.open());
    if (!next.delete(id)) next.add(id);
    this.open.set(next);
  }

  protected allOpen(list: ClientListItem[]): boolean {
    return list.every((client) => this.open().has(client.id));
  }

  protected toggleAll(list: ClientListItem[]): void {
    this.open.set(this.allOpen(list) ? new Set() : new Set(list.map((client) => client.id)));
  }

  protected async changeStatus(client: ClientListItem, status: ClientStatus): Promise<void> {
    const name = client.fullName;
    if (status === 'paused') {
      const ok = await this.confirm.ask({ title: `¿Poner en pausa a ${name}?`, message: 'Sale de tus clientes activos y del resumen, pero conserva su plan y su enlace sigue funcionando. Puedes reactivarlo cuando quieras.', confirmLabel: 'Poner en pausa' });
      if (!ok) return;
    }
    if (status === 'archived') {
      const ok = await this.confirm.ask({ title: `¿Archivar a ${name}?`, message: 'Su enlace privado deja de funcionar y sale de tus listas. No se borra nada: su expediente, sus planes y su seguimiento se conservan, y puedes reactivarlo cuando quieras.', confirmLabel: 'Archivar', danger: true });
      if (!ok) return;
    }
    const done: Record<ClientStatus, string> = { active: `${name} vuelve a estar activo.`, paused: `${name} quedó en pausa.`, archived: `${name} quedó archivado.` };
    this.api.setClientStatus(client.id, status).subscribe(() => {
      this.toast.success(done[status]);
      this.version.update((n) => n + 1);
    });
  }

  /** Con el pago vencido, un clic permite el acceso (por un acuerdo) o lo vuelve a bloquear. */
  protected toggleAccess(client: ClientListItem): void {
    this.api.setOverdueAccess(client.id, client.paymentLocked).subscribe(() => this.version.update((n) => n + 1));
  }
}
