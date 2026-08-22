"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Cloud,
  CloudOff,
  Info,
  Loader2,
  Minus,
  Plus,
  Timer,
  Trophy,
} from "lucide-react";
import {
  finishWorkoutAction,
  saveSetLogsAction,
  startWorkoutAction,
  trimSetLogsAction,
  type SetEntry,
} from "@/lib/actions/logs";
import { MOODS, SECTIONS, type SectionKey } from "@/lib/constants";
import { CategoryBadge } from "@/components/ui";
import { RestTimer } from "./rest-timer";
import { cn, formatDistance, formatDuration, formatWeight } from "@/lib/utils";

/* ------------------------------- Types ----------------------------------- */

export type SetState = {
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  timeSec: number | null;
  distanceM: number | null;
  rpe: number | null;
  done: boolean;
};

export type PlayerItemData = {
  id: string;
  exerciseId: string;
  name: string;
  category: string;
  description: string | null;
  cues: string | null;
  tracking: string;
  section: string;
  sets: number;
  targetReps: string | null;
  targetWeight: number | null;
  targetTimeSec: number | null;
  targetDistanceM: number | null;
  restSec: number | null;
  note: string | null;
  supersetGroup: string | null;
  initialLogs: SetState[];
  last: {
    lastDate: string | null;
    lastWeight: number | null;
    lastReps: number | null;
    bestWeight: number | null;
    bestReps: number | null;
    bestTimeSec: number | null;
    bestDistanceM: number | null;
  } | null;
};

export type PlayerWorkout = {
  id: string;
  title: string;
  focus: string | null;
  coachNote: string | null;
  scheduledFor: string | null;
  status: string;
  startedAt: string | null;
};

/* --------------------------- Champs de saisie ----------------------------- */

function parseTime(input: string): number | null {
  const raw = input.trim();
  if (!raw) return null;
  if (raw.includes(":")) {
    const [m, s] = raw.split(":");
    const minutes = Number(m) || 0;
    const seconds = Number(s) || 0;
    return minutes * 60 + seconds;
  }
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : null;
}

function displayTime(value: number | null): string {
  if (value === null) return "";
  const m = Math.floor(value / 60);
  const s = value % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : String(s);
}

/** 12.5 -> "12,5" : c'est ce qu'on tape sur un clavier français. */
function displayNumber(value: number | null): string {
  return value === null ? "" : String(value).replace(".", ",");
}

function Stepper({
  value,
  onChange,
  step,
  placeholder,
  mode = "number",
  disabled,
  ariaLabel,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  step: number;
  placeholder: string;
  mode?: "number" | "time";
  disabled?: boolean;
  ariaLabel: string;
}) {
  const [text, setText] = useState(() => (mode === "time" ? displayTime(value) : displayNumber(value)));

  useEffect(() => {
    setText(mode === "time" ? displayTime(value) : displayNumber(value));
  }, [value, mode]);

  const commit = (raw: string) => {
    if (mode === "time") return onChange(parseTime(raw));
    const cleaned = raw.replace(",", ".").trim();
    if (!cleaned) return onChange(null);
    const n = Number(cleaned);
    onChange(Number.isFinite(n) ? n : null);
  };

  const bump = (delta: number) => {
    const base = value ?? 0;
    const next = Math.max(0, Math.round((base + delta) * 100) / 100);
    onChange(next === 0 && delta < 0 ? null : next);
  };

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => bump(-step)}
        className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface-3 text-muted transition active:scale-90 disabled:opacity-40"
        aria-label={`Diminuer : ${ariaLabel}`}
      >
        <Minus className="size-3.5" />
      </button>

      <input
        type="text"
        aria-label={ariaLabel}
        inputMode={mode === "time" ? "text" : "decimal"}
        disabled={disabled}
        value={String(text)}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="min-w-0 flex-1 rounded-lg border border-line bg-ink-2 px-1 py-1.5 text-center text-[15px] font-bold tabular-nums outline-none transition placeholder:font-medium placeholder:text-faint/60 focus:border-brand/70 focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => bump(step)}
        className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface-3 text-muted transition active:scale-90 disabled:opacity-40"
        aria-label={`Augmenter : ${ariaLabel}`}
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

