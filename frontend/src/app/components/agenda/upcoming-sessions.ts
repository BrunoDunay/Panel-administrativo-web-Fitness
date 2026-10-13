import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { API_URL } from '../../core/config/api.config';
import { topicTone } from '../../core/types/appointment.model';
import { Icon } from '../icon/icon';

interface Session {
  id: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  topic: string | null;
  meetingUrl: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const LONG_DAY = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
const TIME = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true });
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/**
 * Recordatorio de las sesiones que el coach agendó con el cliente. Si la cita trae enlace,
 * el cliente entra a la videollamada desde aquí, sin que haya que mandárselo aparte.
 */
@Component({
  selector: 'app-upcoming-sessions',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (item of sessions(); track item.id; let first = $first) {
      <article [class]="'session tone--' + tone(item.topic)" [class.session--next]="first" [class.is-live]="item.live">
        <span class="session__icon"><app-icon name="calendar" [size]="22" /></span>
        <div class="session__text">
          <p class="session__label">{{ item.live ? 'Tu sesión está en curso' : first ? 'Tu próxima sesión con tu coach' : 'Después' }}</p>
          <p class="session__when">{{ item.when }} · {{ item.time }}</p>
          <p class="session__meta">{{ item.durationMinutes }} min@if (item.topic) { · {{ item.topic }} }@if (!item.meetingUrl) { · tu coach te compartirá el enlace }</p>
        </div>
        @if (item.meetingUrl) {
          <a class="session__join" [href]="item.meetingUrl" target="_blank" rel="noopener"><app-icon name="phone" [size]="18" /> Entrar a la llamada</a>
        }
      </article>
    }
  `,
  styles: `
    :host { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-2); }
    :host:empty { display: none; }
    .session { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3) var(--space-4); padding: var(--space-4); border-radius: var(--radius-lg); background: var(--tone-soft); color: var(--color-text); animation: session-in 520ms var(--ease-out) both; }
    .session--next { padding: var(--space-5); background: var(--tone-gradient); color: var(--color-text-inverse); box-shadow: var(--shadow-md); }
    .session__icon { display: grid; place-items: center; flex: none; width: 3rem; height: 3rem; border-radius: var(--radius-md); background: color-mix(in srgb, var(--tone) 18%, transparent); color: var(--tone-ink); }
    .session--next .session__icon { background: rgba(255, 255, 255, 0.14); color: var(--color-mint); }
    .is-live .session__icon { animation: session-live 1.6s var(--ease-in-out) infinite; }
    .session__text { flex: 1; min-width: min(100%, 13rem); }
    .session__label { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.08em; text-transform: uppercase; color: var(--tone-ink); }
    .session--next .session__label { color: var(--color-mint); }
    .session__when { font-size: var(--text-lg); font-weight: 600; letter-spacing: -0.02em; }
    .session__when::first-letter { text-transform: uppercase; }
    .session__meta { font-size: var(--text-sm); opacity: 0.8; }
    .session__join { display: inline-flex; align-items: center; gap: var(--space-2); min-height: 2.75rem; padding: 0.4rem 1.2rem; border-radius: var(--radius-pill); background: var(--color-mint); font-size: var(--text-sm); font-weight: 650; color: var(--ink-0); transition: transform var(--duration-fast) var(--ease-out), box-shadow var(--duration) var(--ease-out); }
    .session:not(.session--next) .session__join { background: var(--color-primary); color: var(--color-text-inverse); }
    .session__join:active { transform: scale(0.97); }
    @media (hover: hover) and (pointer: fine) { .session__join:hover { transform: translateY(-2px); box-shadow: 0 12px 28px -12px var(--color-mint); } }
    @keyframes session-in { from { opacity: 0; transform: translateY(14px); } }
    @keyframes session-live { 50% { background: color-mix(in srgb, var(--color-mint) 40%, transparent); } }
    /* Rediseño: citas siguientes sin relleno pastel */
    .session:not(.session--next) { background: var(--color-surface); box-shadow: inset 4px 0 0 var(--tone), inset 0 0 0 1px color-mix(in srgb, var(--tone) 28%, var(--color-border)); }
    .session:not(.session--next) .session__icon { background: var(--tone-gradient); color: #ffffff; }
    /* Botón de la llamada: mismo color que la tarjeta, pero claro y con relieve para que quede "al frente". */
    .session__join, .session:not(.session--next) .session__join {
      border: 1px solid rgba(255, 255, 255, 0.65);
      background: linear-gradient(180deg, #ffffff, color-mix(in srgb, var(--tone) 16%, #ffffff));
      color: var(--tone-ink);
      box-shadow: 0 12px 24px -10px rgba(0, 0, 0, 0.45), 0 2px 0 color-mix(in srgb, var(--tone) 55%, #000000), inset 0 1px 0 #ffffff;
    }
    .session:not(.session--next) .session__join { border-color: color-mix(in srgb, var(--tone) 40%, transparent); box-shadow: 0 10px 20px -12px var(--tone), 0 2px 0 color-mix(in srgb, var(--tone) 55%, #000000); }
    .session__join:active { transform: translateY(2px); box-shadow: 0 4px 10px -6px rgba(0, 0, 0, 0.4), 0 0 0 color-mix(in srgb, var(--tone) 55%, #000000); }
    @media (hover: hover) and (pointer: fine) { .session__join:hover { transform: translateY(-2px); box-shadow: 0 18px 30px -12px rgba(0, 0, 0, 0.5), 0 4px 0 color-mix(in srgb, var(--tone) 55%, #000000), inset 0 1px 0 #ffffff; } }
  `,
})
export class UpcomingSessions {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_URL);
  /** Ruta base del cliente en la API: `portal/<código>` o `clients/<id>`. */
  readonly base = input.required<string>();
  protected readonly tone = topicTone;
  private readonly items = signal<Session[]>([]);

  protected readonly sessions = computed(() => {
    const now = Date.now();
    return this.items().slice(0, 3).map((item) => {
      const start = new Date(item.startsAt);
      const diff = Math.round((startOfDay(start) - startOfDay(new Date())) / DAY_MS);
      return { ...item, when: diff === 0 ? 'Hoy' : diff === 1 ? 'Mañana' : LONG_DAY.format(start), time: `${TIME.format(start)} a ${TIME.format(new Date(item.endsAt))}`, live: start.getTime() <= now };
    });
  });

  constructor() {
    // Si falla (sin red, acceso en pausa) simplemente no hay recordatorio: no es motivo de error.
    effect(() => this.http.get<Session[]>(`${this.api}/${this.base()}/appointments`).subscribe({ next: (list) => this.items.set(list), error: () => this.items.set([]) }));
  }
}
