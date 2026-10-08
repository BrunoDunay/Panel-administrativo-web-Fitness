import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Btn } from '../../../../components/buttons/btn';
import { Icon } from '../../../../components/icon/icon';
import { ClientStore } from '../../../../core/services/client-store';
import { Catalog } from '../../../../core/types/catalog.model';
import { MacroBlock, PriorityNote, REST, TrainingView, WEEK_DAYS } from '../../../../core/types/training.model';
import { formatDate, formatNumber } from '../../../../core/utils/format';
import { SESSION_NAMES, Tone, sessionTone } from '../../../../core/utils/visuals';

type Level = 'p1' | 'p2' | 'p3' | 'maintenance';

interface Draft {
  name: string;
  objective: { primary: string | null; secondary: string | null; startingPoint: string | null; trajectory: string | null };
  blockPhase: string | null;
  blockStart: string | null;
  blockWeeks: number | null;
  split: string[];
  priorities: Record<Level, string[]> & { notes: Record<Level, PriorityNote> };
  macroBlocks: MacroBlock[];
  steps: { trainingDay: number | null; restDay: number | null };
  cardio: { protocol: string | null; moment: string | null; notes: string | null }[];
  warmup: { protocol: string | null; notes: string | null }[];
}

const DAY_MS = 864e5;
const LEVELS: { key: Level; label: string; tone: Tone }[] = [
  { key: 'p1', label: 'Prioridad 1', tone: 'coral' },
  { key: 'p2', label: 'Prioridad 2', tone: 'amber' },
  { key: 'p3', label: 'Prioridad 3', tone: 'steel' },
  { key: 'maintenance', label: 'Mantenimiento', tone: 'slate' },
];

function emptyDraft(): Draft {
  return {
    name: 'Programa de hipertrofia',
    objective: { primary: null, secondary: null, startingPoint: null, trajectory: null },
    blockPhase: 'Adaptación',
    blockStart: null,
    blockWeeks: 4,
    split: Array<string>(7).fill(REST),
    priorities: { p1: [], p2: [], p3: [], maintenance: [], notes: { p1: {}, p2: {}, p3: {}, maintenance: {} } },
    macroBlocks: [],
    steps: { trainingDay: null, restDay: null },
    cardio: Array.from({ length: 7 }, () => ({ protocol: null, moment: null, notes: null })),
    warmup: Array.from({ length: 7 }, () => ({ protocol: null, notes: null })),
  };
}

