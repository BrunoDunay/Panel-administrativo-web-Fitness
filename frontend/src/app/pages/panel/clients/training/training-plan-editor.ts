import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Btn } from '../../../../components/buttons/btn';
import { Icon } from '../../../../components/icon/icon';
import { ClientStore } from '../../../../core/services/client-store';
import { Catalog } from '../../../../core/types/catalog.model';
import { MacroBlock, PriorityNote, REST, TrainingView, WEEK_DAYS } from '../../../../core/types/training.model';
import { formatDate, formatNumber } from '../../../../core/utils/format';

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
const LEVELS: { key: Level; label: string }[] = [
  { key: 'p1', label: 'Prioridad 1' },
  { key: 'p2', label: 'Prioridad 2' },
  { key: 'p3', label: 'Prioridad 3' },
  { key: 'maintenance', label: 'Mantenimiento' },
];
const SESSIONS = ['Descanso', 'Torso', 'Pierna', 'Empuje', 'Tracción', 'Full body', 'Brazos', 'Glúteo', 'Pecho / espalda', 'Hombro / brazo'];

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
    .split { display: grid; grid-template-columns: repeat(7, minmax(7.5rem, 1fr)); gap: var(--space-2); overflow-x: auto; padding-bottom: var(--space-1); }
    .levels { display: grid; gap: var(--space-4); }
    .level { display: grid; gap: var(--space-2); padding-bottom: var(--space-4); border-bottom: var(--hairline); }
    .level:last-child { padding-bottom: 0; border-bottom: 0; }
    .level__notes { display: grid; grid-template-columns: 8rem 8rem 1fr; gap: var(--space-2); }
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
  protected readonly sessions = SESSIONS;
  protected readonly date = formatDate;
  protected readonly num = formatNumber;
  protected readonly draft = signal<Draft>(emptyDraft());
  protected readonly saving = signal(false);

  protected readonly muscles = computed(() => this.catalog().muscles.map((muscle) => muscle.name));
  protected readonly trainingDays = computed(() => this.draft().split.filter((session) => session && session !== REST).length);
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
