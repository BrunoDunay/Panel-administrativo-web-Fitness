import { ChangeDetectionStrategy, Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { BUILD_INFO } from '../../../core/system/build-info';
import { ChangeKind, RELEASES, SYSTEM } from '../../../core/system/system-info';
import { PageHeader } from '../shared/page-header';

type ApiState = { status: 'checking' } | { status: 'ok'; ms: number } | { status: 'down' };

const KIND_LABEL: Record<ChangeKind, string> = { nuevo: 'Nuevo', mejora: 'Mejora', correccion: 'Corrección' };

/** Fecha AAAA-MM-DD (o ISO) en español, sin que la zona horaria la mueva un día. */
function longDate(value: string): string {
  if (!value) return '';
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(y, m - 1, d));
}

/** "Acerca del sistema": ficha técnica, estado de esta instalación e historial de versiones. */
@Component({
  selector: 'app-system-about',
  imports: [PageHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Acerca del sistema" subtitle="Ficha técnica, estado de la conexión e historial de cambios." />

    <section class="hero">
      <div>
        <p class="eyebrow">{{ system.type }}</p>
        <h2 class="hero__name">{{ system.name }}</h2>
      </div>
      <div class="hero__tags">
        <span class="tag tag--version">Versión {{ current.version }}</span>
        <span class="tag" [class.tag--live]="!demo" [class.tag--demo]="demo">
          <i class="dot"></i>{{ demo ? 'Demostración' : 'En producción' }}
        </span>
      </div>
    </section>

    <div class="grid">
      <section class="box">
        <h3 class="box__title">Ficha</h3>
        <dl class="list">
          <dt>Cliente</dt><dd>{{ system.client }}</dd>
          <dt>Inicio del desarrollo</dt><dd>{{ date(system.createdAt) }}</dd>
          <dt>En producción desde</dt><dd>{{ date(system.liveSince) }}</dd>
          <dt>Última actualización</dt><dd>{{ date(current.date) }} · {{ current.title }}</dd>
          <dt>Historial</dt><dd>{{ releases.length }} versiones · {{ changeCount }} cambios registrados</dd>
        </dl>
      </section>

      <section class="box">
        <h3 class="box__title">Desarrollo y soporte</h3>
        <dl class="list">
          <dt>Desarrollado por</dt><dd>{{ system.developer }} · {{ system.developerRole }}</dd>
          <dt>Soporte</dt>
          <dd><a [href]="system.supportWhatsapp" target="_blank" rel="noopener">WhatsApp {{ system.supportPhone }}</a></dd>
          <dt>Contacto</dt>
          <dd><a [href]="system.developerCard" target="_blank" rel="noopener">Tarjeta de presentación</a></dd>
        </dl>
        <p class="note">Si algo no funciona como esperas, manda captura de pantalla y la versión que aparece arriba.</p>
      </section>

      <section class="box">
        <h3 class="box__title">Tecnología</h3>
        <dl class="list">
          @for (row of system.stack; track row.label) {
            <dt>{{ row.label }}</dt><dd>{{ row.value }}</dd>
          }
        </dl>
      </section>

      <section class="box">
        <h3 class="box__title">Esta instalación</h3>
        <dl class="list">
          <dt>Entorno</dt><dd>{{ demo ? 'Demostración (solo lectura, datos inventados)' : 'Producción' }}</dd>
          <dt>Dirección</dt><dd>{{ origin() }}</dd>
          <dt>Conexión con la API</dt>
          <dd>
            @switch (api().status) {
              @case ('checking') { <span class="state"><i class="dot dot--wait"></i>Revisando…</span> }
              @case ('ok') { <span class="state"><i class="dot dot--ok"></i>En línea · respondió en {{ ms() }} ms</span> }
              @case ('down') { <span class="state"><i class="dot dot--down"></i>Sin respuesta</span> }
            }
            <button type="button" class="link" (click)="check()" [disabled]="api().status === 'checking'">Volver a revisar</button>
          </dd>
          <dt>Compilación</dt>
          <dd>{{ build.commit ? build.commit + ' · ' + date(build.builtAt) : 'Compilación local' }}</dd>
        </dl>
      </section>
    </div>

    <section class="box history">
      <h3 class="box__title">Historial de versiones</h3>
      <p class="note">
        Cada corrección o cambio queda registrado. Las mejoras importantes suben la versión (1.4 → 1.5); las correcciones, el último número (1.5.0 → 1.5.1).
      </p>
      <ol class="timeline">
        @for (r of releases; track r.version; let first = $first) {
          <li class="release" [class.release--current]="first">
            <div class="release__head">
              <span class="tag tag--version">{{ r.version }}</span>
              <strong>{{ r.title }}</strong>
              <span class="release__date">{{ date(r.date) }}</span>
              @if (first) { <span class="tag tag--live">Actual</span> }
            </div>
            <ul class="changes">
              @for (c of r.changes; track $index) {
                <li><span class="kind" [attr.data-kind]="c.kind">{{ kind[c.kind] }}</span>{{ c.text }}</li>
              }
            </ul>
          </li>
        }
      </ol>
    </section>
  `,
  styles: `
    :host { display: grid; gap: var(--space-5); max-width: 1040px; }
    .hero, .box { padding: var(--space-5); border-radius: var(--radius-lg); background: var(--color-surface); box-shadow: var(--shadow-sm); }
    .hero { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: var(--space-4); }
    .eyebrow { font-size: var(--text-sm); color: var(--color-text-muted); }
    .hero__name { margin-top: var(--space-1); font-family: var(--font-display); font-size: var(--text-2xl); }
    .hero__tags { display: flex; flex-wrap: wrap; gap: var(--space-2); }
    .tag {
      display: inline-flex; align-items: center; gap: 0.4em; padding: 0.2em 0.7em; border-radius: var(--radius-pill);
      font-size: var(--text-xs); font-weight: 600; background: var(--color-surface-alt); color: var(--color-text); white-space: nowrap;
    }
    .tag--version { font-family: var(--font-mono); background: var(--color-primary-soft); color: var(--color-primary); }
    .tag--live { background: var(--color-success-soft); color: var(--color-success); }
    .tag--demo { background: var(--color-warning-soft); color: var(--color-warning); }
    .dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; background: currentColor; flex: none; }
    .dot--ok { background: var(--color-success); }
    .dot--down { background: var(--color-danger); }
    .dot--wait { background: var(--color-warning); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: var(--space-5); }
    .box__title { margin-bottom: var(--space-4); font-size: var(--text-base); font-weight: 700; }
    .list { display: grid; grid-template-columns: minmax(8rem, auto) 1fr; gap: 0.55rem var(--space-4); font-size: var(--text-sm); }
    .list dt { color: var(--color-text-muted); }
    .list dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
    .list a { color: var(--color-primary); text-decoration: underline; text-underline-offset: 2px; }
    .state { display: inline-flex; align-items: center; gap: 0.45em; margin-right: var(--space-3); }
    .link { padding: 0; border: 0; background: none; color: var(--color-primary); font: inherit; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
    .link:disabled { opacity: 0.5; cursor: default; }
    .note { margin-top: var(--space-4); font-size: var(--text-sm); color: var(--color-text-muted); }
    .history .note { margin: 0 0 var(--space-5); }
    .timeline { display: grid; gap: var(--space-5); margin: 0; padding: 0 0 0 var(--space-5); list-style: none; border-left: 2px solid var(--color-border); }
    .release { position: relative; }
    .release::before {
      content: ''; position: absolute; left: calc(-1 * var(--space-5) - 7px); top: 0.35rem; width: 12px; height: 12px;
      border-radius: 50%; background: var(--color-surface); border: 2px solid var(--color-border-strong);
    }
    .release--current::before { background: var(--color-primary); border-color: var(--color-primary); }
    .release__head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); }
    .release__date { font-size: var(--text-sm); color: var(--color-text-muted); }
    .changes { display: grid; gap: 0.4rem; margin: var(--space-3) 0 0; padding: 0; list-style: none; font-size: var(--text-sm); }
    .changes li { display: flex; align-items: baseline; gap: var(--space-2); }
    .kind {
      flex: none; min-width: 5.6rem; padding: 0.1em 0.5em; border-radius: var(--radius-sm); text-align: center;
      font-size: var(--text-xs); font-weight: 600; background: var(--color-surface-alt); color: var(--color-text-muted);
    }
    .kind[data-kind='nuevo'] { background: var(--color-primary-soft); color: var(--color-primary); }
    .kind[data-kind='mejora'] { background: var(--color-success-soft); color: var(--color-success); }
    .kind[data-kind='correccion'] { background: var(--color-warning-soft); color: var(--color-warning); }
    @media (max-width: 520px) {
      .list { grid-template-columns: 1fr; gap: 0.15rem; }
      .list dd { margin-bottom: var(--space-2); }
      .changes li { flex-direction: column; gap: 0.2rem; }
    }
  `,
})
export class SystemAbout {
  protected readonly system = SYSTEM;
  protected readonly releases = RELEASES;
  protected readonly current = RELEASES[0];
  protected readonly changeCount = RELEASES.reduce((n, r) => n + r.changes.length, 0);
  protected readonly build = BUILD_INFO;
  protected readonly kind = KIND_LABEL;
  protected readonly demo = !!(environment as { demo?: boolean }).demo;
  protected readonly date = longDate;

  protected readonly origin = signal('');
  protected readonly api = signal<ApiState>({ status: 'checking' });
  private alive = true;

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.alive = false));
    afterNextRender(() => {
      this.origin.set(location.origin);
      this.check();
    });
  }

  protected ms(): number {
    const s = this.api();
    return s.status === 'ok' ? s.ms : 0;
  }

  /** Pregunta a la API si está en línea. Va directo con fetch para no disparar avisos de error del panel. */
  protected async check(): Promise<void> {
    this.api.set({ status: 'checking' });
    const started = performance.now();
    try {
      // El servidor gratuito de Render puede tardar en despertar: se le da hasta un minuto.
      const res = await fetch(`${environment.apiUrl}/health`, { cache: 'no-store', signal: AbortSignal.timeout(60_000) });
      if (!this.alive) return;
      this.api.set(res.ok ? { status: 'ok', ms: Math.round(performance.now() - started) } : { status: 'down' });
    } catch {
      if (this.alive) this.api.set({ status: 'down' });
    }
  }
}
