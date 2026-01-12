import { useCallback, useEffect, useMemo, useState } from "react";
import type { Recipe } from "../lib/types";
import { formatAmount, formatTime } from "../lib/types";
import {
  ArrowLeft,
  ChefHat,
  Check,
  ChevronRight,
  Clock,
  Flame,
  Heart,
  Link2,
  Link2Off,
  Pause,
  Play,
  RotateCcw,
  Users,
  X,
} from "lucide-react";

interface RecipeDetailProps {
  recipe: Recipe;
  onBack: () => void;
}

type ScaledIngredient = {
  key: string;
  name: string;
  unit: string;
  prep?: string;
  amount: number;
  baseAmount: number;
  scaledAmount: number;
};

type IngredientGroup = {
  name: string;
  scale: number;
  ingredients: ScaledIngredient[];
};

type CookStep = {
  key: string;
  title: string;
  contentHtml: string;
  previewText: string;
  durationSeconds: number;
};

type TimerProps = {
  duration: number;
  isRunning: boolean;
  onToggle: (nextState: boolean) => void;
  onReset: () => void;
};

type IngredientRowProps = {
  ingredient: ScaledIngredient;
  isChecked: boolean;
  onToggle: () => void;
  onAmountChange: (value: string) => void;
};

const stripHtml = (value: string): string => {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
};

const removeLeadingTitle = (value: string): string => {
  return value.replace(/^\s*<strong>.*?<\/strong>\s*[-–—:]?\s*/i, "");
};

const extractStepTitle = (value: string, fallback: string): string => {
  const match = value.match(/<strong>(.*?)<\/strong>/i);
  if (match?.[1]) {
    const cleaned = stripHtml(match[1]);
    if (cleaned) return cleaned;
  }
  const text = stripHtml(value);
  if (text) {
    const sentence = text.split(/[.!?]/)[0]?.trim();
    if (sentence) return sentence;
  }
  return fallback;
};

const formatScaledAmount = (amount: number): string => {
  const formatted = formatAmount(amount);
  const parsed = Number.parseFloat(formatted);
  return Number.isNaN(parsed) ? formatted : parsed.toString();
};

const Timer = ({ duration, isRunning, onToggle, onReset }: TimerProps) => {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    let interval: number | undefined;
    if (isRunning && timeLeft > 0) {
      interval = window.setInterval(() => setTimeLeft((current) => current - 1), 1000);
    } else if (timeLeft === 0 && isRunning) {
      onToggle(false);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isRunning, timeLeft, onToggle]);

  useEffect(() => {
    setTimeLeft(duration);
    onToggle(false);
  }, [duration, onToggle]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="flex items-center gap-4 bg-stone-100 rounded-full px-4 py-2 self-start">
      <span className="font-mono font-medium text-stone-700 w-12 text-center">
        {formatTime(timeLeft)}
      </span>
      <div className="w-px h-4 bg-stone-300" />
      <button type="button" onClick={() => onToggle(!isRunning)} className="text-stone-900">
        {isRunning ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
      </button>
      <button
        type="button"
        onClick={() => {
          setTimeLeft(duration);
          onReset();
        }}
        className="text-stone-400 hover:text-stone-600 transition"
      >
        <RotateCcw size={16} />
      </button>
    </div>
  );
};