/* ------------------------------- Player ---------------------------------- */

export function WorkoutPlayer({
  workout,
  items,
  readOnly = false,
}: {
  workout: PlayerWorkout;
  items: PlayerItemData[];
  readOnly?: boolean;
}) {
  const [state, setState] = useState<Record<string, SetState[]>>(() => {
    const initial: Record<string, SetState[]> = {};
    for (const item of items) {
      const count = Math.max(item.sets, item.initialLogs.length || 0);
      initial[item.id] = Array.from({ length: count }, (_, i) => {
        const existing = item.initialLogs.find((l) => l.setNumber === i + 1);
        return (
          existing ?? {
            setNumber: i + 1,
            reps: null,
            weightKg: null,
            timeSec: null,
            distanceM: null,
            rpe: null,
            done: false,
          }
        );
      });
    }
    return initial;
  });

  const [expanded, setExpanded] = useState<string | null>(null);
  const [rest, setRest] = useState<{ seconds: number; label: string; key: number } | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showFinish, setShowFinish] = useState(false);
  const [celebration, setCelebration] = useState<null | {
    sets: number;
    volume: number;
    minutes: number;
  }>(null);

  const startRef = useRef<number>(
    workout.startedAt ? new Date(workout.startedAt).getTime() : Date.now(),
  );
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (readOnly || workout.status === "done") return;
    void startWorkoutAction(workout.id);
  }, [readOnly, workout.id, workout.status]);

  /* ------------------------ Sauvegarde automatique ----------------------- */

  const stateRef = useRef(state);
  stateRef.current = state;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    const entries: SetEntry[] = [];
    for (const item of items) {
      for (const s of stateRef.current[item.id] ?? []) {
        const touched =
          s.done ||
          s.reps !== null ||
          s.weightKg !== null ||
          s.timeSec !== null ||
          s.distanceM !== null;
        if (!touched) continue;
        entries.push({
          workoutItemId: item.id,
          exerciseId: item.exerciseId,
          setNumber: s.setNumber,
          reps: s.reps,
          weightKg: s.weightKg,
          timeSec: s.timeSec,
          distanceM: s.distanceM,
          rpe: s.rpe,
          done: s.done,
        });
      }
    }
    if (entries.length === 0) return;
    setSaving("saving");
    try {
      const res = await saveSetLogsAction(workout.id, entries);
      setSaving(res.ok ? "saved" : "error");
    } catch {
      setSaving("error");
    }
  }, [items, workout.id]);

  const scheduleSave = useCallback(() => {
    if (readOnly) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void flush(), 900);
  }, [flush, readOnly]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [flush]);

  /* ------------------------------ Mutations ------------------------------ */

  const patchSet = (itemId: string, setNumber: number, patch: Partial<SetState>) => {
    setState((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] ?? []).map((s) =>
        s.setNumber === setNumber ? { ...s, ...patch } : s,
      ),
    }));
    scheduleSave();
  };

  const toggleDone = (item: PlayerItemData, setNumber: number) => {
    const current = state[item.id]?.find((s) => s.setNumber === setNumber);
    if (!current) return;
    const nextDone = !current.done;

    const patch: Partial<SetState> = { done: nextDone };
    if (nextDone) {
      // Pré-remplissage intelligent : objectif du coach, sinon dernière perf connue.
      if (current.reps === null && needsReps(item.tracking)) {
        patch.reps = parseTargetReps(item.targetReps) ?? item.last?.lastReps ?? null;
      }
      if (current.weightKg === null && needsWeight(item.tracking)) {
        patch.weightKg = item.targetWeight ?? item.last?.lastWeight ?? null;
      }
      if (current.timeSec === null && needsTime(item.tracking)) {
        patch.timeSec = item.targetTimeSec ?? null;
      }
      if (current.distanceM === null && needsDistance(item.tracking)) {
        patch.distanceM = item.targetDistanceM ?? null;
      }
    }

    patchSet(item.id, setNumber, patch);

    if (nextDone) {
      navigator.vibrate?.(18);
      const remaining = (state[item.id] ?? []).filter((s) => !s.done && s.setNumber !== setNumber);
      if (item.restSec && item.restSec > 0 && remaining.length > 0) {
        setRest({ seconds: item.restSec, label: item.name, key: Date.now() });
      }
    }
  };

  const addSet = (itemId: string) => {
    setState((prev) => {
      const list = prev[itemId] ?? [];
      return {
        ...prev,
        [itemId]: [
          ...list,
          {
            setNumber: list.length + 1,
            reps: null,
            weightKg: null,
            timeSec: null,
            distanceM: null,
            rpe: null,
            done: false,
          },
        ],
      };
    });
  };

  const removeSet = (itemId: string) => {
    const list = state[itemId] ?? [];
    if (list.length <= 1) return;
    const nextLength = list.length - 1;
    setState((prev) => ({ ...prev, [itemId]: (prev[itemId] ?? []).slice(0, nextLength) }));
    void trimSetLogsAction(itemId, nextLength);
  };

  /* -------------------------------- Calculs ------------------------------ */

  const totals = useMemo(() => {
    let total = 0;
    let done = 0;
    let volume = 0;
    for (const item of items) {
      for (const s of state[item.id] ?? []) {
        total++;
        if (s.done) {
          done++;
          if (s.reps && s.weightKg) volume += s.reps * s.weightKg;
        }
      }
    }
    return { total, done, volume };
  }, [items, state]);

  const grouped = useMemo(() => {
    const map = new Map<string, PlayerItemData[]>();
    for (const item of items) {
      const list = map.get(item.section) ?? [];
      list.push(item);
      map.set(item.section, list);
    }
    return [...map.entries()].sort(
      (a, b) => sectionOrder(a[0]) - sectionOrder(b[0]),
    );
  }, [items]);

  const finish = async (rating: number | null, note: string) => {
    await flush();
    const minutes = Math.max(1, Math.round(elapsed / 60));
    await finishWorkoutAction(workout.id, { rating, note, durationMinutes: minutes });
    setShowFinish(false);
    setCelebration({ sets: totals.done, volume: Math.round(totals.volume), minutes });
    navigator.vibrate?.([40, 60, 40, 60, 120]);
  };

  if (celebration) {
    return <Celebration {...celebration} title={workout.title} />;
  }

  const isDone = workout.status === "done";

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-48">
      {/* En-tête */}
      <header className="sticky top-0 z-30 -mx-4 mb-4 border-b border-line/50 bg-ink/80 px-4 pb-3 pt-[max(0.8rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link
            href={isDone ? "/app/historique" : "/app"}
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-muted"
            aria-label="Retour"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[17px] font-extrabold leading-tight">{workout.title}</h1>
            <p className="flex items-center gap-2 text-[11px] text-faint">
              <span className="tabular-nums">
                {totals.done}/{totals.total} séries
              </span>
              {!readOnly && !isDone ? (
                <>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Timer className="size-3" />
                    {formatDuration(elapsed)}
                  </span>
                </>
              ) : null}
              {saving !== "idle" && !readOnly ? (
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden>·</span>
                  {saving === "saving" ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : saving === "error" ? (
                    <CloudOff className="size-3 text-danger" />
                  ) : (
                    <Cloud className="size-3 text-energy" />
                  )}
                </span>
              ) : null}
            </p>
          </div>
        </div>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2 transition-[width] duration-500"
            style={{ width: `${totals.total ? (totals.done / totals.total) * 100 : 0}%` }}
          />
        </div>
      </header>

      {workout.coachNote ? (
        <div className="card mb-4 border-brand/25 bg-brand/8 p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand">
            Mot du coach
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-fg/90">{workout.coachNote}</p>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">
          Cette séance ne contient pas encore d'exercice.
        </div>
      ) : null}

      {grouped.map(([section, sectionItems]) => {
        const meta = SECTIONS[section as SectionKey] ?? SECTIONS.principal;
        return (
          <section key={section} className="mb-6">
            <h2 className="section-title mb-2.5 flex items-center gap-1.5">
              <span aria-hidden>{meta.emoji}</span>
              {meta.label}
            </h2>
            <div className="space-y-3">
              {sectionItems.map((item) => (
                <ExerciseCard
                  key={item.id}
                  item={item}
                  sets={state[item.id] ?? []}
                  expanded={expanded === item.id}
                  onToggleExpand={() =>
                    setExpanded((cur) => (cur === item.id ? null : item.id))
                  }
                  onPatch={(setNumber, patch) => patchSet(item.id, setNumber, patch)}
                  onToggleDone={(setNumber) => toggleDone(item, setNumber)}
                  onAddSet={() => addSet(item.id)}
                  onRemoveSet={() => removeSet(item.id)}
                  onStartRest={() =>
                    item.restSec
                      ? setRest({ seconds: item.restSec, label: item.name, key: Date.now() })
                      : undefined
                  }
                  readOnly={readOnly}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* Barre du bas : repos + action principale */}
      <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-md flex-col gap-2 px-4 pt-2">
        {rest ? (
          <RestTimer
            key={rest.key}
            seconds={rest.seconds}
            label={rest.label}
            onClose={() => setRest(null)}
          />
        ) : null}

        {!readOnly && !isDone ? (
          <button
            type="button"
            onClick={() => setShowFinish(true)}
            className={cn(
              "pointer-events-auto w-full",
              totals.done > 0 ? "btn-energy" : "btn-ghost",
            )}
          >
            <Check className="size-4" />
            {totals.done === totals.total && totals.total > 0
              ? "Séance complète — valider 🎉"
              : "Terminer la séance"}
          </button>
        ) : (
          <Link href="/app/historique" className="btn-ghost pointer-events-auto w-full">
            Retour à l'historique
          </Link>
        )}
      </div>

      {showFinish ? (
        <FinishSheet
          done={totals.done}
          total={totals.total}
          volume={Math.round(totals.volume)}
          minutes={Math.max(1, Math.round(elapsed / 60))}
          onCancel={() => setShowFinish(false)}
          onConfirm={finish}
        />
      ) : null}
    </div>
  );
}

/* --------------------------- Carte d'exercice ----------------------------- */

function ExerciseCard({
  item,
  sets,
  expanded,
  onToggleExpand,
  onPatch,
  onToggleDone,
  onAddSet,
  onRemoveSet,
  onStartRest,
  readOnly,
}: {
  item: PlayerItemData;
  sets: SetState[];
  expanded: boolean;
  onToggleExpand: () => void;
  onPatch: (setNumber: number, patch: Partial<SetState>) => void;
  onToggleDone: (setNumber: number) => void;
  onAddSet: () => void;
  onRemoveSet: () => void;
  onStartRest: () => void;
  readOnly: boolean;
}) {
  const doneCount = sets.filter((s) => s.done).length;
  const complete = doneCount === sets.length && sets.length > 0;

  return (
    <article
      className={cn(
        "card overflow-hidden transition-colors duration-300",
        complete && "border-energy/35 bg-energy/[0.05]",
      )}
    >
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <CategoryBadge category={item.category} />
              {item.supersetGroup ? (
                <span className="chip border-brand-3/40 text-brand-3">
                  Superset {item.supersetGroup}
                </span>
              ) : null}
            </div>
            <h3 className="text-[16px] font-bold leading-snug">{item.name}</h3>
            <p className="mt-0.5 text-[13px] text-muted">{targetLabel(item)}</p>
          </div>
          <div
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-xl text-xs font-bold tabular-nums transition-colors",
              complete ? "bg-energy/20 text-energy" : "bg-surface-3 text-muted",
            )}
          >
            {complete ? <Check className="size-4" /> : `${doneCount}/${sets.length}`}
          </div>
        </div>

        {item.note ? (
          <p className="mt-2.5 rounded-lg border-l-2 border-brand/60 bg-surface-2/60 py-1.5 pl-2.5 pr-2 text-[12.5px] leading-relaxed text-fg/80">
            {item.note}
          </p>
        ) : null}

        {item.last?.lastDate ? (
          <p className="mt-2 text-[12px] text-faint">
            Dernière fois :{" "}
            <span className="font-semibold text-muted">{lastPerfLabel(item)}</span>
          </p>
        ) : null}
      </div>

      {/* Séries */}
      <div className="space-y-1.5 px-3 pb-3">
        <SetHeader tracking={item.tracking} />
        {sets.map((s) => (
          <SetRow
            key={s.setNumber}
            set={s}
            exerciseName={item.name}
            targets={item}
            tracking={item.tracking}
            readOnly={readOnly}
            onPatch={(patch) => onPatch(s.setNumber, patch)}
            onToggle={() => onToggleDone(s.setNumber)}
          />
        ))}

        {!readOnly ? (
          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={onAddSet}
              className="flex-1 rounded-lg border border-dashed border-line py-1.5 text-[12px] font-semibold text-faint transition hover:text-muted active:scale-[0.98]"
            >
              + Ajouter une série
            </button>
            {sets.length > 1 ? (
              <button
                type="button"
                onClick={onRemoveSet}
                aria-label="Retirer la dernière série"
                className="rounded-lg border border-dashed border-line px-3 py-1.5 text-[12px] font-semibold text-faint transition hover:text-muted active:scale-[0.98]"
              >
                −
              </button>
            ) : null}
            {item.restSec ? (
              <button
                type="button"
                onClick={onStartRest}
                className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-faint transition hover:text-muted active:scale-[0.98]"
                aria-label="Lancer le chrono de repos"
              >
                <Timer className="size-3.5" />
                {item.restSec}s
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Détails techniques */}
      {item.description || item.cues ? (
        <div className="border-t border-line/60">
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex w-full items-center justify-between px-4 py-2.5 text-[12px] font-semibold text-faint transition hover:text-muted"
          >
            <span className="inline-flex items-center gap-1.5">
              <Info className="size-3.5" />
              Comment faire
            </span>
            <ChevronDown
              className={cn("size-4 transition-transform", expanded && "rotate-180")}
            />
          </button>
          {expanded ? (
            <div className="animate-[var(--animate-rise)] space-y-2 px-4 pb-4 text-[13px] leading-relaxed">
              {item.description ? <p className="text-muted">{item.description}</p> : null}
              {item.cues ? (
                <p className="rounded-lg bg-surface-2/70 p-2.5 text-fg/80">
                  <span className="font-semibold text-brand">Points clés — </span>
                  {item.cues}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

/** Unités affichées une seule fois, en tête de colonnes : les champs restent larges. */
function SetHeader({ tracking }: { tracking: string }) {
  const units: string[] = [];
  if (needsReps(tracking)) units.push("reps");
  if (needsWeight(tracking)) units.push("kg");
  if (needsTime(tracking)) units.push("min:s");
  if (needsDistance(tracking)) units.push("mètres");

  return (
    <div className="flex items-center gap-2 px-2 pb-0.5" aria-hidden>
      <span className="size-6 shrink-0" />
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {units.map((unit) => (
          <span
            key={unit}
            className="min-w-0 flex-1 text-center text-[9px] font-bold uppercase tracking-[0.1em] text-faint"
          >
            {unit}
          </span>
        ))}
      </div>
      <span className="size-9 shrink-0" />
    </div>
  );
}

function SetRow({
  set,
  tracking,
  readOnly,
  exerciseName,
  targets,
  onPatch,
  onToggle,
}: {
  set: SetState;
  tracking: string;
  readOnly: boolean;
  exerciseName: string;
  targets: PlayerItemData;
  onPatch: (patch: Partial<SetState>) => void;
  onToggle: () => void;
}) {
  const context = `${exerciseName}, série ${set.setNumber}`;
  // L'objectif du coach sert de valeur suggérée dans le champ vide.
  const hint = {
    reps: targets.targetReps ?? "—",
    weight: targets.targetWeight !== null ? displayNumber(targets.targetWeight) : "—",
    time: targets.targetTimeSec !== null ? displayTime(targets.targetTimeSec) : "—",
    distance: targets.targetDistanceM !== null ? String(targets.targetDistanceM) : "—",
  };
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border px-2 py-1.5 transition-colors duration-200",
        set.done ? "border-energy/30 bg-energy/[0.07]" : "border-transparent bg-surface-2/50",
      )}
    >
      <span
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-md text-[11px] font-bold tabular-nums",
          set.done ? "bg-energy/20 text-energy" : "bg-surface-3 text-faint",
        )}
      >
        {set.setNumber}
      </span>

      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {needsReps(tracking) ? (
          <Stepper
            value={set.reps}
            onChange={(v) => onPatch({ reps: v })}
            step={1}
            placeholder={hint.reps}
            disabled={readOnly}
            ariaLabel={`Répétitions — ${context}`}
          />
        ) : null}
        {needsWeight(tracking) ? (
          <Stepper
            value={set.weightKg}
            onChange={(v) => onPatch({ weightKg: v })}
            step={1}
            placeholder={hint.weight}
            disabled={readOnly}
            ariaLabel={`Poids en kg — ${context}`}
          />
        ) : null}
        {needsTime(tracking) ? (
          <Stepper
            value={set.timeSec}
            onChange={(v) => onPatch({ timeSec: v })}
            step={10}
            placeholder={hint.time}
            mode="time"
            disabled={readOnly}
            ariaLabel={`Durée — ${context}`}
          />
        ) : null}
        {needsDistance(tracking) ? (
          <Stepper
            value={set.distanceM}
            onChange={(v) => onPatch({ distanceM: v })}
            step={50}
            placeholder={hint.distance}
            disabled={readOnly}
            ariaLabel={`Distance en mètres — ${context}`}
          />
        ) : null}
      </div>

      <button
        type="button"
        onClick={onToggle}
        disabled={readOnly}
        aria-label={`${set.done ? "Annuler" : "Valider"} — ${context}`}
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-xl border transition-all active:scale-90",
          set.done
            ? "border-energy/50 bg-energy text-ink"
            : "border-line bg-surface-3 text-faint hover:text-muted",
          readOnly && "opacity-60",
        )}
      >
        <Check className="size-4" strokeWidth={3} />
      </button>
    </div>
  );
}

/* ------------------------- Fin de séance & fête --------------------------- */

function FinishSheet({
  done,
  total,
  volume,
  minutes,
  onCancel,
  onConfirm,
}: {
  done: number;
  total: number;
  volume: number;
  minutes: number;
  onCancel: () => void;
  onConfirm: (rating: number | null, note: string) => Promise<void>;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div className="animate-[var(--animate-rise)] w-full max-w-md rounded-t-[1.6rem] border-t border-line bg-ink-2 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-surface-3" />
        <h2 className="text-xl font-extrabold">Séance terminée ?</h2>
        <p className="mt-1 text-sm text-muted">
          {done}/{total} séries · {formatDuration(minutes * 60)}
          {volume > 0 ? ` · ${volume.toLocaleString("fr-FR")} kg soulevés` : ""}
        </p>

        <p className="label mt-5">Comment tu te sens ?</p>
        <div className="flex gap-1.5">
          {MOODS.map((mood) => (
            <button
              key={mood.value}
              type="button"
              onClick={() => setRating(mood.value)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl border py-2.5 transition-all active:scale-95",
                rating === mood.value
                  ? "border-brand/60 bg-brand/15"
                  : "border-line bg-surface-2/60",
              )}
            >
              <span className="text-xl">{mood.emoji}</span>
              <span className="text-[10px] font-semibold text-faint">{mood.label}</span>
            </button>
          ))}
        </div>

        <label className="label mt-4" htmlFor="finish-note">
          Un mot pour le coach (optionnel)
        </label>
        <textarea
          id="finish-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Genou un peu sensible, les swings sont passés tout seuls…"
          className="field resize-none"
        />

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onCancel} className="btn-ghost flex-1">
            Pas encore
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await onConfirm(rating, note);
              } finally {
                setPending(false);
              }
            }}
            className="btn-energy flex-[1.4]"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}

function Celebration({
  sets,
  volume,
  minutes,
  title,
}: {
  sets: number;
  volume: number;
  minutes: number;
  title: string;
}) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        duration: 2.2 + Math.random() * 1.6,
        size: 5 + Math.random() * 7,
        color: ["#FF4D8D", "#A855F7", "#22D3EE", "#C6F84E", "#FBBF24"][i % 5],
        rotate: Math.random() * 360,
      })),
    [],
  );

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {pieces.map((p) => (
          <span
            key={p.id}
            className="absolute top-[-12%] block rounded-[2px]"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 1.7,
              background: p.color,
              transform: `rotate(${p.rotate}deg)`,
              animation: `fall ${p.duration}s linear ${p.delay}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`@keyframes fall {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(118vh) rotate(560deg); opacity: 0.15; }
      }`}</style>

      <div className="relative animate-[var(--animate-pop)]">
        <div className="mx-auto mb-6 grid size-20 place-items-center rounded-[1.6rem] bg-gradient-to-br from-energy to-[#8fe63a] text-4xl shadow-[0_18px_60px_-20px_var(--color-energy)]">
          <Trophy className="size-9 text-ink" />
        </div>
        <h1 className="text-3xl font-extrabold leading-tight">Séance validée !</h1>
        <p className="mt-2 text-sm text-muted">{title}</p>

        <div className="mt-7 grid grid-cols-3 gap-2.5">
          <div className="card p-3">
            <p className="text-2xl font-extrabold text-brand tabular-nums">{sets}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">séries</p>
          </div>
          <div className="card p-3">
            <p className="text-2xl font-extrabold text-brand-2 tabular-nums">{minutes}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">minutes</p>
          </div>
          <div className="card p-3">
            <p className="text-2xl font-extrabold text-brand-3 tabular-nums">
              {volume > 999 ? `${(volume / 1000).toFixed(1)}t` : volume}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">
              {volume > 999 ? "soulevés" : "kg soulevés"}
            </p>
          </div>
        </div>

        <Link href="/app" className="btn-primary mt-8 w-full">
          Retour à l'accueil
        </Link>
        <Link href="/app/progression" className="btn-quiet mt-1 w-full">
          Voir ma progression
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------- Helpers --------------------------------- */

function sectionOrder(section: string): number {
  const order = ["echauffement", "principal", "finisher", "retour_au_calme"];
  const index = order.indexOf(section);
  return index === -1 ? 99 : index;
}

export function needsReps(tracking: string) {
  return tracking === "reps_weight" || tracking === "reps";
}
export function needsWeight(tracking: string) {
  return tracking === "reps_weight";
}
export function needsTime(tracking: string) {
  return tracking === "time" || tracking === "time_distance";
}
export function needsDistance(tracking: string) {
  return tracking === "distance" || tracking === "time_distance";
}

function parseTargetReps(target: string | null): number | null {
  if (!target) return null;
  const match = target.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function targetLabel(item: PlayerItemData): string {
  const parts: string[] = [`${item.sets} série${item.sets > 1 ? "s" : ""}`];
  if (item.targetReps) parts.push(`${item.targetReps} reps`);
  if (item.targetTimeSec) parts.push(formatDuration(item.targetTimeSec));
  if (item.targetDistanceM) parts.push(formatDistance(item.targetDistanceM));
  if (item.targetWeight) parts.push(formatWeight(item.targetWeight));
  if (item.restSec) parts.push(`repos ${item.restSec}s`);
  return parts.join(" · ");
}

function lastPerfLabel(item: PlayerItemData): string {
  const last = item.last;
  if (!last) return "—";
  const bits: string[] = [];
  if (last.lastReps) bits.push(`${last.lastReps} reps`);
  if (last.lastWeight) bits.push(formatWeight(last.lastWeight));
  if (bits.length === 0 && last.bestTimeSec) bits.push(formatDuration(last.bestTimeSec));
  if (bits.length === 0 && last.bestDistanceM) bits.push(formatDistance(last.bestDistanceM));
  const perf = bits.join(" × ") || "réalisé";
  return last.lastDate ? `${perf} (${formatFrShort(last.lastDate)})` : perf;
}

function formatFrShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
