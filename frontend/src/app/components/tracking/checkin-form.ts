import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Btn } from '../buttons/btn';
import { CHECKIN_QUESTIONS, CHECKIN_RATINGS } from '../../core/config/tracking-lists';
import { ClientStore } from '../../core/services/client-store';
import { CheckinSession } from '../../core/types/client.model';
import { REST, WEEK_DAYS } from '../../core/types/training.model';
import { formatNumber, toNumber } from '../../core/utils/format';

interface Draft {
  date: string | null;
  sessions: CheckinSession[];
  ratings: Record<string, number | null>;
  answers: Record<string, string>;
  avgSteps: number | null;
  avgWeightKg: number | null;
}

/** Cuestionario semanal: RPE por sesión, bienestar (1–5) y respuestas abiertas. */
@Component({
  selector: 'app-checkin-form',
  imports: [Btn],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card">
      <header class="card__head">
        <div>
          <h3 class="card__title">Cuestionario semanal</h3>
          <p class="card__hint">Un cuestionario por semana. Elige en cada aspecto la opción con la que más te identificas.</p>
        </div>
        <label class="row">
          <span class="card__hint">Semana</span>
          <select class="cell-input week" [value]="week()" (change)="week.set(+$any($event.target).value)">
            @for (n of weekOptions(); track n) {
              <option [value]="n" [selected]="n === week()">{{ n }}{{ answered().has(n) ? ' ✓' : '' }}</option>
            }
          </select>
        </label>
      </header>

      <div class="stack">
        <div class="form-section">
          <h4 class="form-section__title">Sesiones de la semana</h4>
          <div class="table-wrap">
            <table class="table table--compact">
              <thead><tr><th>Sesión</th><th>RPE (1–10)</th><th>Duración (min)</th><th>¿Te gustó? (1–5)</th></tr></thead>
              <tbody>
                @for (session of draft().sessions; track session.day) {
                  <tr>
                    <td>Día {{ session.day }} · {{ sessionName(session.day) }}</td>
                    <td><input class="cell-input cell-input--num" type="number" inputmode="numeric" min="1" max="10" [value]="session.rpe ?? ''" (change)="setSession(session.day, 'rpe', $any($event.target).value)" [attr.aria-label]="'RPE del día ' + session.day" /></td>
                    <td><input class="cell-input cell-input--num" type="number" inputmode="numeric" min="10" max="300" [value]="session.durationMin ?? ''" (change)="setSession(session.day, 'durationMin', $any($event.target).value)" [attr.aria-label]="'Duración del día ' + session.day" /></td>
                    <td><input class="cell-input cell-input--num" type="number" inputmode="numeric" min="1" max="5" [value]="session.enjoyment ?? ''" (change)="setSession(session.day, 'enjoyment', $any($event.target).value)" [attr.aria-label]="'Qué tanto te gustó el día ' + session.day" /></td>
                  </tr>
                } @empty {
                  <tr><td colspan="4" class="text-muted">Tu plan todavía no tiene días de entreno.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="form-section">
          <h4 class="form-section__title">¿Cómo estuvo tu semana?</h4>
          @for (rating of ratings; track rating.key) {
            <fieldset class="rating">
              <legend>{{ rating.label }}</legend>
              <div class="chips">
                @for (option of rating.options; track option; let i = $index) {
                  <button type="button" class="chip" [attr.aria-pressed]="draft().ratings[rating.key] === 5 - i" (click)="setRating(rating.key, 5 - i)">
                    <b>{{ 5 - i }}</b> {{ option }}
                  </button>
                }
              </div>
            </fieldset>
          }
        </div>

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

        <div class="form-section">
          @for (question of questions; track question.key) {
            <label class="field">
              <span class="field__label">{{ question.label }}</span>
              <textarea class="field__control" maxlength="3000" [value]="draft().answers[question.key] ?? ''" (change)="setAnswer(question.key, $any($event.target).value)"></textarea>
            </label>
          }
        </div>

        <div class="row row--between">
          <p class="card__hint">
            @if (wellbeing() !== null) {
              Índice de bienestar: <b>{{ fmt(wellbeing()) }}</b> de 5
            }
          </p>
          <button appBtn type="button" [loading]="saving()" [disabled]="saving()" (click)="save()">Guardar cuestionario</button>
        </div>
      </div>
    </section>
  `,
  styles: `
    .week { width: 5rem; }
    .rating { margin: 0; padding: 0; border: 0; }
    .rating legend { margin-bottom: var(--space-2); padding: 0; font-size: var(--text-sm); font-weight: 600; }
    .rating .chip { text-align: left; }
    .rating .chip b { margin-right: 0.3rem; }
  `,
})
export class CheckinForm {
  private readonly store = inject(ClientStore);
  protected readonly ratings = CHECKIN_RATINGS;
  protected readonly questions = CHECKIN_QUESTIONS;
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

  protected sessionName(day: number): string {
    return `${WEEK_DAYS[day - 1]} · ${this.store.training()?.split[day - 1] ?? ''}`;
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
