import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { catchError, debounceTime, filter, of, switchMap, tap } from 'rxjs';
import { Btn } from '../../../../components/buttons/btn';
import { Icon } from '../../../../components/icon/icon';
import { FoodPicker, OptionState } from '../../../../components/nutrition/food-picker';
import { ClientStore } from '../../../../core/services/client-store';
import { Catalog, Food } from '../../../../core/types/catalog.model';
import { MealChoice, MealSlot, NutritionDraft, NutritionView } from '../../../../core/types/nutrition.model';
import { WEEK_DAYS } from '../../../../core/types/training.model';
import { formatNumber, formatPercent, formatSigned } from '../../../../core/utils/format';
import { foodEmoji } from '../../../../core/utils/visuals';

const SLOTS: { key: MealSlot; label: string; flag: keyof Food; portions?: 'vegetablePortions' | 'fruitPortions' }[] = [
  { key: 'protein1', label: 'Proteína 1', flag: 'asProtein' },
  { key: 'protein2', label: 'Proteína 2', flag: 'asProtein' },
  { key: 'carb1', label: 'Carbo 1', flag: 'asCarb' },
  { key: 'carb2', label: 'Carbo 2', flag: 'asCarb' },
  { key: 'fat', label: 'Grasa', flag: 'asFat' },
  { key: 'vegetable', label: 'Verdura', flag: 'asVegetable', portions: 'vegetablePortions' },
  { key: 'fruit', label: 'Fruta', flag: 'asFruit', portions: 'fruitPortions' },
];

type ManualKey = 'proteinPct' | 'carbsPct' | 'fatPct';
type MomentKey = 'preWorkoutMeal' | 'postWorkoutMeal';

/** Etiquetas que se arrastran a la comida que va antes y después de entrenar. */
const MOMENT_TAGS: { key: MomentKey; label: string }[] = [
  { key: 'preWorkoutMeal', label: 'Pre-entreno' },
  { key: 'postWorkoutMeal', label: 'Post-entreno' },
];

/** Margen con el que una cantidad se da por cuadrada: ±5 % de su objetivo. */
const FIT_TOLERANCE = 0.05;

const emptyMeal = (): MealChoice => ({
  style: 'Mixto',
  protein1: null,
  protein2: null,
  carb1: null,
  carb2: null,
  fat: null,
  vegetable: null,
  vegetablePortions: 1,
  fruit: null,
  fruitPortions: 1,
  swaps: {},
});

/**
 * Plan de nutrición del coach: datos y objetivo, reparto por comida, alimentos (los gramos
 * salen solos), cambios, intra-entreno, hidratación y suplementos. Cada cambio se recalcula
 * en el servidor con el mismo motor que verá el cliente.
 */
