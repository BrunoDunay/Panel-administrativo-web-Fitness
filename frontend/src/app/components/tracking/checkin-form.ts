import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Btn } from '../buttons/btn';
import { Icon, IconName } from '../icon/icon';
import { CHECKIN_QUESTIONS, CHECKIN_RATINGS } from '../../core/config/tracking-lists';
import { ClientStore } from '../../core/services/client-store';
import { CheckinSession } from '../../core/types/client.model';
import { REST, WEEK_DAYS } from '../../core/types/training.model';
import { formatNumber, toNumber } from '../../core/utils/format';
import { Tone, sessionTone } from '../../core/utils/visuals';

interface Draft {
  date: string | null;
  sessions: CheckinSession[];
  ratings: Record<string, number | null>;
  answers: Record<string, string>;
  avgSteps: number | null;
  avgWeightKg: number | null;
}

const RATING_ICONS: Record<string, IconName> = { energy: 'flame', sleep: 'moon', soreness: 'dumbbell', stress: 'gauge', mood: 'heart', nutrition: 'apple', injury: 'shield' };
/** Del 5 (mejor) al 1 (peor): el color acompaña a la respuesta. */
const SCORE_TONES: Record<number, Tone> = { 5: 'emerald', 4: 'teal', 3: 'slate', 2: 'amber', 1: 'coral' };

