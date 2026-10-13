import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { SYMBOLS } from '../../core/config/tracking-lists';
import { ClientStore } from '../../core/services/client-store';
import { CardioDay, LoggedSet, REST, TrainingWeek, WarmupDay, WeekDay, WeekExercise, weekDayOf } from '../../core/types/training.model';
import { formatNumber, toNumber } from '../../core/utils/format';
import { exerciseEquipment, muscleTone, sessionTone } from '../../core/utils/visuals';
import { Icon } from '../icon/icon';
import { ExerciseFigure } from '../visual/exercise-figure';
import { protocolFigureByName } from '../visual/protocol-figures';

/**
 * Hoja de la semana: la pauta del coach y el registro de carga y reps por serie.
 * La usan el cliente (portal) y el coach (expediente); cada cambio se guarda al salir del campo.
 */
@Component({
  selector: 'app-week-sheet',
  imports: [ExerciseFigure, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!hasTraining()) {
      <div class="card empty"><h3>Sin días de entreno</h3><p>El split semanal todavía no tiene sesiones.</p></div>
    }

    <!-- Menú de días: se entra en el de hoy y cada día dice cómo va (completo, incompleto, sin entrenar). -->
    @if (hasTraining()) {
      <nav class="daynav" aria-label="Día de la semana">
        <div class="daynav__days" role="tablist">
          @for (day of days(); track day.day) {
            <button type="button" role="tab" [class]="'daytab tone--' + toneOf(day) + ' daytab--' + state(day)" [class.is-today]="day.day === todayDay()" [attr.aria-selected]="day.day === selected()" [attr.aria-label]="day.name + ': ' + day.session + '. ' + stateLabel(day)" (click)="selected.set(day.day)">
              <span class="daytab__name">{{ day.name.slice(0, 3) }}</span>
              <span class="daytab__session">{{ isRest(day) ? 'Descanso' : day.session }}</span>
              <span class="daytab__state"><i aria-hidden="true"></i>{{ stateLabel(day) }}</span>
            </button>
          }
        </div>
        <p class="daynav__legend" aria-hidden="true">
          <span class="key key--today">Hoy</span>
          <span class="key key--done">Completo</span>
          <span class="key key--partial">Incompleto</span>
          <span class="key key--missed">Sin entrenar</span>
        </p>
      </nav>
    }

    <!-- Solo se muestra el día elegido: sin desplazarse para encontrar el de hoy. -->
    @for (day of shown(); track day.day) {
      @if (isRest(day)) {
        <article class="card rest tone--slate" [class.is-today]="day.day === todayDay()">
          <header class="rest__head">
            <span class="rest__icon"><app-icon name="moon" [size]="20" /></span>
            <div>
              <p class="day__eyebrow">Día {{ day.day }} · {{ day.name }} @if (day.day === todayDay()) { <span class="today">Hoy</span> }</p>
              <h3>Descanso</h3>
            </div>
            @if (steps()?.restDay; as restSteps) {
              <div class="stat rest__steps">
                <span class="stat__label">Meta de pasos</span>
                <span class="stat__value day__sets">{{ fmt(restSteps, 0) }}</span>
              </div>
            }
          </header>
          @if (cardioFor(day.day); as cardio) {
            <details class="details cardio proto">
              <summary><span class="proto__sum"><span class="proto__fig tone--steel">@if (figureFor(cardio.protocol); as fig) { <app-exercise-figure class="proto__draw" [def]="fig" [exercise]="cardio.protocol" [size]="34" [autoplay]="true" /> } @else { <app-icon name="run" [size]="18" /> }</span><b>Cardio</b><span class="proto__name">· {{ cardio.protocol }}</span></span></summary>
              <div class="details__body cardio__body">
              <div>
                <p class="day__eyebrow">Cardio · {{ cardio.moment || 'Cuando puedas' }}</p>
                <strong>{{ cardio.protocol }}</strong>
                <p class="text-muted">{{ cardioDetail(cardio) }}</p>
              </div>
              @if (cardio.durationMin) {
                <label class="field cardio__log">
                  <span class="field__label">Minutos realizados</span>
                  <input class="cell-input cell-input--num" type="number" inputmode="numeric" min="0" [placeholder]="cardio.durationMin" [value]="day.cardioDoneMin ?? ''" (change)="setCardio(day, $any($event.target).value)" />
                </label>
              }
            </div>
            </details>
          } @else {
            <p class="rest__note">Sin entrenamiento ni cardio: recupérate para tu siguiente sesión.</p>
          }
        </article>
      } @else {
      <article [class]="'card day tone--' + toneOf(day)" [class.is-today]="day.day === todayDay()">
        <header class="day__head">
          <span class="day__badge">{{ day.name.slice(0, 3) }}</span>
          <div class="day__title">
            <p class="day__eyebrow">Día {{ day.day }} · {{ day.name }} @if (day.day === todayDay()) { <span class="today">Hoy</span> }</p>
            <h3>{{ day.session }}</h3>
          </div>
          <div class="day__meta">
            <label class="field day__date">
              <span class="field__label">Fecha</span>
              <input class="cell-input" type="date" [value]="day.date ?? ''" (change)="setDate(day, $any($event.target).value)" />
            </label>
            <div class="stat">
              <span class="stat__label">Series ✓</span>
              <span class="stat__value day__sets">{{ day.setsDone }}<small> de {{ day.setsPlanned }}</small></span>
            </div>
          </div>
        </header>

        <!-- El calentamiento abre la sesión de ese día. -->
        @if (warmupFor(day.day); as warm) {
          <details class="details warmup proto">
            <summary><span class="proto__sum"><span class="proto__fig tone--amber">@if (figureFor(warm.protocol); as fig) { <app-exercise-figure class="proto__draw" [def]="fig" [exercise]="warm.protocol" [size]="34" [autoplay]="true" /> } @else { <app-icon name="flame" [size]="18" /> }</span><b>Calentamiento</b><span class="proto__name">· {{ warm.protocol }} @if (warm.duration) { <small>({{ warm.duration }})</small> }</span></span></summary>
            <div class="details__body">
              <p class="proto__title">{{ warm.protocol }} @if (warm.duration) { <small>({{ warm.duration }})</small> }</p>
              <dl class="dl">
                @if (warm.general) { <dt>General</dt><dd>{{ warm.general }}</dd> }
                @if (warm.mobility) { <dt>Movilidad</dt><dd>{{ warm.mobility }}</dd> }
                @if (warm.activation) { <dt>Activación</dt><dd>{{ warm.activation }}</dd> }
                @if (warm.rampUpSets) { <dt>Aproximación</dt><dd>{{ warm.rampUpSets }}</dd> }
                @if (warm.notes) { <dt>Ajustes</dt><dd>{{ warm.notes }}</dd> }
              </dl>
            </div>
          </details>
        }

        @for (exercise of day.exercises; track exercise.id) {
          <section [class]="'exercise icon-hover tone--' + tone(exercise.muscle)" [class.is-done]="done(exercise)">
            <div class="exercise__head">
              <span class="thumb figure"><app-exercise-figure [exercise]="exercise.exercise" [muscle]="exercise.muscle" [figure]="exercise.movement" [size]="62" /></span>
              <div class="exercise__name">
                <strong>{{ exercise.exercise }}</strong>
                <span><b class="muscle">{{ exercise.muscle }}</b>@if (equipment(exercise.exercise)) { · {{ equipment(exercise.exercise) }} }</span>
              </div>
              @if (done(exercise)) {
                <span class="badge badge--success done-badge"><span aria-hidden="true">✓</span> Completado</span>
              } @else if (started(exercise)) {
                <span class="badge">{{ exercise.setsDone }} de {{ exercise.sets }} series</span>
              }
              @if (exercise.symbol) {
                <span class="badge badge--warning" [title]="hint(exercise.symbol)">{{ exercise.symbol }} {{ symbolLabel(exercise.symbol) }}</span>
              }
            </div>

            <dl class="pauta">
              <div><dt>Series</dt><dd>{{ exercise.sets }}</dd></div>
              <div><dt>Reps</dt><dd>{{ exercise.reps || '—' }}</dd></div>
              <div><dt>RIR</dt><dd>{{ exercise.rir ?? '—' }}</dd></div>
              <div><dt>e1RM</dt><dd>{{ fmt(exercise.e1rm) }}</dd></div>
              <div><dt>Tonelaje</dt><dd>{{ fmt(exercise.tonnage, 0) }}</dd></div>
            </dl>

            @if (exercise.description) {
              <details class="details how">
                <summary>Cómo se hace</summary>
                <p class="details__body">{{ exercise.description }}</p>
              </details>
            }

            @if (exercise.coachNotes) {
              <p class="coach-note"><b>Coach:</b> {{ exercise.coachNotes }}</p>
            }

            <div class="sets">
              @for (set of exercise.logged; track $index; let s = $index) {
                <fieldset class="set">
                  <legend>Serie {{ s + 1 }}</legend>
                  <label>
                    <span class="visually-hidden">Carga de la serie {{ s + 1 }} en kg</span>
                    <input class="cell-input cell-input--num" type="number" inputmode="decimal" min="0" step="0.5" placeholder="kg" [value]="set.load ?? ''" (change)="setLog(exercise, s, 'load', $any($event.target).value)" />
                  </label>
                  <span aria-hidden="true">×</span>
                  <label>
                    <span class="visually-hidden">Repeticiones de la serie {{ s + 1 }}</span>
                    <input class="cell-input cell-input--num" type="number" inputmode="numeric" min="0" step="1" placeholder="reps" [value]="set.reps ?? ''" (change)="setLog(exercise, s, 'reps', $any($event.target).value)" />
                  </label>
                </fieldset>
              }
            </div>

            <label class="field">
              <span class="field__label">Notas del cliente</span>
              <input class="cell-input" type="text" maxlength="1000" [value]="exercise.clientNotes ?? ''" (change)="setNotes(exercise, $any($event.target).value)" />
            </label>
          </section>
        } @empty {
          <p class="text-muted">Tu coach todavía no pauta ejercicios para este día.</p>
        }

        @if (cardioFor(day.day); as cardio) {
          <details class="details cardio proto">
              <summary><span class="proto__sum"><span class="proto__fig tone--steel">@if (figureFor(cardio.protocol); as fig) { <app-exercise-figure class="proto__draw" [def]="fig" [exercise]="cardio.protocol" [size]="34" [autoplay]="true" /> } @else { <app-icon name="run" [size]="18" /> }</span><b>Cardio</b><span class="proto__name">· {{ cardio.protocol }}</span></span></summary>
              <div class="details__body cardio__body">
            <div>
              <p class="day__eyebrow">Cardio · {{ cardio.moment || 'Cuando puedas' }}</p>
              <strong>{{ cardio.protocol }}</strong>
              <p class="text-muted">{{ cardioDetail(cardio) }}</p>
            </div>
            @if (cardio.durationMin) {
              <label class="field cardio__log">
                <span class="field__label">Minutos realizados</span>
                <input class="cell-input cell-input--num" type="number" inputmode="numeric" min="0" [placeholder]="cardio.durationMin" [value]="day.cardioDoneMin ?? ''" (change)="setCardio(day, $any($event.target).value)" />
              </label>
            }
          </div>
            </details>
        }
      </article>
      }
    }
  `,
  styles: `
    :host { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
    /* ---- Menú de días ---- */
    .daynav { position: sticky; top: var(--sticky-top, 0px); z-index: 2; display: grid; gap: var(--space-2); padding: var(--space-2); border-radius: var(--radius-lg); background: color-mix(in srgb, var(--color-background) 88%, transparent); backdrop-filter: blur(10px); }
    .daynav__days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: var(--space-2); }
    .daytab {
      --state: var(--color-border-strong);
      position: relative; display: grid; gap: 0.1rem; justify-items: start; min-width: 0; min-height: 4.25rem; padding: 0.55rem 0.7rem;
      border: 1.5px solid transparent; border-radius: var(--radius-md); background: var(--color-surface); text-align: left; color: var(--color-text-muted);
      box-shadow: var(--shadow-sm);
      transition: transform var(--duration-fast) var(--ease-out), background-color var(--duration) var(--ease-out), border-color var(--duration) var(--ease-out), color var(--duration-fast);
    }
    .daytab:active { transform: scale(0.96); }
    .daytab__name { font-family: var(--font-mono); font-size: var(--text-xs); font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; }
    .daytab__session { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--text-sm); font-weight: 600; color: var(--color-text); }
    .daytab__state { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.7rem; white-space: nowrap; }
    .daytab__state i { flex: none; width: 0.55rem; height: 0.55rem; border-radius: 50%; background: var(--state); }
    /* Un color por estado: verde completo, ámbar incompleto, coral sin entrenar; el descanso queda en gris. */
    .daytab--done { --state: var(--color-success); background: var(--color-success-soft); }
    .daytab--partial { --state: var(--tone-amber); background: var(--tone-amber-soft); }
    .daytab--missed { --state: var(--tone-coral); background: var(--tone-coral-soft); }
    .daytab--rest { background: var(--color-surface-alt); box-shadow: none; }
    .daytab--rest .daytab__session { color: var(--color-text-muted); font-weight: 500; }
    /* Hoy: anillo en el color de la marca, con un pulso suave para ubicarlo de un vistazo. */
    .daytab.is-today { border-color: var(--color-primary); }
    .daytab.is-today .daytab__name { color: var(--color-primary); font-weight: 700; }
    .daytab.is-today::after { content: ''; position: absolute; top: 0.5rem; right: 0.5rem; width: 0.5rem; height: 0.5rem; border-radius: 50%; background: var(--color-primary); animation: today-pulse 2s var(--ease-in-out) infinite; }
    @keyframes today-pulse { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-primary) 45%, transparent); } 50% { box-shadow: 0 0 0 6px transparent; } }
    /* Elegido: se llena con la tinta; el punto conserva el color de su estado. */
    .daytab[aria-selected='true'] { background: var(--color-secondary); border-color: var(--color-secondary); color: color-mix(in srgb, var(--color-text-inverse) 72%, transparent); box-shadow: var(--shadow-md); animation: tab-in 360ms var(--ease-spring); }
    .daytab[aria-selected='true'] .daytab__session, .daytab[aria-selected='true'].is-today .daytab__name { color: var(--color-text-inverse); }
    .daytab[aria-selected='true'].is-today::after { background: var(--color-mint); }
    @keyframes tab-in { from { transform: scale(0.93); } }
    .daynav__legend { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); padding-inline: var(--space-2); font-size: var(--text-xs); color: var(--color-text-muted); }
    .key { display: inline-flex; align-items: center; gap: 0.35rem; }
    .key::before { content: ''; width: 0.55rem; height: 0.55rem; border-radius: 50%; background: var(--color-border-strong); }
    .key--today::before { background: transparent; box-shadow: inset 0 0 0 2px var(--color-primary); }
    .key--done::before { background: var(--color-success); }
    .key--partial::before { background: var(--tone-amber); }
    .key--missed::before { background: var(--tone-coral); }
    /* Cada día lleva el color de su sesión (pierna, torso, tracción…), el mismo en toda la app. */
    .daytab { background: var(--tone-soft); color: var(--tone-ink); box-shadow: none; }
    .daytab__name { font-weight: 700; color: var(--tone-ink); }
    .daytab--done, .daytab--partial, .daytab--missed { background: var(--tone-soft); }
    .daytab--rest { background: var(--color-surface); border-color: var(--color-border-strong); color: var(--color-text-muted); }
    .daytab--rest .daytab__name { color: var(--color-text-muted); }
    .daytab.is-today { border-color: var(--tone); }
    .daytab.is-today .daytab__name { color: var(--tone-ink); }
    .daytab.is-today::after { background: var(--tone); }
    .daytab[aria-selected='true'] { background: var(--tone-gradient); border-color: transparent; color: color-mix(in srgb, var(--color-text-inverse) 78%, transparent); }
    .daytab[aria-selected='true'] .daytab__name { color: var(--color-text-inverse); }
    .daytab--rest[aria-selected='true'] { background: var(--color-secondary); }
    .day { border-top: 4px solid var(--tone); }
    .day__head { justify-content: flex-start; align-items: center; }
    .day__title { flex: 1; min-width: 8rem; }
    .day__badge { display: grid; place-items: center; flex: none; width: 3.25rem; height: 3.25rem; border-radius: var(--radius-md); background: var(--tone-gradient); box-shadow: 0 10px 20px -12px var(--tone); font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-text-inverse); }
    .day .day__eyebrow { color: var(--tone-ink); }
    .today { background: var(--tone, var(--color-primary)); }
    .is-today { outline-color: var(--tone, var(--color-primary)); }
    /* Calentamiento y cardio: plegados, con su dibujo animado; abiertos muestran el protocolo completo. */
    .proto > summary { padding-block: var(--space-2); }
    .proto__sum { display: inline-flex; align-items: center; gap: var(--space-2); min-width: 0; }
    .proto__fig { display: grid; place-items: center; flex: none; width: 2.5rem; height: 2.5rem; border-radius: var(--radius-sm); background: var(--color-surface); color: var(--tone-ink); }
    .proto__draw { --figure-accent: var(--tone); --figure-surface: var(--color-surface); }
    .proto__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
    .proto__name small, .proto__title small { font-weight: 500; opacity: 0.8; }
    .proto__title { display: none; margin-bottom: var(--space-2); font-weight: 600; }
    .proto[open] > .details__body { animation: proto-open var(--duration) var(--ease-out); }
    @keyframes proto-open { from { opacity: 0; transform: translateY(-6px); } }
    .cardio.proto { display: block; padding: 0; }
    .cardio > summary b { color: var(--tone-steel-ink); }
    .cardio__body { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3); }
    @media (max-width: 720px) {
      /* Teléfono: contraídos ocupan lo mínimo (dibujo y una palabra); el nombre completo aparece al abrir. */
      .proto:not([open]) { width: fit-content; max-width: 100%; }
      .proto:not([open]) > summary { gap: var(--space-2); padding: var(--space-1) var(--space-3) var(--space-1) var(--space-1); }
      .proto .proto__name { display: none; }
      .proto .proto__title { display: block; }
      .proto__fig { width: 2.25rem; height: 2.25rem; }
      .day__badge { width: 2.75rem; height: 2.75rem; }
    }
    /* El día elegido entra deslizándose: cambiar de día se siente como pasar de hoja. */
    .day, .rest { animation: sheet-in 420ms var(--ease-out) both; }
    @keyframes sheet-in { from { opacity: 0; transform: translateY(16px); } }
    @media (hover: hover) and (pointer: fine) {
      .daytab:not([aria-selected='true']):hover { border-color: var(--color-border-strong); transform: translateY(-2px); }
    }
    /* Teléfono: siete botones compactos en una sola fila (letra del día y punto de estado). */
    @media (max-width: 720px) {
      .daynav { padding: var(--space-1); }
      .daynav__days { gap: 0.25rem; }
      .daytab { justify-items: center; min-height: 3.5rem; padding: 0.45rem 0.1rem; text-align: center; }
      .daytab__session { display: none; }
      .daytab__state { font-size: 0; gap: 0; }
      .daytab__state i { width: 0.6rem; height: 0.6rem; }
      .daytab.is-today::after { display: none; }
      .daynav__legend { justify-content: center; }
    }
    .day { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
    .day__head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: var(--space-3); }
    .day__eyebrow { font-size: var(--text-xs); font-weight: 700; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--color-primary); }
    .day__head h3 { font-size: var(--text-xl); text-transform: uppercase; }
    .day__meta { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--space-3) var(--space-5); }
    .day__date { width: 10rem; }
    .day__sets { font-size: var(--text-xl); }
    .exercise { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-3); padding: var(--space-4); border-radius: var(--radius-md); background: var(--color-background); }
    .exercise__head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
    /* Completado: todas las series con carga y repeticiones. */
    .exercise { border-left: 4px solid transparent; transition: background-color var(--duration); }
    .exercise.is-done { border-left-color: var(--color-success); background: var(--color-success-soft); }
    .exercise__index { display: grid; place-items: center; flex: none; width: 1.75rem; height: 1.75rem; border-radius: 50%; background: var(--color-secondary); font-size: var(--text-xs); font-weight: 700; color: var(--color-text-inverse); }
    .exercise__name { display: grid; flex: 1; min-width: 0; line-height: 1.3; }
    .exercise__name span { font-size: var(--text-xs); color: var(--color-text-muted); }
    .exercise__name strong { font-size: var(--text-base); }
    .muscle { color: var(--tone-ink); }
    .how { background: var(--color-surface); }
    .how p { white-space: pre-line; }
    .figure { width: 4.5rem; height: 4.5rem; --figure-accent: var(--tone); --figure-surface: var(--tone-soft); }
    .pauta { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-5); margin: 0; }
    .pauta dt { font-size: var(--text-xs); color: var(--color-text-muted); }
    .pauta dd { margin: 0; font-weight: 700; font-variant-numeric: tabular-nums; }
    .coach-note { padding: var(--space-2) var(--space-3); border-left: 3px solid var(--color-primary); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; background: var(--color-surface); font-size: var(--text-sm); }
    .sets { display: grid; grid-template-columns: repeat(auto-fill, minmax(11.5rem, 1fr)); gap: var(--space-2); }
    .set { display: flex; align-items: center; gap: var(--space-2); margin: 0; padding: 0; border: 0; min-width: 0; }
    .set legend { float: left; width: 3.6rem; padding: 0; font-size: var(--text-xs); font-weight: 600; color: var(--color-text-muted); }
    .set label { flex: 1; min-width: 0; }
    .cardio { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-4); border-radius: var(--radius-md); background: var(--tone-steel-soft); font-size: var(--text-sm); }
    /* Día de hoy: borde y etiqueta para ubicarse de un vistazo. */
    .is-today { outline: 2px solid var(--color-primary); outline-offset: 2px; scroll-margin-top: 5rem; }
    .today { display: inline-block; margin-left: var(--space-2); padding: 0.1rem 0.6rem; border-radius: var(--radius-pill); background: var(--color-primary); letter-spacing: var(--tracking-wide); color: var(--color-text-inverse); }
    /* Descanso: tarjeta gris, compacta, en su lugar de la semana. */
    .rest { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-3); padding-block: var(--space-4); background: var(--color-surface-alt); box-shadow: none; }
    .rest__head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
    .rest__head > div:first-of-type { flex: 1; min-width: 0; }
    .rest__head h3 { font-size: var(--text-lg); text-transform: uppercase; color: var(--color-text-muted); }
    .rest .day__eyebrow { color: var(--color-text-muted); }
    .rest__icon { display: grid; place-items: center; flex: none; width: 2.5rem; height: 2.5rem; border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-accent); }
    .rest__note { font-size: var(--text-sm); color: var(--color-text-muted); }
    .rest .cardio { background: var(--color-surface); }
    .warmup { background: var(--tone-amber-soft); }
    .warmup > summary b { color: var(--tone-amber-ink); }
    .cardio__log { width: 9rem; }
    /* Rediseño: días sin pastel, descanso plateado y completado con marca */
    .daytab, .daytab--done, .daytab--partial, .daytab--missed { border-top: 4px solid var(--tone); background: var(--color-surface); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tone) 30%, var(--color-border)); }
    .daytab--rest { border-color: transparent; border-top-color: var(--tone-slate); background: var(--color-surface); box-shadow: inset 0 0 0 1px var(--color-border); }
    .daytab.is-today { border-color: var(--tone); }
    .daytab[aria-selected='true'] { border-color: transparent; background: var(--tone-gradient); box-shadow: 0 10px 22px -12px var(--tone); }
    /* El día de descanso elegido es gris plateado, no negro. */
    .daytab--rest[aria-selected='true'] { background: var(--gradient-slate); }
    /* Ejercicio completado: filo verde y palomita, sin teñir todo el bloque. */
    .exercise.is-done { border-left-color: var(--color-success); background: var(--color-background); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-success) 35%, transparent); }
    .done-badge { border-color: transparent; background: var(--gradient-emerald); color: #ffffff; }
    .warmup { background: var(--color-surface); box-shadow: inset 4px 0 0 var(--tone-amber), inset 0 0 0 1px color-mix(in srgb, var(--tone-amber) 30%, var(--color-border)); }
    .cardio, .rest .cardio { background: var(--color-surface); box-shadow: inset 4px 0 0 var(--tone-steel), inset 0 0 0 1px color-mix(in srgb, var(--tone-steel) 30%, var(--color-border)); }
    .proto__fig { background: color-mix(in srgb, var(--tone) 14%, #ffffff); }
    .rest { background: var(--color-surface); box-shadow: inset 0 0 0 1px var(--color-border); border-top: 4px solid var(--tone-slate); }
    .rest__icon { background: var(--gradient-slate); color: #ffffff; }
  `,
})
export class WeekSheet {
  private readonly store = inject(ClientStore);
  readonly week = input.required<TrainingWeek>();
  readonly cardio = input<CardioDay[]>([]);
  readonly warmup = input<WarmupDay[]>([]);
  readonly steps = input<{ trainingDay?: number | null; restDay?: number | null } | null>(null);
  /** Es la semana en curso: se marca el día de hoy. */
  readonly current = input(false);

  /** Lo que el usuario lleva escrito por ejercicio; manda sobre lo que llegue del servidor. */
  private readonly drafts = new Map<string, LoggedSet[]>();

  protected readonly hasTraining = computed(() => this.week().days.some((day) => !this.isRest(day)));
  protected readonly days = computed(() => (this.hasTraining() ? this.week().days : []));
  protected readonly todayDay = computed(() => (this.current() ? weekDayOf(this.store.today()) : null));

  /** Día que se está viendo. Al entrar (o al cambiar de semana) es el de hoy; en semanas pasadas, el primero con entreno. */
  protected readonly selected = signal<number | null>(null);
  protected readonly shown = computed(() => this.days().filter((day) => day.day === this.selected()));

  constructor() {
    effect(() => {
      // Solo se reubica cuando cambia la semana, no en cada guardado.
      this.week().id;
      this.current();
      untracked(() => {
        const days = this.week().days;
        const today = this.todayDay();
        this.selected.set(today ?? days.find((day) => !this.isRest(day))?.day ?? days[0]?.day ?? null);
      });
    });
  }

  /**
   * Cómo va cada día: completo (todos los ejercicios con sus series), incompleto (se registró algo),
   * sin entrenar (ya pasó y no hay registro), pendiente (todavía no llega) o descanso.
   */
  protected state(day: WeekDay): 'done' | 'partial' | 'missed' | 'pending' | 'rest' {
    if (this.isRest(day)) return 'rest';
    if (day.exercises.length && day.exercises.every((exercise) => this.done(exercise))) return 'done';
    if (day.exercises.some((exercise) => this.started(exercise))) return 'partial';
    const today = this.todayDay();
    const isPast = today === null ? !this.current() : day.day < today;
    return isPast && day.exercises.length ? 'missed' : 'pending';
  }

  protected stateLabel(day: WeekDay): string {
    return { done: 'Completo', partial: 'Incompleto', missed: 'Sin entrenar', pending: day.day === this.todayDay() ? 'Hoy' : 'Pendiente', rest: 'Descanso' }[this.state(day)];
  }

  protected isRest(day: WeekDay): boolean {
    return day.session === REST && !day.exercises.length;
  }

  protected warmupFor(day: number): WarmupDay | null {
    const entry = this.warmup().find((w) => w.day === day);
    return entry?.protocol ? entry : null;
  }

  protected cardioFor(day: number): CardioDay | null {
    const entry = this.cardio().find((c) => c.day === day);
    return entry?.protocol && entry.type !== 'NEAT' ? entry : null;
  }

  protected cardioDetail(cardio: CardioDay): string {
    return [cardio.durationMin ? `${cardio.durationMin} min` : null, cardio.intervals && cardio.intervals !== '—' ? cardio.intervals : null, cardio.rpe && cardio.rpe !== '—' ? `RPE ${cardio.rpe}` : null, cardio.hrZone && cardio.hrZone !== '—' ? cardio.hrZone : null, cardio.instructions, cardio.notes]
      .filter(Boolean)
      .join(' · ');
  }

  /** Completado = todas las series tienen carga y repeticiones. Es solo visual. */
  protected done(exercise: WeekExercise): boolean {
    return exercise.logged.length > 0 && exercise.logged.every((set) => set.load !== null && set.reps !== null);
  }

  protected started(exercise: WeekExercise): boolean {
    return exercise.logged.some((set) => set.load !== null || set.reps !== null);
  }

  protected fmt = formatNumber;
  protected readonly tone = muscleTone;
  /** Color del día según su sesión; el mismo criterio que usa el coach al armar el split. */
  protected toneOf = (day: WeekDay) => sessionTone(this.isRest(day) ? 'descanso' : day.session);
  protected readonly figureFor = protocolFigureByName;
  protected readonly equipment = exerciseEquipment;
  protected hint = (symbol: string) => SYMBOLS.find((s) => s.symbol === symbol)?.hint ?? '';
  protected symbolLabel = (symbol: string) => SYMBOLS.find((s) => s.symbol === symbol)?.label ?? '';

  protected setLog(exercise: WeekExercise, index: number, field: keyof LoggedSet, value: string): void {
    const draft = this.drafts.get(exercise.id) ?? exercise.logged.map((set) => ({ ...set }));
    draft[index] = { ...draft[index]!, [field]: toNumber(value) };
    this.drafts.set(exercise.id, draft);
    this.store.logExercise(exercise.id, { logged: draft }).subscribe();
  }

  protected setNotes(exercise: WeekExercise, value: string): void {
    this.store.logExercise(exercise.id, { clientNotes: value.trim() || null }).subscribe();
  }

  protected setDate(day: WeekDay, value: string): void {
    this.store.logWeek(this.week().id, { dayDates: { [day.day]: value || null } }).subscribe();
  }

  protected setCardio(day: WeekDay, value: string): void {
    this.store.logWeek(this.week().id, { cardioLog: { [day.day]: toNumber(value) } }).subscribe();
  }
}
