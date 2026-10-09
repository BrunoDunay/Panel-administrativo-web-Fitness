import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { catchError, debounceTime, filter, of, switchMap, tap } from 'rxjs';
import { Btn } from '../../../../components/buttons/btn';
import { Icon } from '../../../../components/icon/icon';
import { FoodPicker, PickerFood } from '../../../../components/nutrition/food-picker';
import { ClientStore } from '../../../../core/services/client-store';
import { Catalog } from '../../../../core/types/catalog.model';
import { Adequacy, ComputedItem, MealDraft, MealExtraDraft, MealItemDraft, NutritionDraft, NutritionView, SmaeGroupKey } from '../../../../core/types/nutrition.model';
import { formatNumber, formatPercent, formatSigned } from '../../../../core/utils/format';

const emptyMeal = (): MealDraft => ({ items: [], extras: [], notes: null });
/** Las porciones se reparten de media en media. */
const STEP = 0.5;
const MAX_EXTRAS = 2;
/** Notas frecuentes de un alimento adicional; el coach puede escribir la suya. */
const EXTRA_NOTES = ['Solo los días de entreno', 'Solo los días de descanso', 'Después de entrenar', 'Opcional: solo si te quedas con hambre'];

const METRICS = [
  { key: 'kcal', label: 'Calorías', unit: 'kcal' },
  { key: 'proteinG', label: 'Proteína', unit: 'g' },
  { key: 'fatG', label: 'Grasa', unit: 'g' },
  { key: 'carbsG', label: 'Carbohidratos', unit: 'g' },
] as const;