const IngredientRow = ({ ingredient, isChecked, onToggle, onAmountChange }: IngredientRowProps) => {
  const safeAmount = Number.isFinite(ingredient.scaledAmount) ? ingredient.scaledAmount : ingredient.baseAmount;
  const displayAmount = formatScaledAmount(safeAmount);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
      className={
        "group flex items-center justify-between gap-4 p-4 rounded-xl cursor-pointer border transition-all duration-300 " +
        (isChecked
          ? "bg-stone-50 border-transparent"
          : "bg-white border-stone-100 shadow-sm hover:shadow-md hover:border-stone-200")
      }
    >
      <div className="flex items-center gap-4">
        <div
          className={
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 " +
            (isChecked
              ? "border-green-600 bg-green-600 scale-90"
              : "border-stone-200 group-hover:border-green-500")
          }
        >
          {isChecked && <Check size={14} className="text-white" />}
        </div>
        <div className="flex flex-col text-left">
          <span
            className={
              "text-base transition-all duration-300 " +
              (isChecked ? "text-stone-400 line-through decoration-stone-300" : "text-stone-900 font-medium")
            }
          >
            {ingredient.name}
          </span>
          {ingredient.prep && (
            <span className={isChecked ? "text-stone-300 text-xs" : "text-stone-400 text-xs"}>
              {ingredient.prep}
            </span>
          )}
        </div>
      </div>

      <div
        className="flex items-center gap-2"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <input
          type="number"
          inputMode="decimal"
          step="any"
          value={displayAmount}
          onChange={(event) => onAmountChange(event.target.value)}
          className="ingredient-input"
        />
        <span className="text-xs font-sans font-normal text-stone-400">{ingredient.unit}</span>
      </div>
    </div>
  );
};

type CookModeProps = {
  steps: CookStep[];
  onClose: () => void;
};

