import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Btn } from '../../../components/buttons/btn';
import { Icon } from '../../../components/icon/icon';
import { SkeletonTable } from '../../../components/skeletons/skeleton-table';
import { PanelApi } from '../../../core/services/api/panel-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { APPOINTMENT_DURATIONS, APPOINTMENT_TOPICS, Appointment, AppointmentDraft, topicTone } from '../../../core/types/appointment.model';
import { ClientListItem } from '../../../core/types/client.model';
import { ConfirmService } from '../shared/confirm.service';
import { PageHeader } from '../shared/page-header';

const DAY_MS = 24 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, '0');
/** Fecha local como AAAA-MM-DD (lo que usa un <input type="date">). */
const dayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const timeKey = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
/** Lunes de la semana de una fecha. */
const mondayOf = (date: Date) => {
  const day = startOfDay(date);
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return day;
};

const WEEKDAY = new Intl.DateTimeFormat('es-MX', { weekday: 'short' });
const LONG_DAY = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
const MONTH = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' });
const TIME = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true });
/** Coincidencias que se muestran a la vez en el buscador de clientes. */
const MAX_MATCHES = 8;
/** Sin acentos ni mayúsculas: "lopez" encuentra a "López". */
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

interface Form {
  id: string | null;
  clientId: string;
  date: string;
  time: string;
  durationMinutes: number;
  topic: string;
  meetingUrl: string;
  notes: string;
}

interface DayColumn {
  key: string;
  date: Date;
  weekday: string;
  number: number;
  isToday: boolean;
  isPast: boolean;
  items: Appointment[];
}

/**
 * Agenda del coach: sesiones (videollamadas) con sus clientes.
 * Se navega por semanas; cada sesión dice con quién es, a qué hora, cuánto dura y para qué.
 */