/** Cuestionario semanal: RPE por sesión, bienestar (1–5) y respuestas abiertas. */
@Component({
  selector: 'app-checkin-form',
  imports: [Btn, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card card--badge tone--steel icon-hover">
      <span class="card__badge"><app-icon name="clipboard" [size]="26" /></span>
      <h3 class="form-section__title">Cuestionario semanal</h3>
      <p class="card__hint lead">Un cuestionario por semana: le dice a tu coach <b>cómo vas</b> para ajustar tu plan.</p>

      <div class="weeks" role="tablist" aria-label="Semana del cuestionario">
        @for (n of weekOptions(); track n) {
          <button type="button" class="week" role="tab" [attr.aria-selected]="n === week()" [class.is-done]="answered().has(n)" (click)="week.set(n)">
            <small>Semana</small><b>{{ n }}</b>
            @if (answered().has(n)) { <span class="week__check" aria-label="contestado"><app-icon name="check" [size]="11" /></span> }
          </button>
        }
      </div>
    </section>

    <section class="card">
      <header class="card__head card__head--icon icon-hover">
        <span class="tile-icon tone--emerald"><app-icon name="dumbbell" [size]="20" /></span>
        <div>
          <h4 class="card__title">Sesiones de la semana {{ week() }}</h4>
          <p class="card__hint">RPE: qué tan pesada fue la sesión, del 1 (muy ligera) al 10 (máximo esfuerzo).</p>
        </div>
      </header>
      <div class="sessions">
        @for (session of draft().sessions; track session.day) {
          <div [class]="'session tone--' + toneOf(session.day)">
            <span class="session__badge">{{ shortDay(session.day) }}</span>
            <b class="session__name">{{ sessionName(session.day) }}</b>
            <label class="mini"><span>RPE (1–10)</span><input class="cell-input cell-input--num" type="number" inputmode="numeric" min="1" max="10" [value]="session.rpe ?? ''" (change)="setSession(session.day, 'rpe', $any($event.target).value)" /></label>
            <label class="mini"><span>Minutos</span><input class="cell-input cell-input--num" type="number" inputmode="numeric" min="10" max="300" [value]="session.durationMin ?? ''" (change)="setSession(session.day, 'durationMin', $any($event.target).value)" /></label>
            <label class="mini"><span>¿Te gustó? (1–5)</span><input class="cell-input cell-input--num" type="number" inputmode="numeric" min="1" max="5" [value]="session.enjoyment ?? ''" (change)="setSession(session.day, 'enjoyment', $any($event.target).value)" /></label>
          </div>
        } @empty {
          <p class="text-muted">Tu plan todavía no tiene días de entreno.</p>
        }
      </div>
    </section>

    <section class="card">
      <header class="card__head card__head--icon icon-hover">
        <span class="tile-icon tone--coral"><app-icon name="heart" [size]="20" /></span>
        <div>
          <h4 class="card__title">¿Cómo estuvo tu semana?</h4>
          <p class="card__hint">En cada aspecto elige la opción con la que más te identificas.</p>
        </div>
        @if (wellbeing() !== null) {
          <span class="badge badge--success">Bienestar: {{ fmt(wellbeing()) }} de 5</span>
        }
      </header>
      <div class="ratings">
        @for (rating of ratings; track rating.key) {
          <fieldset class="rating icon-hover" [class.is-set]="draft().ratings[rating.key] != null">
            <legend><app-icon [name]="icons[rating.key] ?? 'heart'" [size]="18" />{{ rating.label }}</legend>
            @for (option of rating.options; track option; let i = $index) {
              <button type="button" [class]="'option tone--' + scoreTones[5 - i]" [attr.aria-pressed]="draft().ratings[rating.key] === 5 - i" (click)="setRating(rating.key, 5 - i)">
                <b>{{ 5 - i }}</b><span>{{ option }}</span>
              </button>
            }
          </fieldset>
        }
      </div>
    </section>

    <section class="card">
      <header class="card__head card__head--icon icon-hover">
        <span class="tile-icon tone--teal"><app-icon name="steps" [size]="20" /></span>
        <h4 class="card__title">Tus números de la semana</h4>
      </header>
      <div class="form-grid">
        <label class="field">
          <span class="field__label">Pasos promedio diarios</span>
          <input class="field__control" type="number" inputmode="numeric" min="0" [value]="draft().avgSteps ?? ''" (change)="patch({ avgSteps: num($any($event.target).value) })" />
        </label>
        <label class="field">
          <span class="field__label">Peso promedio de la semana (kg)</span>
          <input class="field__control" type="number" inputmode="decimal" step="0.1" [value]="draft().avgWeightKg ?? ''" (change)="patch({ avgWeightKg: num($any($event.target).value) })" />
        </label>
        <label class="field">
          <span class="field__label">Fecha</span>
          <input class="field__control" type="date" [value]="draft().date ?? ''" (change)="patch({ date: $any($event.target).value || null })" />
        </label>
      </div>
    </section>

    <section class="card">
      <header class="card__head card__head--icon icon-hover">
        <span class="tile-icon tone--steel"><app-icon name="message" [size]="20" /></span>
        <h4 class="card__title">Cuéntale a tu coach</h4>
      </header>
      <div class="form-section">
        @for (question of questions; track question.key) {
          <label class="field">
            <span class="field__label">{{ question.label }}</span>
            <textarea class="field__control" maxlength="3000" [value]="draft().answers[question.key] ?? ''" (change)="setAnswer(question.key, $any($event.target).value)"></textarea>
          </label>
        }
      </div>
    </section>

    <div class="actions">
      <button appBtn type="button" size="lg" [loading]="saving()" [disabled]="saving()" (click)="save()"><app-icon name="check" [size]="18" />Guardar cuestionario de la semana {{ week() }}</button>
    </div>
  `,
  styles: `
    :host { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-5); }
    .lead { max-width: 60ch; margin: var(--space-2) auto var(--space-4); text-align: center; }

    .weeks { display: flex; justify-content: safe center; gap: var(--space-2); padding: 6px 2px 2px; overflow-x: auto; }
    .week { position: relative; display: grid; place-items: center; flex: none; min-width: 3.75rem; min-height: 3.25rem; padding: 0.35rem 0.7rem; border: 0; border-radius: var(--radius-md); background: var(--color-surface-alt); line-height: 1.1; color: var(--color-text-muted); transition: transform 140ms var(--ease-out); }
    .week:active { transform: scale(0.96); }
    .week small { font-size: 0.62rem; font-weight: 700; letter-spacing: var(--tracking-wide); text-transform: uppercase; }
    .week b { font-size: var(--text-lg); }
    .week.is-done { background: var(--tone-emerald-soft); color: var(--tone-emerald-ink); }
    .week[aria-selected='true'] { background: var(--gradient-steel); color: var(--color-text-inverse); box-shadow: 0 8px 16px -8px var(--tone-steel); }
    .week__check { position: absolute; top: -5px; right: -5px; display: grid; place-items: center; width: 1.15rem; height: 1.15rem; border: 2px solid var(--color-surface); border-radius: 50%; background: var(--color-primary); color: var(--color-text-inverse); }

    .sessions { display: grid; gap: var(--space-2); }
    .session { display: grid; grid-template-columns: auto minmax(8rem, 1fr) repeat(3, minmax(5.5rem, 8rem)); align-items: center; gap: var(--space-3); padding: var(--space-3); border-left: 4px solid var(--tone); border-radius: var(--radius-md); background: var(--color-background); }
    .session__badge { display: grid; place-items: center; width: 2.75rem; height: 2.75rem; border-radius: var(--radius-md); background: var(--tone-gradient); font-size: var(--text-xs); font-weight: 700; letter-spacing: var(--tracking-wide); color: var(--color-text-inverse); }
    .session__name { min-width: 0; font-size: var(--text-sm); text-transform: uppercase; overflow-wrap: anywhere; }
    .mini { display: grid; gap: 2px; min-width: 0; }
    .mini > span { font-size: 0.68rem; font-weight: 700; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--color-text-muted); }

    /* Una tarjeta por aspecto; cada respuesta lleva su color (5 verde → 1 coral). */
    .ratings { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: var(--space-3); }
    .rating { display: grid; align-content: start; gap: var(--space-1); min-width: 0; margin: 0; padding: var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); }
    .rating.is-set { border-color: transparent; background: var(--color-background); }
    .rating legend { display: flex; align-items: center; gap: var(--space-2); padding: 0 var(--space-2); font-size: var(--text-sm); font-weight: 700; }
    .option { display: flex; align-items: center; gap: var(--space-2); width: 100%; padding: 0.35rem 0.5rem; border: 1px solid transparent; border-radius: var(--radius-sm); background: transparent; text-align: left; font-size: var(--text-sm); line-height: 1.3; color: var(--color-text-muted); transition: background-color var(--duration-fast), transform 140ms var(--ease-out); }
    .option:active { transform: scale(0.98); }
    .option b { display: grid; place-items: center; flex: none; width: 1.7rem; height: 1.7rem; border-radius: 50%; background: var(--tone-soft); font-size: var(--text-xs); color: var(--tone-ink); }
    .option[aria-pressed='true'] { border-color: var(--tone); background: var(--tone-soft); font-weight: 600; color: var(--color-text); }
    .option[aria-pressed='true'] b { background: var(--tone); color: var(--color-text-inverse); }

    .actions { position: sticky; bottom: var(--space-3); z-index: 2; display: flex; justify-content: flex-end; }
    .actions button { box-shadow: var(--shadow-md); }

    @media (hover: hover) and (pointer: fine) {
      .option:not([aria-pressed='true']):hover { background: var(--color-surface-alt); }
      .week:not([aria-selected='true']):hover { background: var(--tone-steel-soft); color: var(--tone-steel-ink); }
    }
    @media (max-width: 720px) {
      .session { grid-template-columns: auto minmax(0, 1fr); }
      .session .mini { grid-column: span 2; }
      .actions button { width: 100%; white-space: normal; }
    }
  `,
})
export class CheckinForm {
  private readonly store = inject(ClientStore);
  protected readonly ratings = CHECKIN_RATINGS;
  protected readonly questions = CHECKIN_QUESTIONS;
  protected readonly icons = RATING_ICONS;
  protected readonly scoreTones = SCORE_TONES;
  protected readonly fmt = formatNumber;
  protected readonly num = toNumber;
  protected readonly saving = signal(false);

  private readonly checkins = computed(() => this.store.tracking()?.checkins ?? []);
  protected readonly answered = computed(() => new Set(this.checkins().map((c) => c.weekNumber)));
  private readonly lastWeek = computed(() => Math.max(1, this.store.training()?.weeks.at(-1)?.number ?? 1, ...this.checkins().map((c) => c.weekNumber)));
  protected readonly weekOptions = computed(() => Array.from({ length: this.lastWeek() + 1 }, (_, i) => i + 1));

  protected readonly week = signal(1);
  protected readonly draft = signal<Draft>(this.emptyDraft());
  protected readonly wellbeing = computed(() => {
    const values = Object.values(this.draft().ratings).filter((v): v is number => typeof v === 'number');
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  });

  private loadedWeek: number | null = null;

  constructor() {
    // Al abrir, la semana más reciente del plan; al cambiar de semana, carga lo ya contestado.
    effect(() => {
      if (this.loadedWeek === null && this.store.data()) this.week.set(this.lastWeek());
    });
    effect(() => {
      const week = this.week();
      if (!this.store.data() || this.loadedWeek === week) return;
      this.loadedWeek = week;
      const saved = this.checkins().find((c) => c.weekNumber === week);
      const draft = this.emptyDraft();
      if (saved) {
        draft.date = saved.date;
        draft.ratings = { ...saved.ratings };
        draft.answers = Object.fromEntries(Object.entries(saved.answers).map(([key, value]) => [key, value ?? '']));
        draft.avgSteps = saved.avgSteps;
        draft.avgWeightKg = saved.avgWeightKg;
        draft.sessions = draft.sessions.map((session) => ({ ...session, ...saved.sessions.find((s) => s.day === session.day) }));
      }
      this.draft.set(draft);
    });
  }

  private emptyDraft(): Draft {
    const split = this.store.training()?.split ?? [];
    const sessions = split.map((session, i) => ({ session, day: i + 1 })).filter(({ session }) => session !== REST);
    return {
      date: this.store.today(),
      sessions: sessions.map(({ day }) => ({ day, rpe: null, durationMin: null, enjoyment: null })),
      ratings: {},
      answers: {},
      avgSteps: null,
      avgWeightKg: null,
    };
  }

  protected shortDay(day: number): string {
    return (WEEK_DAYS[day - 1] ?? '').slice(0, 3).toUpperCase();
  }

  protected sessionName(day: number): string {
    return this.store.training()?.split[day - 1] ?? '';
  }

  protected toneOf(day: number): Tone {
    return sessionTone(this.sessionName(day));
  }

  protected patch(changes: Partial<Draft>): void {
    this.draft.update((draft) => ({ ...draft, ...changes }));
  }

  protected setSession(day: number, field: 'rpe' | 'durationMin' | 'enjoyment', value: string): void {
    this.patch({ sessions: this.draft().sessions.map((s) => (s.day === day ? { ...s, [field]: toNumber(value) } : s)) });
  }

  protected setRating(key: string, value: number): void {
    const current = this.draft().ratings[key];
    this.patch({ ratings: { ...this.draft().ratings, [key]: current === value ? null : value } });
  }

  protected setAnswer(key: string, value: string): void {
    this.patch({ answers: { ...this.draft().answers, [key]: value } });
  }

  protected save(): void {
    this.saving.set(true);
    this.store.saveCheckin(this.week(), this.draft()).subscribe({ next: () => this.saving.set(false), error: () => this.saving.set(false) });
  }
}