const CookMode = ({ steps, onClose }: CookModeProps) => {
  const [activeStep, setActiveStep] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    setActiveStep(0);
    setIsTimerRunning(false);
  }, [steps]);

  const step = steps[activeStep];
  const isLastStep = activeStep === steps.length - 1;

  if (!step) {
    return (
      <div className="fixed inset-0 bg-stone-50 z-50 flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-stone-200">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Cooking Mode</span>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-300 transition"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-stone-500">No steps yet.</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-stone-50 z-50 flex flex-col">
      <div className="flex justify-between items-center p-6 border-b border-stone-200">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">
            Step {activeStep + 1} of {steps.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-300 transition"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col">
        <h2 className="text-3xl font-serif font-medium text-stone-900 mb-6 mt-4">{step.title}</h2>

        {step.durationSeconds > 0 && (
          <div className="mb-8">
            <Timer
              duration={step.durationSeconds}
              isRunning={isTimerRunning}
              onToggle={setIsTimerRunning}
              onReset={() => setIsTimerRunning(false)}
            />
          </div>
        )}

        <div
          className="text-xl leading-relaxed text-stone-700 font-medium prose prose-stone max-w-none"
          dangerouslySetInnerHTML={{ __html: step.contentHtml }}
        />
      </div>

      <div className="p-6 bg-white border-t border-stone-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="flex gap-4">
          <button
            type="button"
            disabled={activeStep === 0}
            onClick={() => {
              setActiveStep((current) => Math.max(0, current - 1));
              setIsTimerRunning(false);
            }}
            className="flex-1 py-4 rounded-xl font-bold text-stone-500 bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-stone-200 transition"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => {
              if (isLastStep) {
                onClose();
              } else {
                setActiveStep((current) => Math.min(steps.length - 1, current + 1));
                setIsTimerRunning(false);
              }
            }}
            className={
              "flex-[2] py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-[0.98] " +
              (isLastStep ? "bg-green-700 hover:bg-green-800" : "bg-stone-900 hover:bg-stone-800")
            }
          >
            {isLastStep ? "Finish Cooking" : "Next Step"}
            {!isLastStep && <ChevronRight size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export function RecipeDetail({ recipe, onBack }: RecipeDetailProps) {
  const baseServings = Math.max(1, recipe.yield.amount || 1);
  const [servings, setServings] = useState(baseServings);
  const [mode, setMode] = useState<"overview" | "cook">("overview");
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [isLinked, setIsLinked] = useState(true);
  const [linkedScale, setLinkedScale] = useState(1);
  const [componentScale, setComponentScale] = useState<Record<number, number>>({});
  const [lastEditedComponent, setLastEditedComponent] = useState(0);

  useEffect(() => {
    setServings(baseServings);
    setMode("overview");
    setCheckedIngredients(new Set());
    setIsLinked(true);
    setLinkedScale(1);
    setComponentScale({});
    setLastEditedComponent(0);
  }, [recipe.slug, baseServings]);

  const servingsRatio = servings / baseServings;

  const baseAmounts = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    recipe.components.forEach((component, componentIndex) => {
      component.ingredients.forEach((ingredient) => {
        map[`${componentIndex}:${ingredient.id}`] = ingredient.amount * servingsRatio;
      });
    });
    return map;
  }, [recipe.components, servingsRatio]);

  const ingredientGroups = useMemo<IngredientGroup[]>(() => {
    return recipe.components.map((component, componentIndex) => {
      const scale = isLinked ? linkedScale : componentScale[componentIndex] ?? 1;
      return {
        name: component.name,
        scale,
        ingredients: component.ingredients.map((ingredient) => {
          const key = `${componentIndex}:${ingredient.id}`;
          const baseAmount = baseAmounts[key] ?? ingredient.amount * servingsRatio;
          return {
            key,
            name: ingredient.name,
            unit: ingredient.unit,
            prep: ingredient.prep,
            amount: ingredient.amount,
            baseAmount,
            scaledAmount: baseAmount * scale,
          };
        }),
      };
    });
  }, [recipe.components, baseAmounts, servingsRatio, isLinked, linkedScale, componentScale]);

  const scaledIngredients = useMemo(() => ingredientGroups.flatMap((group) => group.ingredients), [
    ingredientGroups,
  ]);

  const handleIngredientChange = useCallback(
    (componentIndex: number, ingredientKey: string, value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        if (isLinked) {
          setLinkedScale(1);
        } else {
          setComponentScale((prev) => ({ ...prev, [componentIndex]: 1 }));
        }
        return;
      }

      const parsed = Number.parseFloat(trimmed);
      if (Number.isNaN(parsed) || parsed <= 0) return;

      const baseAmount = baseAmounts[ingredientKey];
      if (!baseAmount || baseAmount <= 0) return;

      const ratio = parsed / baseAmount;
      if (isLinked) {
        setLinkedScale(ratio);
      } else {
        setComponentScale((prev) => ({ ...prev, [componentIndex]: ratio }));
      }
      setLastEditedComponent(componentIndex);
    },
    [baseAmounts, isLinked]
  );

  const toggleIngredient = useCallback((key: string) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const resetIngredients = useCallback(() => {
    setCheckedIngredients(new Set());
  }, []);

  const toggleLink = useCallback(() => {
    if (isLinked) {
      setIsLinked(false);
      setComponentScale((prev) => {
        const next = { ...prev };
        recipe.components.forEach((_, index) => {
          next[index] = prev[index] ?? linkedScale;
        });
        return next;
      });
    } else {
      setIsLinked(true);
      setLinkedScale(componentScale[lastEditedComponent] ?? linkedScale);
    }
  }, [isLinked, linkedScale, componentScale, lastEditedComponent, recipe.components]);

  const resetScale = useCallback(() => {
    setLinkedScale(1);
    setComponentScale({});
    setLastEditedComponent(0);
  }, []);

  const scaleStepText = useCallback(
    (html: string): string => {
      let result = html;
      scaledIngredients.forEach((ingredient) => {
        const baseAmount = ingredient.amount;
        const scaledAmount = formatScaledAmount(ingredient.scaledAmount);
        const unit = ingredient.unit;
        const name = ingredient.name;
        const patterns = [
          new RegExp(`\\*\\*${baseAmount}${unit}\\s+${name}\\*\\*`, "gi"),
          new RegExp(`\\*\\*${baseAmount}\\s*${unit}\\s+${name}\\*\\*`, "gi"),
          new RegExp(`<strong>${baseAmount}${unit}\\s+${name}</strong>`, "gi"),
          new RegExp(`<strong>${baseAmount}\\s*${unit}\\s+${name}</strong>`, "gi"),
        ];
        patterns.forEach((pattern) => {
          result = result.replace(
            pattern,
            `<strong class="text-green-700 font-semibold">${scaledAmount}${unit} ${name}</strong>`
          );
        });
      });
      return result;
    },
    [scaledIngredients]
  );

  const totalMinutes = useMemo(() => {
    if (recipe.totalTime) return recipe.totalTime;
    return (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);
  }, [recipe.totalTime, recipe.prepTime, recipe.cookTime]);

  const cookSteps = useMemo<CookStep[]>(() => {
    const steps: CookStep[] = [];
    const stepCount = recipe.components.reduce((total, component) => total + (component.steps?.length ?? 0), 0);
    const durationSeconds = stepCount && totalMinutes ? Math.round((totalMinutes * 60) / stepCount) : 0;

    recipe.components.forEach((component, componentIndex) => {
      (component.steps ?? []).forEach((step, stepIndex) => {
        const title = extractStepTitle(step, `${component.name} Step ${stepIndex + 1}`);
        const scaledHtml = scaleStepText(step);
        const contentHtml = removeLeadingTitle(scaledHtml);
        steps.push({
          key: `${componentIndex}:${stepIndex}`,
          title,
          contentHtml,
          previewText: stripHtml(contentHtml),
          durationSeconds,
        });
      });
    });

    return steps;
  }, [recipe.components, scaleStepText, totalMinutes]);

  const difficultyLabel = useMemo(() => {
    if (!totalMinutes) return "Flexible";
    if (totalMinutes <= 30) return "Easy";
    if (totalMinutes <= 60) return "Comfort";
    return "Slow";
  }, [totalMinutes]);

  const totalTimeLabel = totalMinutes ? formatTime(totalMinutes) : "Flexible";
  const cookTimeLabel = recipe.cookTime ? formatTime(recipe.cookTime) : null;
  const hasMultipleComponents = ingredientGroups.length > 1;
  const servingsLabel = formatScaledAmount(servings);
  const hasScaleAdjustments = isLinked
    ? Math.abs(linkedScale - 1) > 0.001
    : Object.values(componentScale).some((scale) => Math.abs(scale - 1) > 0.001);

  return (
    <div className="relative">
      {mode === "overview" && (
        <div className="pb-28">
          <header className="sticky top-0 bg-stone-50/95 backdrop-blur-md z-10 px-6 py-4 flex justify-between items-center border-b border-stone-100/70">
            <button
              type="button"
              onClick={onBack}
              className="p-2 -ml-2 rounded-full hover:bg-stone-100 transition text-stone-600"
            >
              <ArrowLeft size={24} />
            </button>
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-stone-400">Kitchen Log</span>
            <button type="button" className="p-2 -mr-2 rounded-full hover:bg-stone-100 transition text-stone-600">
              <Heart size={22} />
            </button>
          </header>

          <main className="px-6 pt-8">
            {recipe.image && (
              <div className="mb-8 overflow-hidden rounded-3xl border border-stone-100 shadow-sm">
                <img src={recipe.image} alt={recipe.title} className="w-full h-64 object-cover" />
              </div>
            )}

            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-1 bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wide rounded-md">
                  {difficultyLabel}
                </span>
                {cookTimeLabel && (
                  <span className="text-xs text-stone-400 font-medium flex items-center gap-1">
                    <Flame size={12} /> {cookTimeLabel}
                  </span>
                )}
              </div>
              <h1 className="text-4xl font-serif font-medium leading-[1.1] mb-3 text-stone-900 tracking-tight">
                {recipe.title}
              </h1>
              {recipe.description && (
                <p className="text-stone-500 text-lg leading-relaxed font-light">{recipe.description}</p>
              )}
            </div>

            <div className="flex gap-3 mb-10 overflow-x-auto no-scrollbar pb-2">
              <div className="flex-shrink-0 flex items-center gap-3 bg-white px-5 py-3 rounded-full shadow-sm border border-stone-100">
                <Clock size={18} className="text-stone-400" />
                <div className="flex flex-col leading-none">
                  <span className="text-xs text-stone-400 font-bold uppercase tracking-wider">Total</span>
                  <span className="text-sm font-semibold text-stone-700">{totalTimeLabel}</span>
                </div>
              </div>

              <div className="flex-shrink-0 flex items-center gap-4 bg-white px-5 py-3 rounded-full shadow-sm border border-stone-100">
                <Users size={18} className="text-stone-400" />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setServings((current) => Math.max(1, current - 1))}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 active:scale-95 transition"
                  >
                    -
                  </button>
                  <div className="flex flex-col items-center leading-none">
                    <span className="text-base font-bold w-6 text-center text-stone-800">{servingsLabel}</span>
                    <span className="text-[10px] uppercase tracking-wide text-stone-400">
                      {recipe.yield.unit}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setServings((current) => current + 1)}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 active:scale-95 transition"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <section className="mb-12">
              <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
                <h3 className="text-xl font-serif font-medium text-stone-800">Ingredients</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleLink}
                    className={
                      "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-semibold transition " +
                      (isLinked
                        ? "bg-stone-900 text-white"
                        : "bg-white text-stone-500 border border-stone-200 hover:bg-stone-100")
                    }
                  >
                    {isLinked ? <Link2 size={12} /> : <Link2Off size={12} />}
                    {isLinked ? "Linked" : "Isolated"}
                  </button>
                  {hasScaleAdjustments && (
                    <button
                      type="button"
                      onClick={resetScale}
                      className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 hover:text-stone-700"
                    >
                      Reset Scale
                    </button>
                  )}
                  {checkedIngredients.size > 0 && (
                    <button
                      type="button"
                      onClick={resetIngredients}
                      className="text-[10px] font-semibold uppercase tracking-widest text-green-700 hover:opacity-70"
                    >
                      Reset List
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                {ingredientGroups.map((group, groupIndex) => (
                  <div key={group.name} className="space-y-3">
                    {hasMultipleComponents && (
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400 font-semibold">
                          {group.name}
                        </p>
                        {!isLinked && (
                          <span className="text-[10px] uppercase tracking-widest text-stone-400">
                            {group.scale.toFixed(2)}x
                          </span>
                        )}
                      </div>
                    )}
                    {group.ingredients.map((ingredient) => (
                      <IngredientRow
                        key={ingredient.key}
                        ingredient={ingredient}
                        isChecked={checkedIngredients.has(ingredient.key)}
                        onToggle={() => toggleIngredient(ingredient.key)}
                        onAmountChange={(value) => handleIngredientChange(groupIndex, ingredient.key, value)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-xl font-serif font-medium mb-6 text-stone-800">Directions</h3>
              {cookSteps.length > 0 ? (
                <div className="relative pl-8 border-l-2 border-stone-200 space-y-10">
                  {cookSteps.map((step, index) => (
                    <div key={step.key} className="relative group">
                      <span
                        className={
                          "absolute -left-[39px] top-0 flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ring-4 ring-stone-50 " +
                          (index === 0 ? "bg-stone-900 text-white" : "bg-stone-200 text-stone-500")
                        }
                      >
                        {index + 1}
                      </span>
                      <h4 className={"font-bold mb-2 text-lg " + (index === 0 ? "text-stone-900" : "text-stone-400")}>
                        {step.title}
                      </h4>
                      <p
                        className={
                          "leading-relaxed " +
                          (index === 0 ? "text-stone-600" : "text-stone-400 line-clamp-2")
                        }
                      >
                        {step.previewText}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-stone-400">Steps coming soon.</p>
              )}
            </section>

            {recipe.notes && (
              <section className="mt-12">
                <h3 className="text-xl font-serif font-medium mb-4 text-stone-800">Notes</h3>
                <div className="bg-white border border-stone-100 rounded-2xl p-4 text-sm leading-relaxed text-stone-600 whitespace-pre-wrap">
                  {recipe.notes}
                </div>
              </section>
            )}
          </main>

          <div className="fixed bottom-6 left-6 right-6 z-20">
            <button
              type="button"
              onClick={() => setMode("cook")}
              disabled={cookSteps.length === 0}
              className={
                "w-full py-4 rounded-2xl font-bold shadow-2xl shadow-stone-900/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all " +
                (cookSteps.length === 0
                  ? "bg-stone-300 text-stone-500 cursor-not-allowed"
                  : "bg-stone-900 text-white hover:bg-stone-800")
              }
            >
              <ChefHat size={20} />
              Start Cooking Mode
            </button>
          </div>
        </div>
      )}

      {mode === "cook" && <CookMode steps={cookSteps} onClose={() => setMode("overview")} />}
    </div>
  );
}