@Component({
  selector: 'app-agenda',
  imports: [FormsModule, RouterLink, PageHeader, Btn, Icon, SkeletonTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Agenda" subtitle="Tus sesiones con clientes: bienvenida, seguimiento o dudas.">
      <button appBtn type="button" (click)="open()"><app-icon name="plus" [size]="18" /> Agendar sesión</button>
    </app-page-header>

    @if (next(); as n) {
      <section [class]="'next tone--' + tone(n.item.topic)" [class.next--now]="n.live">
        <span class="next__icon"><app-icon name="clock" [size]="22" /></span>
        <div class="next__text">
          <p class="next__label">{{ n.live ? 'En curso ahora' : 'Tu próxima sesión' }}</p>
          <p class="next__title">{{ n.item.client.fullName }} · {{ n.when }}</p>
          <p class="next__meta">{{ time(n.item.startsAt) }} a {{ time(n.item.endsAt) }} · {{ n.item.durationMinutes }} min@if (n.item.topic) { · {{ n.item.topic }} }</p>
        </div>
        @if (n.item.meetingUrl) {
          <a appBtn variant="light" [href]="n.item.meetingUrl" target="_blank" rel="noopener"><app-icon name="external" [size]="16" /> Abrir la llamada</a>
        }
      </section>
    }

    <section class="card week">
      <header class="week__head">
        <h2 class="week__title">{{ monthLabel() }}</h2>
        <div class="week__nav">
          <button type="button" class="round" (click)="shift(-1)" aria-label="Semana anterior"><app-icon name="arrowLeft" [size]="18" /></button>
          <button appBtn type="button" variant="outline" size="sm" (click)="goToday()" [disabled]="isThisWeek()">Hoy</button>
          <button type="button" class="round" (click)="shift(1)" aria-label="Semana siguiente"><app-icon name="arrowRight" [size]="18" /></button>
        </div>
      </header>

      @if (loading()) {
        <app-skeleton-table />
      } @else {
        <!-- Teléfono: se elige el día y solo se ven sus sesiones; el color dice qué días tienen cita. -->
        <div class="daybar" role="tablist" aria-label="Día de la semana">
          @for (day of days(); track day.key) {
            <button type="button" role="tab" class="daybtn" [class.has-items]="day.items.length" [class.is-today]="day.isToday" [attr.aria-selected]="day.key === selectedDay()" [attr.aria-label]="longDay(day.date) + ': ' + (day.items.length ? day.items.length + ' sesión(es)' : 'sin sesiones')" (click)="selectedDay.set(day.key)">
              <span class="daybtn__name">{{ day.weekday }}</span>
              <span class="daybtn__number">{{ day.number }}</span>
              <span class="daybtn__count">{{ day.items.length || '' }}</span>
            </button>
          }
        </div>
        <ol class="days">
          @for (day of days(); track day.key) {
            <li class="day" [class.is-selected]="day.key === selectedDay()" [class.is-today]="day.isToday" [class.is-past]="day.isPast" [class.is-empty]="!day.items.length">
              <div class="day__head">
                <span class="day__name">{{ day.weekday }}</span>
                <span class="day__number">{{ day.number }}</span>
                <button type="button" class="day__add" (click)="open(day.key)" [attr.aria-label]="'Agendar el ' + longDay(day.date)"><app-icon name="plus" [size]="16" /></button>
              </div>
              <ul class="slots">
                @for (item of day.items; track item.id) {
                  <li [class]="'slot tone--' + tone(item.topic)" [class.slot--past]="isOver(item)">
                    <p class="slot__time">{{ time(item.startsAt) }}<span>{{ item.durationMinutes }} min</span></p>
                    <a class="slot__client" [routerLink]="['/panel/clients', item.client.id]">{{ item.client.fullName }}</a>
                    @if (item.topic) { <span class="badge badge--tone slot__topic">{{ item.topic }}</span> }
                    @if (item.notes) { <p class="slot__notes">{{ item.notes }}</p> }
                    <div class="slot__actions">
                      @if (item.meetingUrl) {
                        <a class="icon-btn" [href]="item.meetingUrl" target="_blank" rel="noopener" aria-label="Abrir la llamada" title="Abrir la llamada"><app-icon name="external" [size]="16" /></a>
                      }
                      <button type="button" class="icon-btn" (click)="edit(item)" aria-label="Editar sesión" title="Editar"><app-icon name="edit" [size]="16" /></button>
                      <button type="button" class="icon-btn icon-btn--danger" (click)="remove(item)" aria-label="Cancelar sesión" title="Cancelar"><app-icon name="trash" [size]="16" /></button>
                    </div>
                  </li>
                } @empty {
                  <li class="slot--none">Sin sesiones</li>
                }
              </ul>
            </li>
          }
        </ol>
      }
    </section>

    @if (form(); as f) {
      <button type="button" class="modal-backdrop" aria-label="Cerrar" (click)="close()"></button>
      <form class="modal" role="dialog" aria-modal="true" aria-labelledby="agenda-title" (ngSubmit)="save()" (keydown.escape)="close()">
        <header class="modal__head">
          <span class="tile-icon"><app-icon name="calendar" [size]="20" /></span>
          <h2 id="agenda-title">{{ f.id ? 'Editar sesión' : 'Agendar sesión' }}</h2>
        </header>

        <div class="fields">
          <div class="field field--wide combo">
            <label class="field__label" for="agenda-client">Cliente</label>
            <div class="combo__box" [class.is-picked]="f.clientId">
              <app-icon name="search" [size]="18" />
              <input id="agenda-client" class="combo__input" type="text" name="clientQuery" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="agenda-client-list" [attr.aria-expanded]="clientOpen()" placeholder="Escribe el nombre para buscar"
                [ngModel]="clientQuery()" (ngModelChange)="searchClient($event)" (focus)="clientOpen.set(true)" (keydown.enter)="pickFirst($event)" (keydown.escape)="clientOpen.set(false); $event.stopPropagation()" />
              @if (f.clientId) { <button type="button" class="combo__clear" (click)="clearClient()" aria-label="Cambiar de cliente">×</button> }
            </div>
            @if (clientOpen() && !f.clientId) {
              <ul class="combo__list" id="agenda-client-list" role="listbox">
                @for (client of clientMatches(); track client.id) {
                  <li role="option" aria-selected="false"><button type="button" (click)="pickClient(client)"><span class="avatar">{{ initials(client.fullName) }}</span><span class="combo__name">{{ client.fullName }}<small>{{ client.objective || 'Sin objetivo capturado' }}</small></span></button></li>
                } @empty {
                  <li class="combo__none">Ningún cliente coincide con "{{ clientQuery() }}".</li>
                }
                @if (hiddenMatches() > 0) { <li class="combo__none">y {{ hiddenMatches() }} más: sigue escribiendo para afinar.</li> }
              </ul>
            }
          </div>
          <label class="field">
            <span class="field__label">Día</span>
            <input class="field__control" type="date" name="date" [ngModel]="f.date" (ngModelChange)="patch({ date: $event })" required />
          </label>
          <label class="field">
            <span class="field__label">Hora</span>
            <input class="field__control" type="time" name="time" step="300" [ngModel]="f.time" (ngModelChange)="patch({ time: $event })" required />
          </label>
          <div class="field field--wide">
            <span class="field__label" id="agenda-duration">Duración</span>
            <div class="chips" role="radiogroup" aria-labelledby="agenda-duration">
              @for (minutes of durations; track minutes) {
                <button type="button" class="chip" role="radio" [attr.aria-checked]="f.durationMinutes === minutes" [class.is-on]="f.durationMinutes === minutes" (click)="patch({ durationMinutes: minutes })">{{ minutes }} min</button>
              }
            </div>
            <span class="field__hint">Termina a las {{ endLabel() }}.</span>
          </div>
          <label class="field">
            <span class="field__label">Motivo</span>
            <select class="field__control" name="topic" [ngModel]="f.topic" (ngModelChange)="patch({ topic: $event })">
              @for (topic of topics; track topic) {
                <option [value]="topic">{{ topic }}</option>
              }
            </select>
          </label>
          <label class="field">
            <span class="field__label">Enlace de la videollamada</span>
            <input class="field__control" type="url" name="meetingUrl" placeholder="https://meet.google.com/…" [ngModel]="f.meetingUrl" (ngModelChange)="patch({ meetingUrl: $event })" />
            <span class="field__hint">Opcional. Puedes pegarlo después.</span>
          </label>
          <label class="field field--wide">
            <span class="field__label">Notas</span>
            <textarea class="field__control" name="notes" rows="2" [ngModel]="f.notes" (ngModelChange)="patch({ notes: $event })"></textarea>
          </label>
        </div>

        @if (error()) {
          <p class="form-error" role="alert">{{ error() }}</p>
        }

        <div class="modal__actions">
          <button appBtn type="button" variant="ghost" (click)="close()">Cancelar</button>
          <button appBtn type="submit" [loading]="saving()" [disabled]="saving() || !canSave()">{{ f.id ? 'Guardar cambios' : 'Agendar' }}</button>
        </div>
      </form>
    }
  `,
  styles: `
    :host { display: block; }

    /* Próxima sesión: lo primero que el coach necesita saber al entrar. */
    .next {
      display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-4);
      margin-top: var(--space-5); padding: var(--space-5);
      border-radius: var(--radius-xl); background: var(--tone-gradient, var(--gradient-forest)); color: var(--color-text-inverse);
      box-shadow: var(--shadow-md);
    }
    .next__icon { display: grid; place-items: center; flex: none; width: 3rem; height: 3rem; border-radius: var(--radius-md); background: rgba(255, 255, 255, 0.12); color: var(--color-mint); }
    .next--now .next__icon { animation: live 1.6s var(--ease-in-out) infinite; }
    @keyframes live { 50% { box-shadow: 0 0 0 10px color-mix(in srgb, var(--color-mint) 0%, transparent); background: color-mix(in srgb, var(--color-mint) 30%, transparent); } }
    .next__text { flex: 1; min-width: min(100%, 14rem); }
    .next__label { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-mint); }
    .next__title { font-size: var(--text-xl); font-weight: 600; letter-spacing: -0.02em; }
    .next__title::first-letter { text-transform: uppercase; }
    .next__meta { font-size: var(--text-sm); opacity: 0.75; }

    .week { margin-top: var(--space-4); }
    .week__head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-4); }
    .week__title { font-size: var(--text-xl); }
    .week__title::first-letter { text-transform: uppercase; }
    .week__nav { display: flex; align-items: center; gap: var(--space-2); }
    .round { display: grid; place-items: center; width: 2.5rem; height: 2.5rem; border: 1px solid var(--color-border-strong); border-radius: 50%; background: var(--color-surface); transition: transform var(--duration-fast) var(--ease-out), border-color var(--duration-fast), color var(--duration-fast); }
    .round:active { transform: scale(0.92); }

    /* Siete columnas en escritorio; en teléfono, una lista de días. */
    .days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: var(--space-2); list-style: none; }
    .day { display: grid; grid-template-columns: minmax(0, 1fr); align-content: start; gap: var(--space-2); min-width: 0; min-height: 11rem; padding: var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-background); animation: day-in 480ms var(--ease-out) both; }
    .day:nth-child(2) { animation-delay: 30ms; } .day:nth-child(3) { animation-delay: 60ms; } .day:nth-child(4) { animation-delay: 90ms; }
    .day:nth-child(5) { animation-delay: 120ms; } .day:nth-child(6) { animation-delay: 150ms; } .day:nth-child(7) { animation-delay: 180ms; }
    @keyframes day-in { from { opacity: 0; transform: translateY(14px); } }
    .day.is-today { border-color: var(--color-primary); background: var(--color-primary-soft); }
    .day.is-past { opacity: 0.7; }
    .day__head { display: flex; align-items: baseline; gap: var(--space-2); }
    .day__name { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-text-muted); }
    .day__number { font-family: var(--font-mono); font-size: var(--text-xl); font-weight: 600; letter-spacing: -0.04em; }
    .is-today .day__number { color: var(--color-primary); }
    .day__add { display: grid; place-items: center; align-self: center; width: 2rem; height: 2rem; margin-left: auto; border: 0; border-radius: 50%; background: transparent; color: var(--color-text-muted); transition: background-color var(--duration-fast), color var(--duration-fast), transform var(--duration) var(--ease-spring); }

    .slots { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-2); min-width: 0; list-style: none; }
    .slot { display: grid; gap: 0.2rem; padding: var(--space-3); border-radius: var(--radius-md); background: var(--color-surface); box-shadow: var(--shadow-sm); border-left: 4px solid var(--tone, var(--color-primary)); }
    .slot__time { color: var(--tone-ink, inherit); }
    .slot--past { border-left-color: var(--color-border-strong); }
    .slot__time { font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 600; letter-spacing: -0.02em; }
    .slot__time span { display: block; font-weight: 400; color: var(--color-text-muted); }
    .slot__client { font-weight: 600; line-height: 1.25; overflow-wrap: anywhere; }
    .slot__topic { justify-self: start; }
    .slot__notes { font-size: var(--text-xs); color: var(--color-text-muted); }
    .slot__actions { display: flex; margin-top: 0.15rem; margin-left: -0.35rem; }
    .slot__actions .icon-btn { width: 1.9rem; height: 1.9rem; }
    .slot--none { font-size: var(--text-xs); color: var(--color-text-muted); }
    .icon-btn { display: grid; place-items: center; width: 2.25rem; height: 2.25rem; border: 0; border-radius: 50%; background: transparent; color: var(--color-text-muted); transition: background-color var(--duration-fast), color var(--duration-fast), transform var(--duration-fast) var(--ease-out); }
    .icon-btn:active { transform: scale(0.9); }

    @media (hover: hover) and (pointer: fine) {
      .round:hover { border-color: var(--color-primary); color: var(--color-primary); }
      .day__add:hover { background: var(--color-primary); color: var(--color-text-inverse); transform: rotate(90deg); }
      .slot__client:hover { color: var(--color-primary); }
      .icon-btn:hover { background: var(--color-surface-alt); color: var(--color-text); }
      .icon-btn--danger:hover { background: var(--color-danger-soft); color: var(--color-danger); }
    }

    /* Menú de días: solo en pantallas angostas */
    .daybar { display: none; }
    .daybtn { display: grid; justify-items: center; gap: 0.1rem; min-height: 4rem; padding: 0.45rem 0.1rem; border: 1.5px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text-muted); transition: transform var(--duration-fast) var(--ease-out), background-color var(--duration) var(--ease-out), border-color var(--duration) var(--ease-out), color var(--duration-fast); }
    .daybtn:active { transform: scale(0.95); }
    .daybtn__name { font-family: var(--font-mono); font-size: 0.66rem; letter-spacing: 0.06em; text-transform: uppercase; }
    .daybtn__number { font-family: var(--font-mono); font-size: var(--text-lg); font-weight: 600; letter-spacing: -0.04em; color: var(--color-text); }
    .daybtn__count { display: grid; place-items: center; min-width: 1.15rem; height: 1.15rem; border-radius: var(--radius-pill); font-family: var(--font-mono); font-size: 0.66rem; font-weight: 600; }
    /* Con cita: esmeralda. Sin cita: gris. Hoy: anillo. Elegido: tinta. */
    .daybtn.has-items { border-color: transparent; background: var(--color-primary-soft); color: var(--tone-emerald-ink); }
    .daybtn.has-items .daybtn__count { background: var(--color-primary); color: var(--color-text-inverse); }
    .daybtn.is-today { border-color: var(--color-primary); }
    .daybtn[aria-selected='true'] { border-color: var(--color-secondary); background: var(--color-secondary); color: color-mix(in srgb, var(--color-text-inverse) 75%, transparent); animation: daybtn-in 360ms var(--ease-spring); }
    .daybtn[aria-selected='true'] .daybtn__number { color: var(--color-text-inverse); }
    .daybtn[aria-selected='true'].has-items .daybtn__count { background: var(--color-mint); color: var(--ink-0); }
    @keyframes daybtn-in { from { transform: scale(0.92); } }

    /* Buscador de clientes */
    .combo { position: relative; }
    .combo__box { display: flex; align-items: center; gap: var(--space-2); min-height: 2.75rem; padding: 0 var(--space-3); border: 1px solid var(--color-border-strong); border-radius: var(--radius-sm); background: var(--color-surface); color: var(--color-text-muted); transition: border-color var(--duration-fast), box-shadow var(--duration-fast); }
    .combo__box:focus-within { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-soft); }
    .combo__box.is-picked { border-color: var(--color-primary); background: var(--color-primary-soft); color: var(--color-primary); }
    .combo__input { flex: 1; min-width: 0; border: 0; background: none; font-size: 1rem; color: var(--color-text); }
    .combo__input:focus { outline: none; }
    .is-picked .combo__input { font-weight: 600; }
    .combo__clear { flex: none; width: 2rem; height: 2rem; border: 0; border-radius: 50%; background: none; font-size: 1.2rem; line-height: 1; color: var(--color-text-muted); }
    .combo__list { position: absolute; inset: calc(100% + 4px) 0 auto 0; z-index: 3; display: grid; max-height: 16rem; padding: var(--space-1); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); box-shadow: var(--shadow-lg); list-style: none; overflow-y: auto; animation: combo-in 200ms var(--ease-out); }
    @keyframes combo-in { from { opacity: 0; transform: translateY(-6px); } }
    .combo__list button { display: flex; align-items: center; gap: var(--space-3); width: 100%; padding: var(--space-2); border: 0; border-radius: var(--radius-sm); background: none; text-align: left; }
    .combo__list button:focus-visible, .combo__list li:first-child button { background: var(--color-background); }
    .combo__name { display: grid; min-width: 0; line-height: 1.3; font-weight: 600; }
    .combo__name small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--text-xs); font-weight: 400; color: var(--color-text-muted); }
    .combo__none { padding: var(--space-2) var(--space-3); font-size: var(--text-sm); color: var(--color-text-muted); }
    @media (hover: hover) and (pointer: fine) { .combo__list button:hover { background: var(--color-primary-soft); } .combo__clear:hover { background: rgba(0, 0, 0, 0.06); } }

    /* Formulario */
    .fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
    .field--wide { grid-column: 1 / -1; }
    .chips { display: flex; flex-wrap: wrap; gap: var(--space-2); }
    .chip { min-height: 2.5rem; padding: 0.35rem 1rem; border: 1px solid var(--color-border-strong); border-radius: var(--radius-pill); background: var(--color-surface); font-family: var(--font-mono); font-size: var(--text-sm); transition: background-color var(--duration-fast), border-color var(--duration-fast), color var(--duration-fast), transform var(--duration-fast) var(--ease-out); }
    .chip:active { transform: scale(0.95); }
    .chip.is-on { border-color: var(--color-primary); background: var(--color-primary); color: var(--color-text-inverse); }
    .form-error { padding: var(--space-3) var(--space-4); border-radius: var(--radius-sm); background: var(--color-danger-soft); font-size: var(--text-sm); color: var(--color-danger); }
    .modal__actions { display: flex; justify-content: flex-end; gap: var(--space-3); }
    .modal { animation: modal-in 320ms var(--ease-out) both; }
    @keyframes modal-in { from { opacity: 0; transform: translateY(16px) scale(0.98); } }

    @media (max-width: 1100px) {
      .days { grid-template-columns: minmax(0, 1fr); }
      .daybar { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 0.3rem; margin-bottom: var(--space-3); }
      .day:not(.is-selected) { display: none; }
      .day.is-past { opacity: 1; }
      .day { grid-template-columns: 4.5rem minmax(0, 1fr); min-height: 0; align-items: start; }
      .slot__time span { display: inline; }
      .slot__actions .icon-btn { width: 2.75rem; height: 2.75rem; }
      .slot__time span::before { content: ' · '; }
      .day__head { display: grid; grid-template-columns: auto; gap: 0; justify-items: start; }
      .day__add { margin: var(--space-1) 0 0; }
      .day.is-empty { padding-block: var(--space-2); }
    }
    @media (max-width: 560px) {
      .fields { grid-template-columns: minmax(0, 1fr); }
    }
    /* Rediseño: hoy y días con cita sin pastel */
    .day.is-today { border-color: var(--color-primary); border-top-width: 4px; background: var(--color-surface); box-shadow: 0 12px 26px -18px var(--color-primary); }
    .daybtn.has-items { border-color: var(--color-primary); background: var(--color-surface); }
    .combo__box.is-picked { background: var(--color-surface); }
  `,
})
export class Agenda {
  private readonly api = inject(PanelApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly durations = APPOINTMENT_DURATIONS;
  protected readonly topics = APPOINTMENT_TOPICS;

  protected readonly weekStart = signal(mondayOf(new Date()));
  protected readonly items = signal<Appointment[]>([]);
  protected readonly upcoming = signal<Appointment[]>([]);
  protected readonly clients = signal<ClientListItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = signal<Form | null>(null);
  /** Día que se ve en teléfono (donde la semana no cabe en columnas). */
  protected readonly selectedDay = signal(dayKey(new Date()));
  protected readonly tone = topicTone;

  /** Buscador de clientes del formulario: con muchos clientes, una lista completa no sirve. */
  protected readonly clientQuery = signal('');
  protected readonly clientOpen = signal(false);
  private readonly allMatches = computed(() => {
    const term = normalize(this.clientQuery());
    return this.clients().filter((client) => !term || normalize(client.fullName).includes(term));
  });
  protected readonly clientMatches = computed(() => this.allMatches().slice(0, MAX_MATCHES));
  protected readonly hiddenMatches = computed(() => Math.max(0, this.allMatches().length - MAX_MATCHES));

  protected readonly isThisWeek = computed(() => this.weekStart().getTime() === mondayOf(new Date()).getTime());
  protected readonly monthLabel = computed(() => {
    const start = this.weekStart();
    const end = new Date(start.getTime() + 6 * DAY_MS);
    return start.getMonth() === end.getMonth() ? MONTH.format(start) : `${MONTH.format(start)} – ${MONTH.format(end)}`;
  });

  protected readonly days = computed<DayColumn[]>(() => {
    const today = dayKey(new Date());
    const byDay = new Map<string, Appointment[]>();
    for (const item of this.items()) {
      const key = dayKey(new Date(item.startsAt));
      byDay.set(key, [...(byDay.get(key) ?? []), item]);
    }
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(this.weekStart());
      date.setDate(date.getDate() + index);
      const key = dayKey(date);
      return { key, date, weekday: WEEKDAY.format(date).replace('.', ''), number: date.getDate(), isToday: key === today, isPast: key < today, items: byDay.get(key) ?? [] };
    });
  });

  /** La sesión en curso o, si no hay, la siguiente. */
  protected readonly next = computed(() => {
    const now = Date.now();
    const item = this.upcoming().find((a) => new Date(a.endsAt).getTime() > now);
    if (!item) return null;
    const start = new Date(item.startsAt);
    const diffDays = Math.round((startOfDay(start).getTime() - startOfDay(new Date()).getTime()) / DAY_MS);
    const when = diffDays === 0 ? 'hoy' : diffDays === 1 ? 'mañana' : LONG_DAY.format(start);
    return { item, when, live: start.getTime() <= now };
  });

  protected readonly canSave = computed(() => {
    const f = this.form();
    return Boolean(f && f.clientId && f.date && f.time);
  });
  protected readonly endLabel = computed(() => {
    const f = this.form();
    if (!f?.date || !f.time) return '—';
    return TIME.format(new Date(new Date(`${f.date}T${f.time}`).getTime() + f.durationMinutes * 60_000));
  });

  constructor() {
    this.load();
    this.api.clients({ status: 'all' }).subscribe((list) => this.clients.set(list.filter((c) => c.status !== 'archived')));
  }

  protected time = (iso: string) => TIME.format(new Date(iso));
  protected initials = (name: string) => name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();

  protected searchClient(query: string): void {
    this.clientQuery.set(query);
    this.clientOpen.set(true);
    // Si se edita el texto de un cliente ya elegido, vuelve a buscarse.
    if (this.form()?.clientId) this.patch({ clientId: '' });
  }

  protected pickClient(client: ClientListItem): void {
    this.patch({ clientId: client.id });
    this.clientQuery.set(client.fullName);
    this.clientOpen.set(false);
  }

  protected pickFirst(event: Event): void {
    if (this.form()?.clientId) return;
    event.preventDefault();
    const first = this.clientMatches()[0];
    if (first) this.pickClient(first);
  }

  protected clearClient(): void {
    this.patch({ clientId: '' });
    this.clientQuery.set('');
    this.clientOpen.set(true);
  }
  protected longDay = (date: Date) => LONG_DAY.format(date);
  protected isOver = (item: Appointment) => new Date(item.endsAt).getTime() < Date.now();

  protected shift(weeks: number): void {
    const start = new Date(this.weekStart());
    start.setDate(start.getDate() + weeks * 7);
    this.weekStart.set(start);
    // En teléfono, al cambiar de semana se ve su lunes (o el día de hoy si es la semana actual).
    this.selectedDay.set(dayKey(mondayOf(new Date()).getTime() === start.getTime() ? new Date() : start));
    this.load();
  }

  protected goToday(): void {
    this.weekStart.set(mondayOf(new Date()));
    this.selectedDay.set(dayKey(new Date()));
    this.load();
  }

  protected open(date?: string): void {
    const base = new Date();
    // Propone la siguiente media hora en punto.
    base.setMinutes(base.getMinutes() < 30 ? 30 : 60, 0, 0);
    this.error.set(null);
    this.clientQuery.set('');
    this.clientOpen.set(false);
    this.form.set({ id: null, clientId: '', date: date ?? dayKey(base), time: date ? '10:00' : timeKey(base), durationMinutes: 30, topic: 'Seguimiento', meetingUrl: '', notes: '' });
  }

  protected edit(item: Appointment): void {
    const start = new Date(item.startsAt);
    this.error.set(null);
    this.clientQuery.set(item.client.fullName);
    this.clientOpen.set(false);
    this.form.set({ id: item.id, clientId: item.client.id, date: dayKey(start), time: timeKey(start), durationMinutes: item.durationMinutes, topic: item.topic ?? 'Otro', meetingUrl: item.meetingUrl ?? '', notes: item.notes ?? '' });
  }

  protected patch(change: Partial<Form>): void {
    this.form.update((f) => (f ? { ...f, ...change } : f));
  }

  protected close(): void {
    this.form.set(null);
  }

  protected save(): void {
    const f = this.form();
    if (!f || !this.canSave() || this.saving()) return;
    const draft: AppointmentDraft = {
      clientId: f.clientId,
      // La hora que escribe el coach es la de su reloj; se guarda el instante exacto.
      startsAt: new Date(`${f.date}T${f.time}`).toISOString(),
      durationMinutes: f.durationMinutes,
      topic: f.topic || null,
      meetingUrl: f.meetingUrl.trim() || null,
      notes: f.notes.trim() || null,
    };
    this.saving.set(true);
    this.error.set(null);
    (f.id ? this.api.updateAppointment(f.id, draft) : this.api.createAppointment(draft)).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.form.set(null);
        this.toast.success(f.id ? 'Sesión actualizada.' : 'Sesión agendada.');
        // Si quedó en otra semana, la agenda salta a ella para que se vea.
        this.weekStart.set(mondayOf(new Date(saved.startsAt)));
        this.selectedDay.set(dayKey(new Date(saved.startsAt)));
        this.load();
      },
      error: (err: { message?: string }) => {
        this.saving.set(false);
        this.error.set(err.message ?? 'No se pudo guardar la sesión.');
      },
    });
  }

  protected async remove(item: Appointment): Promise<void> {
    const ok = await this.confirm.ask({ title: 'Cancelar sesión', message: `Se quitará de tu agenda la sesión con ${item.client.fullName} del ${LONG_DAY.format(new Date(item.startsAt))}.`, confirmLabel: 'Cancelar sesión', danger: true });
    if (!ok) return;
    this.api.deleteAppointment(item.id).subscribe(() => {
      this.toast.success('Sesión cancelada.');
      this.load();
    });
  }

  private load(): void {
    const from = this.weekStart();
    const to = new Date(from);
    to.setDate(to.getDate() + 7);
    this.loading.set(true);
    this.api.appointments({ from: from.toISOString(), to: to.toISOString() }).subscribe({
      next: (list) => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    // "Próxima sesión" no depende de la semana que se esté viendo.
    this.api.appointments({ from: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() }).subscribe((list) => this.upcoming.set(list));
  }
}