/**
 * Plan de nutrición por porciones (Sistema Mexicano de Alimentos Equivalentes):
 * 1) gasto y objetivo; 2) dietocálculo: porciones al día de cada grupo contra el ideal;
 * 3) menú: se reparten esas porciones entre las comidas (sin poder pasarse) y se elige el alimento,
 * cuya cantidad sale sola. Cada cambio se recalcula en el servidor.
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

  protected readonly metrics = METRICS;
  protected readonly extraNotes = EXTRA_NOTES;
  protected readonly maxExtras = MAX_EXTRAS;
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
  protected readonly intraFoods = computed(() => this.catalog().foods.filter((food) => food.asCarb && food.carbsG > 0 && food.proteinG < 3 && food.fatG < 2));
  /** Para los alimentos adicionales se puede elegir cualquiera del catálogo. */
  protected readonly allFoods = computed<PickerFood[]>(() => this.catalog().foods.map(({ id, name, icon }) => ({ id, name, icon })));

  /** Grupos con sus valores por porción (los define el servidor). */
  protected readonly groups = computed(() => this.computed()?.diet.groups ?? []);
  /** Grupos con porciones en el día: son los que se reparten en las comidas. */
  protected readonly activeGroups = computed(() => {
    const portions = this.draft()?.inputs.portions ?? {};
    return this.groups().filter((group) => (portions[group.key] ?? 0) > 0);
  });

  /** Porciones del día que quedan por repartir en cada grupo (negativo = se repartieron de más). */
  protected readonly remaining = computed(() => {
    const draft = this.draft();
    const left: Record<SmaeGroupKey, number> = {};
    if (!draft) return left;
    for (const group of this.groups()) left[group.key] = draft.inputs.portions[group.key] ?? 0;
    for (const meal of draft.meals.slice(0, draft.inputs.mealCount)) for (const item of meal.items) left[item.group] = (left[item.group] ?? 0) - item.portions;
    return left;
  });
  protected readonly pending = computed(() => this.activeGroups().filter((group) => Math.abs(this.remaining()[group.key] ?? 0) > 0.001));

  /** Alimentos de cada grupo que admite el tipo de alimentación del cliente. */
  private readonly groupFoods = computed(() => {
    const allowed = this.catalog().lists.dietTypes.find((type) => type.key === this.draft()?.inputs.dietType)?.foodTypes ?? null;
    const options: Record<SmaeGroupKey, PickerFood[]> = {};
    for (const [key, foods] of Object.entries(this.computed()?.equivalents ?? {})) {
      options[key] = foods.filter((food) => !allowed || allowed.includes(food.foodType)).map(({ foodId, name, icon }) => ({ id: foodId, name, icon }));
    }
    return options;
  });

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
    this.draft.update((draft) => (draft ? { ...draft } : draft));
  }

  private payload(draft: NutritionDraft): NutritionDraft {
    return {
      ...draft,
      meals: draft.meals.slice(0, draft.inputs.mealCount).map((meal) => ({
        items: meal.items.filter((item) => item.portions > 0),
        extras: meal.extras.filter((extra) => extra.foodId),
        notes: meal.notes?.trim() || null,
      })),
      supplements: draft.supplements.filter((entry) => entry.supplementId),
    };
  }

  // ---- Ajuste de calorías: signo aparte del número ----

  /** Signo elegido cuando el ajuste vale 0 (el número solo no lo dice). */
  private readonly zeroDeficit = signal(false);
  protected readonly deficit = computed(() => {
    const value = this.draft()?.inputs.adjustmentKcal ?? 0;
    return value === 0 ? this.zeroDeficit() : value < 0;
  });
  protected readonly abs = (value: number | null | undefined) => Math.abs(value ?? 0);

  protected setAdjustment(value: number | null): void {
    this.draft()!.inputs.adjustmentKcal = (this.deficit() ? -1 : 1) * Math.abs(Number(value) || 0);
    this.refresh();
  }

  protected flipAdjustment(): void {
    const inputs = this.draft()!.inputs;
    this.zeroDeficit.set(!this.deficit());
    inputs.adjustmentKcal = -inputs.adjustmentKcal || 0;
    this.refresh();
  }

  // ---- Dietocálculo: porciones del día ----

  protected daily(key: SmaeGroupKey): number {
    return this.draft()?.inputs.portions[key] ?? 0;
  }

  protected setDaily(key: SmaeGroupKey, value: number | null): void {
    const portions = this.draft()!.inputs.portions;
    const next = Math.max(0, Math.round((Number(value) || 0) / STEP) * STEP);
    if (next) portions[key] = next;
    else delete portions[key];
    this.refresh();
  }

  protected stateLabel(item: Adequacy, unit: string): string {
    if (item.state === 'ok') return 'Cuadra';
    if (item.state === 'none') return 'Sin objetivo';
    return `${item.state === 'low' ? 'Faltan' : 'Sobran'} ${formatNumber(Math.abs(item.diff), 0)} ${unit}`;
  }

  // ---- Menú: reparto de porciones por comida ----

  protected rowsOf(meal: MealDraft, key: SmaeGroupKey): MealItemDraft[] {
    return meal.items.filter((item) => item.group === key);
  }

  protected left(key: SmaeGroupKey): number {
    return this.remaining()[key] ?? 0;
  }

  /** Agrega un renglón del grupo con lo que quede por repartir (como mucho, una porción). */
  protected addItem(meal: MealDraft, key: SmaeGroupKey): void {
    const left = this.left(key);
    if (left <= 0) return;
    meal.items.push({ group: key, portions: Math.min(1, left), foodId: null });
    this.refresh();
  }

  /** Nunca deja repartir más porciones de las que quedan en el día. */
  protected setPortions(meal: MealDraft, item: MealItemDraft, value: number | null, field?: HTMLInputElement): void {
    const max = item.portions + Math.max(0, this.left(item.group));
    const next = Math.min(max, Math.max(0, Math.round((Number(value) || 0) / STEP) * STEP));
    if (next === 0) meal.items.splice(meal.items.indexOf(item), 1);
    else item.portions = next;
    if (field && next !== value) field.value = String(next);
    this.refresh();
  }

  protected removeItem(meal: MealDraft, item: MealItemDraft): void {
    meal.items.splice(meal.items.indexOf(item), 1);
    this.refresh();
  }

  protected foodsOf(key: SmaeGroupKey): PickerFood[] {
    return this.groupFoods()[key] ?? [];
  }

  protected setFood(item: MealItemDraft | MealExtraDraft, id: number | null): void {
    item.foodId = id;
    this.refresh();
  }

  /** Cantidad calculada de un renglón (los renglones del borrador y del cálculo van en el mismo orden). */
  protected amount(mealIndex: number, meal: MealDraft, item: MealItemDraft): ComputedItem | null {
    const found = this.computed()?.meals[mealIndex]?.items[meal.items.indexOf(item)];
    return found && found.foodId === item.foodId && found.portions === item.portions && found.grams ? found : null;
  }

  // ---- Alimentos adicionales ----

  protected addExtra(meal: MealDraft): void {
    if (meal.extras.length >= MAX_EXTRAS) return;
    meal.extras.push({ foodId: null, portions: 1, note: EXTRA_NOTES[0]! });
    this.refresh();
  }

  protected removeExtra(meal: MealDraft, extra: MealExtraDraft): void {
    meal.extras.splice(meal.extras.indexOf(extra), 1);
    this.refresh();
  }

  protected extraAmount(mealIndex: number, extra: MealExtraDraft) {
    return this.computed()?.meals[mealIndex]?.extras.find((item) => item.foodId === extra.foodId && item.portions === extra.portions) ?? null;
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