@Component({
  selector: 'app-nutrition-editor',
  imports: [FormsModule, Btn, Icon, FoodPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nutrition-editor.html',
  styleUrl: './nutrition-editor.css',
})
export class NutritionEditor {
  private readonly store = inject(ClientStore);
  readonly view = input.required<NutritionView>();
  readonly catalog = input.required<Catalog>();

  protected readonly slots = SLOTS;
  protected readonly days = WEEK_DAYS;
  protected readonly num = formatNumber;
  protected readonly pct = formatPercent;
  protected readonly signed = formatSigned;

  protected readonly draft = signal<NutritionDraft | null>(null);
  /** Resultado del último cálculo del borrador. */
  protected readonly preview = signal<NutritionView | null>(null);
  protected readonly calculating = signal(false);
  protected readonly saving = signal(false);
  protected readonly errors = signal<Record<string, string>>({});

  protected readonly computed = computed(() => this.preview()?.computed ?? null);
  protected readonly missing = computed(() => this.preview()?.missing ?? this.view().missing);
  protected readonly mealNumbers = computed(() => Array.from({ length: this.draft()?.inputs.mealCount ?? 0 }, (_, i) => i + 1));
  private readonly foodsById = computed(() => new Map(this.catalog().foods.map((food) => [food.id, food])));
  protected readonly intraFoods = computed(() => this.catalog().foods.filter((food) => food.asCarb && food.carbsG > 0 && food.proteinG < 3 && food.fatG < 2));

  private loadedId: string | null | undefined;

  constructor() {
    // Carga el borrador una vez por plan (no en cada recarga, para no pisar lo que se está editando).
    effect(() => {
      const view = this.view();
      if (this.loadedId === view.id && this.draft()) return;
      this.loadedId = view.id;
      this.preview.set(view);
      this.draft.set({
        startDate: view.startDate,
        allowClientSwaps: view.allowClientSwaps,
        inputs: structuredClone(view.inputs),
        meals: Array.from({ length: view.inputs.mealsMeta.length }, (_, i) => ({ ...emptyMeal(), ...structuredClone(view.meals[i] ?? {}) })),
        intra: { foodId: view.intra.foodId ?? null, carbsG: view.intra.carbsG ?? null },
        hydration: { sessionMin: 75, sweatRateLPerH: 0.8, ...structuredClone(view.hydrationInputs), test: { ...(view.hydrationInputs.test ?? {}) } },
        supplements: structuredClone(view.supplementInputs),
      });
    });

    toObservable(this.draft)
      .pipe(
        filter((draft) => draft !== null),
        debounceTime(300),
        tap(() => this.calculating.set(true)),
        switchMap((draft) => this.store.previewNutrition(this.payload(draft)).pipe(catchError(() => of(null)))),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.calculating.set(false);
        if (result) this.preview.set(result);
      });
  }

  /** Los campos escriben directo en el borrador; esto dispara el recálculo. */
  protected refresh(): void {
    // Lo que cabe o no en cada comida depende del borrador: se vuelve a pedir al abrir un selector.
    this.optionStates.set({});
    this.draft.update((draft) => (draft ? { ...draft } : draft));
  }

  // ---- Pre y post entreno ----

  protected readonly momentTags = MOMENT_TAGS;
  /** Etiqueta que se está arrastrando (o que se tocó para colocarla con otro toque). */
  protected readonly armed = signal<MomentKey | null>(null);

  protected placedAt(key: MomentKey): number | null {
    const meal = this.draft()?.inputs[key] ?? null;
    return meal !== null && meal <= (this.draft()?.inputs.mealCount ?? 0) ? meal : null;
  }

  protected startDrag(event: DragEvent, key: MomentKey): void {
    event.dataTransfer?.setData('text/plain', key);
    this.armed.set(key);
  }

  protected arm(key: MomentKey): void {
    this.armed.update((current) => (current === key ? null : key));
  }

  protected place(meal: number): void {
    const key = this.armed();
    if (!key) return;
    this.draft()!.inputs[key] = meal;
    this.armed.set(null);
    this.refresh();
  }

  protected unplace(key: MomentKey): void {
    this.draft()!.inputs[key] = null;
    this.refresh();
  }

  // ---- Qué alimentos caben en cada renglón ----

  protected readonly optionStates = signal<Record<string, Record<number, OptionState>>>({});
  protected readonly emoji = (food: Food) => foodEmoji(food.name, food.icon);

  protected loadStates(mealIndex: number, slot: MealSlot, foods: Food[]): void {
    const draft = this.draft();
    if (!draft || mealIndex >= draft.inputs.mealCount) return;
    const key = mealIndex + slot;
    this.store.nutritionOptions(this.payload(draft), mealIndex, slot, foods.map((food) => food.id)).subscribe({
      next: (states) => this.optionStates.update((all) => ({ ...all, [key]: states })),
      error: () => undefined,
    });
  }

  protected setFood(meal: MealChoice, slot: MealSlot, id: number | null): void {
    meal[slot] = id;
    this.clearSlot(meal, slot);
  }

  private payload(draft: NutritionDraft): NutritionDraft {
    const inputs = { ...draft.inputs };
    // Una comida pre/post que ya no existe (se redujo el número de comidas) deja de aplicar.
    if ((inputs.preWorkoutMeal ?? 0) > inputs.mealCount) inputs.preWorkoutMeal = null;
    if ((inputs.postWorkoutMeal ?? 0) > inputs.mealCount) inputs.postWorkoutMeal = null;
    return {
      ...draft,
      inputs,
      meals: draft.meals.slice(0, inputs.mealCount),
      supplements: draft.supplements.filter((entry) => entry.supplementId),
    };
  }

  // ---- Reparto manual ----

  /** % ya asignado a mano por macro; null si ese macro sigue en automático. */
  protected readonly manualTotals = computed(() => {
    const draft = this.draft();
    const metas = draft?.inputs.mealsMeta.slice(0, draft.inputs.mealCount) ?? [];
    const total = (key: ManualKey) => (metas.some((meta) => typeof meta.manual[key] === 'number') ? metas.reduce((sum, meta) => sum + (Number(meta.manual[key]) || 0), 0) : null);
    return { proteinPct: total('proteinPct'), carbsPct: total('carbsPct'), fatPct: total('fatPct') };
  });

  /** Un % manual nunca deja que el macro pase de 100 % entre todas las comidas. */
  protected setManual(index: number, key: ManualKey, value: number | null, field: HTMLInputElement): void {
    const draft = this.draft()!;
    const metas = draft.inputs.mealsMeta.slice(0, draft.inputs.mealCount);
    const others = metas.reduce((sum, meta, i) => sum + (i === index ? 0 : Number(meta.manual[key]) || 0), 0);
    const allowed = typeof value === 'number' ? Math.max(0, Math.min(value, 100 - others)) : null;
    metas[index]!.manual[key] = allowed;
    if (allowed !== value) field.value = allowed === null ? '' : String(allowed);
    this.refresh();
  }

  /** Objetivo contra plan del día, para ver de un vistazo si las cantidades cuadran. */
  protected readonly fit = computed(() => {
    const c = this.computed();
    if (!c) return [];
    const row = (label: string, kind: 'training' | 'rest') => {
      const goal = c.cycle[kind];
      const plan = c.dayTotals[kind];
      const item = (name: string, planned: number, target: number, unit: string) => {
        const diff = Math.round(planned) - Math.round(target);
        const tolerance = Math.max(1, target * FIT_TOLERANCE);
        return { name, plan: planned, goal: target, unit, diff, state: Math.abs(diff) <= tolerance ? 'ok' : diff < 0 ? 'low' : 'high' };
      };
      return { label, items: [item('Calorías', plan.kcal, goal.kcal, 'kcal'), item('Proteína', plan.proteinG, goal.proteinG, 'g'), item('Carbos', plan.carbsG, goal.carbsG, 'g'), item('Grasa', plan.fatG, goal.fatG, 'g')] };
    };
    return [row('Día de entreno', 'training'), row('Día de descanso', 'rest')];
  });

  // ---- Alimentos ----

  /** Alimentos válidos para un tipo de fila, según el tipo de alimentación y el estilo de la comida. */
  protected options(meal: MealChoice, flag: keyof Food, selected?: number | null): Food[] {
    const allowed = this.catalog().lists.dietTypes.find((type) => type.key === this.draft()?.inputs.dietType)?.foodTypes ?? null;
    return this.catalog().foods.filter(
      (food) =>
        food.id === selected ||
        (food[flag] === true && (!allowed || allowed.includes(food.foodType)) && (meal.style === 'Mixto' || food.style === 'Ambos' || food.style === meal.style)),
    );
  }

  protected foodName(id: number | null | undefined): string {
    return (id && this.foodsById().get(id)?.name) || '';
  }

  protected item(mealIndex: number, slot: MealSlot) {
    return this.computed()?.meals[mealIndex]?.items.find((item) => item.slot === slot) ?? null;
  }

  protected swapsOf(meal: MealChoice, slot: MealSlot): (number | null)[] {
    const list: (number | null)[] = [...(meal.swaps[slot] ?? [])];
    while (list.length < 3) list.push(null);
    return list;
  }

  protected setSwap(meal: MealChoice, slot: MealSlot, index: number, value: number | null): void {
    const list = this.swapsOf(meal, slot);
    list[index] = value;
    meal.swaps[slot] = list.filter((id): id is number => id !== null);
    this.refresh();
  }

  protected clearSlot(meal: MealChoice, slot: MealSlot): void {
    if (!meal[slot]) delete meal.swaps[slot];
    this.refresh();
  }

  // ---- Suplementos ----

  protected addSupplement(): void {
    const first = this.catalog().supplements.find((s) => !this.draft()!.supplements.some((entry) => entry.supplementId === s.id));
    if (!first) return;
    this.draft()!.supplements.push({ supplementId: first.id, assignedDose: null, timing: null });
    this.refresh();
  }

  protected removeSupplement(index: number): void {
    this.draft()!.supplements.splice(index, 1);
    this.refresh();
  }

  protected supplement(id: number) {
    return this.catalog().supplements.find((s) => s.id === id) ?? null;
  }

  protected recommended(id: number): string {
    return this.computed()?.supplements.find((s) => s.supplementId === id)?.recommendedDose ?? this.supplement(id)?.doseText ?? '—';
  }

  protected toggleDay(index: number): void {
    const days = this.draft()!.inputs.trainingDays;
    days[index] = !days[index];
    this.refresh();
  }

  protected save(): void {
    const draft = this.draft();
    if (!draft) return;
    this.saving.set(true);
    this.errors.set({});
    this.store.saveNutrition(this.payload(draft)).subscribe({
      next: () => this.saving.set(false),
      error: (error: { fields?: Record<string, string> }) => {
        this.saving.set(false);
        this.errors.set(error.fields ?? {});
      },
    });
  }
}