/** Objetivo, bloque, split, prioridades, pasos, cardio, calentamiento y planeación de bloques. */
@Component({
  selector: 'app-training-plan-editor',
  imports: [FormsModule, Btn, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './training-plan-editor.html',
  styles: `
    form { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
    .center { justify-content: center; text-align: center; }
    .computed--tone { background: var(--tone-soft); color: var(--tone-ink); }

    /* Split: un mosaico por día, con el color de la sesión. */
    .split { display: grid; grid-template-columns: repeat(7, minmax(7rem, 1fr)); gap: var(--space-2); overflow-x: auto; padding-bottom: var(--space-1); }
    .split__day { display: grid; gap: var(--space-2); padding: var(--space-3); border-top: 4px solid var(--tone); border-radius: var(--radius-md); background: var(--tone-soft); transition: background-color var(--duration); }
    .split__day.is-rest { border-top-color: var(--color-border-strong); background: var(--color-background); }
    .split__name { font-size: var(--text-xs); font-weight: 700; letter-spacing: var(--tracking-wider); text-transform: uppercase; color: var(--tone-ink); }
    .split__input { width: 100%; min-height: 2.5rem; padding: 0.3rem 0.55rem; border: 1px solid transparent; border-radius: var(--radius-sm); background: var(--color-surface); font-size: 1rem; font-weight: 700; }
    .split__input::placeholder { font-weight: 500; color: var(--color-text-muted); }
    .split__input:focus { outline: none; border-color: var(--tone); box-shadow: 0 0 0 3px var(--tone-soft); }

    /* Prioridades: cada nivel con su color. */
    .levels { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: var(--space-3); }
    .level { display: grid; align-content: start; gap: var(--space-3); padding: var(--space-4); border-left: 4px solid var(--tone); border-radius: var(--radius-md); background: var(--tone-soft); }
    .level__head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
    .level__tag { font-size: var(--text-xs); font-weight: 700; letter-spacing: var(--tracking-wider); text-transform: uppercase; color: var(--tone-ink); }
    .level__notes { display: grid; grid-template-columns: 7rem 7rem 1fr; gap: var(--space-2); }
    .chip--tone[aria-pressed='true'] { border-color: var(--tone); background: var(--tone); }

    .daycell { display: flex; align-items: center; gap: var(--space-2); }
    .daycell small { display: block; font-weight: 400; color: var(--color-text-muted); }
    .actions { position: sticky; bottom: var(--space-3); z-index: 2; display: flex; justify-content: flex-end; }
    .actions button { box-shadow: var(--shadow-md); }
    .icon-btn { display: grid; place-items: center; width: 2.2rem; height: 2.2rem; border: 0; border-radius: 50%; background: transparent; color: var(--color-text-muted); }
    @media (hover: hover) and (pointer: fine) { .icon-btn:hover { background: var(--color-danger-soft); color: var(--color-danger); } }
    @media (max-width: 640px) { .level__notes { grid-template-columns: 1fr 1fr; } .level__notes > :last-child { grid-column: 1 / -1; } }
  `,
})
export class TrainingPlanEditor {
  private readonly store = inject(ClientStore);
  readonly plan = input<TrainingView | null>(null);
  readonly catalog = input.required<Catalog>();

  protected readonly days = WEEK_DAYS;
  protected readonly levels = LEVELS;
  protected readonly sessions = SESSION_NAMES;
  protected readonly sessionTone = sessionTone;
  protected readonly date = formatDate;
  protected readonly num = formatNumber;
  protected readonly draft = signal<Draft>(emptyDraft());
  protected readonly saving = signal(false);

  protected readonly muscles = computed(() => this.catalog().muscles.map((muscle) => muscle.name));
  protected readonly trainingDays = computed(() => this.draft().split.filter((session) => this.isTraining(session)).length);
  protected readonly blockEnd = computed(() => this.endOf(this.draft().blockStart, this.draft().blockWeeks));
  protected readonly weeklySteps = computed(() => {
    const { trainingDay, restDay } = this.draft().steps;
    if (!trainingDay || !restDay) return null;
    return Math.round((trainingDay * this.trainingDays() + restDay * (7 - this.trainingDays())) / 7);
  });
  protected readonly cardioMinutes = computed(() => this.draft().cardio.reduce((sum, day) => sum + (this.protocol(day.protocol)?.durationMin ?? 0), 0));

  /** Fechas del macrociclo: cada bloque empieza al día siguiente del anterior. */
  protected readonly schedule = computed(() => {
    let start = this.draft().blockStart;
    return this.draft().macroBlocks.map((block) => {
      const end = this.endOf(start, block.weeks);
      const row = { start: end ? start : null, end };
      start = end ? new Date(Date.parse(`${end}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10) : null;
      return row;
    });
  });

  constructor() {
    effect(() => {
      const plan = this.plan();
      if (!plan) return;
      const base = emptyDraft();
      this.draft.set({
        name: plan.name,
        objective: { ...base.objective, ...plan.objective },
        blockPhase: plan.blockPhase,
        blockStart: plan.blockStart,
        blockWeeks: plan.blockWeeks,
        split: [...plan.split],
        priorities: {
          p1: [...plan.priorities.p1],
          p2: [...plan.priorities.p2],
          p3: [...plan.priorities.p3],
          maintenance: [...plan.priorities.maintenance],
          notes: { ...base.priorities.notes, ...structuredClone(plan.priorities.notes ?? {}) },
        },
        macroBlocks: plan.macroBlocks.map(({ phase, weeks, focus, notes }) => ({ phase, weeks, focus, notes })),
        steps: { trainingDay: plan.steps.trainingDay ?? null, restDay: plan.steps.restDay ?? null },
        cardio: plan.cardio.map(({ protocol, moment, notes }) => ({ protocol: protocol || null, moment: moment || null, notes: notes || null })),
        warmup: plan.warmup.map(({ protocol, notes }) => ({ protocol: protocol || null, notes: notes || null })),
      });
    });
  }

  private endOf(start: string | null, weeks: number | null | undefined): string | null {
    if (!start || !weeks) return null;
    return new Date(Date.parse(`${start}T00:00:00Z`) + (weeks * 7 - 1) * DAY_MS).toISOString().slice(0, 10);
  }

  protected protocol(name: string | null) {
    return this.catalog().cardioProtocols.find((p) => p.name === name) ?? null;
  }

  protected warmupProtocol(name: string | null) {
    return this.catalog().warmupProtocols.find((p) => p.name === name) ?? null;
  }

  protected isTraining(session: string | null | undefined): boolean {
    return !!session?.trim() && session !== REST;
  }

  protected setSession(index: number, value: string): void {
    this.draft().split[index] = value;
    this.refresh();
  }

  /** Los campos escriben directo en el borrador; esto avisa a lo calculado. */
  protected refresh(): void {
    this.draft.update((draft) => ({ ...draft }));
  }

  protected toggleMuscle(level: Level, muscle: string): void {
    const list = this.draft().priorities[level];
    const index = list.indexOf(muscle);
    if (index >= 0) list.splice(index, 1);
    else if (list.length < 4) list.push(muscle);
    this.refresh();
  }

  /** Un músculo solo puede estar en un nivel de prioridad. */
  protected takenElsewhere(level: Level, muscle: string): boolean {
    return LEVELS.some((other) => other.key !== level && this.draft().priorities[other.key].includes(muscle));
  }

  protected addBlock(): void {
    this.draft().macroBlocks.push({ phase: 'Acumulación', weeks: 4, focus: null, notes: null });
    this.refresh();
  }

  protected removeBlock(index: number): void {
    this.draft().macroBlocks.splice(index, 1);
    this.refresh();
  }

  protected save(): void {
    this.saving.set(true);
    const draft = this.draft();
    const body = { ...draft, name: draft.name.trim() || 'Programa de hipertrofia', split: draft.split.map((session) => session?.trim() || REST) };
    this.store.saveTrainingPlan(body).subscribe({ next: () => this.saving.set(false), error: () => this.saving.set(false) });
  }
}
