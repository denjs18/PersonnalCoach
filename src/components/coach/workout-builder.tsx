"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpDown,
  Check,
  ChevronDown,
  Cloud,
  CloudOff,
  Copy,
  Eye,
  FileStack,
  Info,
  Loader2,
  MoreHorizontal,
  Plus,
  Send,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  deleteWorkoutAction,
  duplicateWorkoutAction,
  reopenWorkoutAction,
  saveAsTemplateAction,
  saveWorkoutPlanAction,
  setWorkoutStatusAction,
  type PlanItem,
} from "@/lib/actions/workouts";
import {
  INTENSITY,
  SECTIONS,
  SECTION_KEYS,
  TRACKING,
  TRACKING_KEYS,
  type SectionKey,
} from "@/lib/constants";
import type { Exercise } from "@/lib/db";
import { CategoryBadge, StatusBadge } from "@/components/ui";
import { ExerciseHowTo } from "@/components/exercise-how-to";
import { ExercisePicker } from "./exercise-picker";
import { SessionResult } from "./session-result";
import type { AthleteProfile, EffortEntry } from "@/lib/effort";
import { addDaysISO, cn, formatDuration } from "@/lib/utils";

/* -------------------------------- Types ---------------------------------- */

export type BuilderItem = PlanItem & {
  key: string;
  exerciseName: string;
  exerciseCategory: string;
  exerciseTracking: string;
  exerciseDescription: string | null;
  exerciseSteps: string[];
  exerciseCues: string | null;
};

export type BuilderWorkout = {
  id: string;
  title: string;
  durationMinutes: number | null;
  athleteRating: number | null;
  athleteNote: string | null;
  scheduledFor: string | null;
  status: string;
  isTemplate: boolean;
  focus: string | null;
  coachNote: string | null;
  estimatedMinutes: number | null;
  intensity: number | null;
  loggedSets: number;
};

const newKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `k${Math.random().toString(36).slice(2)}`;

/* ------------------------------- Builder --------------------------------- */

export function WorkoutBuilder({
  workout,
  initialItems,
  exercises: initialExercises,
  effortEntries,
  profile,
}: {
  workout: BuilderWorkout;
  initialItems: BuilderItem[];
  exercises: Exercise[];
  effortEntries: EffortEntry[];
  profile: AthleteProfile;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(workout.title);
  const [scheduledFor, setScheduledFor] = useState(workout.scheduledFor ?? "");
  const [focus, setFocus] = useState(workout.focus ?? "");
  const [coachNote, setCoachNote] = useState(workout.coachNote ?? "");
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(
    workout.estimatedMinutes,
  );
  const [intensity, setIntensity] = useState<number | null>(workout.intensity);

  const [items, setItems] = useState<BuilderItem[]>(initialItems);
  const [exercises, setExercises] = useState(initialExercises);

  const [pickerSection, setPickerSection] = useState<SectionKey | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [status, setStatus] = useState(workout.status);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  /* --------------------------- Sauvegarde auto --------------------------- */

  const stateRef = useRef({ title, scheduledFor, focus, coachNote, estimatedMinutes, intensity, items });
  stateRef.current = { title, scheduledFor, focus, coachNote, estimatedMinutes, intensity, items };

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  const save = useCallback(async () => {
    const snapshot = stateRef.current;
    if (!snapshot.title.trim()) {
      setSaveState("error");
      return { ok: false as const };
    }
    setSaveState("saving");
    const keys = snapshot.items.map((i) => i.key);

    try {
      const res = await saveWorkoutPlanAction(
        workout.id,
        {
          title: snapshot.title,
          scheduledFor: workout.isTemplate ? null : snapshot.scheduledFor || null,
          focus: snapshot.focus,
          coachNote: snapshot.coachNote,
          // Champ laissé vide : on enregistre l'estimation calculée pour qu'elle
          // s'affiche quand même sur la carte de séance.
          estimatedMinutes: snapshot.estimatedMinutes ?? estimateMinutes(snapshot.items),
          intensity: snapshot.intensity,
        },
        snapshot.items.map(toPlanItem),
      );

      if (!res.ok) {
        setSaveState("error");
        return { ok: false as const };
      }

      // On réinjecte les identifiants créés côté serveur.
      setItems((current) =>
        current.map((item) => {
          if (item.id) return item;
          const index = keys.indexOf(item.key);
          const assigned = index >= 0 ? res.itemIds[index] : undefined;
          return assigned ? { ...item, id: assigned } : item;
        }),
      );

      dirtyRef.current = false;
      setSaveState("saved");
      return { ok: true as const };
    } catch {
      setSaveState("error");
      return { ok: false as const };
    }
  }, [workout.id, workout.isTemplate]);

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    setSaveState("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void save(), 1100);
  }, [save]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && dirtyRef.current) void save();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [save]);

  /* ------------------------------ Mutations ------------------------------ */

  const patchItem = (key: string, patch: Partial<BuilderItem>) => {
    setItems((cur) => cur.map((i) => (i.key === key ? { ...i, ...patch } : i)));
    scheduleSave();
  };

  const addExercise = (exercise: Exercise, section: SectionKey) => {
    setItems((cur) => [
      ...cur,
      {
        key: newKey(),
        id: null,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        exerciseCategory: exercise.category,
        exerciseTracking: exercise.tracking,
        exerciseDescription: exercise.description,
        exerciseSteps: exercise.steps,
        exerciseCues: exercise.cues,
        section,
        sets: section === "echauffement" || section === "retour_au_calme" ? 1 : 3,
        targetReps: defaultReps(exercise.tracking, section),
        targetWeight: null,
        targetTimeSec: defaultTime(exercise.tracking, section),
        targetDistanceM: null,
        restSec: section === "principal" ? 60 : null,
        note: null,
        supersetGroup: null,
        tracking: null,
      },
    ]);
    setPickerSection(null);
    scheduleSave();
  };

  const removeItem = (key: string) => {
    setItems((cur) => cur.filter((i) => i.key !== key));
    scheduleSave();
  };

  const duplicateItem = (key: string) => {
    setItems((cur) => {
      const index = cur.findIndex((i) => i.key === key);
      if (index === -1) return cur;
      const copy = { ...cur[index], key: newKey(), id: null };
      return [...cur.slice(0, index + 1), copy, ...cur.slice(index + 1)];
    });
    scheduleSave();
  };

  const move = (key: string, direction: -1 | 1) => {
    setItems((cur) => {
      const sectionOf = cur.find((i) => i.key === key)?.section;
      if (!sectionOf) return cur;
      const sameSection = cur.filter((i) => i.section === sectionOf);
      const localIndex = sameSection.findIndex((i) => i.key === key);
      const target = localIndex + direction;
      if (target < 0 || target >= sameSection.length) return cur;

      const a = sameSection[localIndex];
      const b = sameSection[target];
      const globalA = cur.indexOf(a);
      const globalB = cur.indexOf(b);
      const next = [...cur];
      next[globalA] = b;
      next[globalB] = a;
      return next;
    });
    scheduleSave();
  };

  /* ------------------------------- Actions ------------------------------- */

  const publish = async () => {
    setBusy(true);
    try {
      const saved = await save();
      if (!saved.ok) return;
      const next = status === "published" ? "draft" : "published";
      await setWorkoutStatusAction(workout.id, next);
      setStatus(next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const duplicate = async () => {
    setBusy(true);
    try {
      await save();
      const target = scheduledFor ? addDaysISO(scheduledFor, 7) : new Date().toISOString().slice(0, 10);
      const res = await duplicateWorkoutAction(workout.id, target);
      if (res.ok) router.push(`/coach/seance/${res.id}`);
    } finally {
      setBusy(false);
      setMenuOpen(false);
    }
  };

  const saveTemplate = async () => {
    setBusy(true);
    try {
      await save();
      await saveAsTemplateAction(workout.id, title);
      router.refresh();
      setMenuOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const reopen = async () => {
    setBusy(true);
    try {
      await reopenWorkoutAction(workout.id);
      setStatus("published");
      router.refresh();
      setMenuOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm("Supprimer définitivement cette séance ?")) return;
    setBusy(true);
    try {
      await deleteWorkoutAction(workout.id);
      router.push("/coach");
    } finally {
      setBusy(false);
    }
  };

  /* -------------------------------- Rendu -------------------------------- */

  const grouped = useMemo(() => {
    return SECTION_KEYS.map((section) => ({
      section,
      items: items.filter((i) => i.section === section),
    }));
  }, [items]);

  const totalSets = items.reduce((acc, i) => acc + (i.sets || 0), 0);
  const autoMinutes = estimateMinutes(items);

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-40">
      {/* En-tête */}
      <header className="sticky top-0 z-30 -mx-4 mb-4 border-b border-line/50 bg-ink/80 px-4 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <Link
            href="/coach"
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-muted"
            aria-label="Retour au planning"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <StatusBadge status={status} />
              <span className="inline-flex items-center gap-1 text-[11px] text-faint">
                {saveState === "saving" ? (
                  <>
                    <Loader2 className="size-3 animate-spin" /> Enregistrement…
                  </>
                ) : saveState === "error" ? (
                  <>
                    <CloudOff className="size-3 text-danger" /> Non enregistré
                  </>
                ) : saveState === "saved" ? (
                  <>
                    <Cloud className="size-3 text-energy" /> Enregistré
                  </>
                ) : null}
              </span>
            </div>
            <p className="truncate text-[11px] text-faint">
              {items.length} exercices · {totalSets} séries · ~{autoMinutes} min
            </p>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="grid size-9 place-items-center rounded-xl border border-line bg-surface-2 text-muted"
              aria-label="Plus d'options"
            >
              <MoreHorizontal className="size-4" />
            </button>
            {menuOpen ? (
              <>
                <button
                  type="button"
                  aria-hidden
                  tabIndex={-1}
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-11 z-20 w-56 animate-[var(--animate-pop)] overflow-hidden rounded-xl border border-line bg-ink-2 shadow-2xl">
                  <MenuItem icon={<Eye className="size-4" />} onClick={() => router.push(`/seance/${workout.id}`)}>
                    Aperçu côté athlète
                  </MenuItem>
                  <MenuItem icon={<Copy className="size-4" />} onClick={duplicate}>
                    Dupliquer (+7 jours)
                  </MenuItem>
                  <MenuItem icon={<FileStack className="size-4" />} onClick={saveTemplate}>
                    Enregistrer comme modèle
                  </MenuItem>
                  <MenuItem icon={<Trash2 className="size-4" />} onClick={remove} danger>
                    Supprimer la séance
                  </MenuItem>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {status === "done" ? (
        <SessionResult
          workoutId={workout.id}
          initialMinutes={workout.durationMinutes}
          initialRating={workout.athleteRating}
          initialNote={workout.athleteNote}
          entries={effortEntries}
          profile={profile}
          loggedSets={workout.loggedSets}
        />
      ) : null}

      {workout.loggedSets > 0 && status !== "done" ? (
        <p className="card mb-4 border-warn/30 bg-warn/10 p-3 text-[12.5px] text-warn">
          Attention : des séries ont déjà été enregistrées sur cette séance. Retirer un exercice
          effacera ses performances.
        </p>
      ) : null}

      {/* Métadonnées */}
      <section className="card mb-5 space-y-3.5 p-4">
        <div>
          <label className="label" htmlFor="w-title">
            Titre de la séance
          </label>
          <input
            id="w-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              scheduleSave();
            }}
            placeholder="Ex : Bas du corps & explosivité"
            className="field font-semibold"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {!workout.isTemplate ? (
            <div>
              <label className="label" htmlFor="w-date">
                Date
              </label>
              <input
                id="w-date"
                type="date"
                value={scheduledFor}
                onChange={(e) => {
                  setScheduledFor(e.target.value);
                  scheduleSave();
                }}
                className="field"
              />
            </div>
          ) : null}
          <div>
            <label className="label" htmlFor="w-minutes">
              Durée estimée
            </label>
            <input
              id="w-minutes"
              type="number"
              inputMode="numeric"
              value={estimatedMinutes ?? ""}
              placeholder={String(autoMinutes)}
              onChange={(e) => {
                setEstimatedMinutes(e.target.value ? Number(e.target.value) : null);
                scheduleSave();
              }}
              className="field"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="w-focus">
            Focus (une ligne, visible sur sa carte)
          </label>
          <input
            id="w-focus"
            value={focus}
            onChange={(e) => {
              setFocus(e.target.value);
              scheduleSave();
            }}
            placeholder="Fessiers, gainage et un peu de cardio"
            className="field"
          />
        </div>

        <div>
          <p className="label">Intensité prévue</p>
          <div className="flex gap-1.5">
            {INTENSITY.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => {
                  setIntensity(intensity === level.value ? null : level.value);
                  scheduleSave();
                }}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-xl border py-2 transition active:scale-95",
                  intensity === level.value
                    ? "border-brand/60 bg-brand/15"
                    : "border-line bg-surface-2/60",
                )}
              >
                <span className="text-base">{level.emoji}</span>
                <span className="text-[9.5px] font-semibold text-faint">{level.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="w-note">
            Mot du coach
          </label>
          <textarea
            id="w-note"
            value={coachNote}
            onChange={(e) => {
              setCoachNote(e.target.value);
              scheduleSave();
            }}
            rows={2}
            placeholder="On vise la technique aujourd'hui, pas la charge 💪"
            className="field resize-none"
          />
        </div>
      </section>

      {/* Exercices par bloc */}
      {grouped.map(({ section, items: sectionItems }) =>
        sectionItems.length === 0 ? null : (
          <section key={section} className="mb-5">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="section-title flex items-center gap-1.5">
                <span aria-hidden>{SECTIONS[section].emoji}</span>
                {SECTIONS[section].label}
              </h2>
              <button
                type="button"
                onClick={() => setPickerSection(section)}
                className="text-xs font-semibold text-brand"
              >
                + Ajouter
              </button>
            </div>
            <div className="space-y-2.5">
              {sectionItems.map((item, index) => (
                <ItemEditor
                  key={item.key}
                  item={item}
                  isFirst={index === 0}
                  isLast={index === sectionItems.length - 1}
                  expanded={expanded === item.key}
                  onToggle={() => setExpanded((cur) => (cur === item.key ? null : item.key))}
                  onPatch={(patch) => patchItem(item.key, patch)}
                  onRemove={() => removeItem(item.key)}
                  onDuplicate={() => duplicateItem(item.key)}
                  onMove={(dir) => move(item.key, dir)}
                />
              ))}
            </div>
          </section>
        ),
      )}

      {/* Ajouter dans un bloc */}
      <section className="mb-6">
        <p className="section-title mb-2.5">Ajouter un exercice dans…</p>
        <div className="space-y-2">
          {SECTION_KEYS.map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => setPickerSection(section)}
              className="card card-hover flex w-full items-center gap-2.5 p-3 text-left text-[14px] font-semibold"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-3">
                {SECTIONS[section].emoji}
              </span>
              <span className="flex-1">{SECTIONS[section].label}</span>
              <Plus className="size-4 shrink-0 text-brand" />
            </button>
          ))}
        </div>
      </section>

      {/* Barre d'action */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md px-4 pt-2">
        <div className="flex gap-2 rounded-2xl border border-line/80 bg-ink-2/90 p-2 backdrop-blur-2xl">
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className="btn-ghost flex-1"
          >
            <Check className="size-4" />
            Enregistrer
          </button>
          {/* Une séance déjà faite ne se republie pas : elle se rouvre, depuis le menu. */}
          {status === "done" ? (
            <button type="button" onClick={reopen} disabled={busy} className="btn-ghost flex-[1.5]">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Undo2 className="size-4" />}
              Rouvrir pour la refaire
            </button>
          ) : (
            <button
              type="button"
              onClick={publish}
              disabled={busy || items.length === 0}
              className={cn("flex-[1.5]", status === "published" ? "btn-ghost" : "btn-primary")}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : status === "published" ? (
                <Undo2 className="size-4" />
              ) : (
                <Send className="size-4" />
              )}
              {status === "published" ? "Repasser en brouillon" : "Publier pour elle"}
            </button>
          )}
        </div>
      </div>

      {pickerSection ? (
        <ExercisePicker
          exercises={exercises}
          title={`Ajouter — ${SECTIONS[pickerSection].label}`}
          onClose={() => setPickerSection(null)}
          onCreated={(exercise) => setExercises((cur) => [exercise, ...cur])}
          onPick={(exercise) => addExercise(exercise, pickerSection)}
        />
      ) : null}
    </div>
  );
}

/* --------------------------- Éditeur d'exercice --------------------------- */

function ItemEditor({
  item,
  isFirst,
  isLast,
  expanded,
  onToggle,
  onPatch,
  onRemove,
  onDuplicate,
  onMove,
}: {
  item: BuilderItem;
  isFirst: boolean;
  isLast: boolean;
  expanded: boolean;
  onToggle: () => void;
  onPatch: (patch: Partial<BuilderItem>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const tracking = item.tracking ?? item.exerciseTracking;

  return (
    <article className="card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 p-3.5 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <CategoryBadge category={item.exerciseCategory} />
            {item.supersetGroup ? (
              <span className="chip border-brand-3/40 text-brand-3">
                Superset {item.supersetGroup}
              </span>
            ) : null}
          </div>
          <h3 className="truncate font-bold leading-snug">{item.exerciseName}</h3>
          <p className="mt-0.5 truncate text-[12.5px] text-muted">{summarize(item, tracking)}</p>
        </div>
        <ChevronDown
          className={cn("mt-1 size-4 shrink-0 text-faint transition-transform", expanded && "rotate-180")}
        />
      </button>

      {expanded ? (
        <div className="animate-[var(--animate-rise)] space-y-3.5 border-t border-line/60 p-3.5">
          {item.exerciseSteps.length > 0 || item.exerciseDescription ? (
            <details className="rounded-xl border border-line/70 bg-surface-2/40">
              <summary className="cursor-pointer list-none px-3 py-2.5 text-[12px] font-semibold text-faint transition hover:text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Info className="size-3.5" />
                  Comment faire cet exercice
                </span>
              </summary>
              <ExerciseHowTo
                name={item.exerciseName}
                description={item.exerciseDescription}
                steps={item.exerciseSteps}
                cues={item.exerciseCues}
                className="px-3 pb-3"
              />
            </details>
          ) : null}

          <div className="grid grid-cols-2 gap-2.5">
            <NumField
              label="Séries"
              value={item.sets}
              min={1}
              onChange={(v) => onPatch({ sets: Math.max(1, v ?? 1) })}
            />
            <TextField
              label="Répétitions"
              value={item.targetReps ?? ""}
              placeholder="10-12"
              onChange={(v) => onPatch({ targetReps: v || null })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <NumField
              label="Poids indicatif (kg)"
              value={item.targetWeight}
              step={0.5}
              onChange={(v) => onPatch({ targetWeight: v })}
            />
            <NumField
              label="Repos (sec)"
              value={item.restSec}
              step={15}
              onChange={(v) => onPatch({ restSec: v })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <NumField
              label="Durée cible (sec)"
              value={item.targetTimeSec}
              step={10}
              onChange={(v) => onPatch({ targetTimeSec: v })}
              hint={item.targetTimeSec ? formatDuration(item.targetTimeSec) : undefined}
            />
            <NumField
              label="Distance cible (m)"
              value={item.targetDistanceM}
              step={100}
              onChange={(v) => onPatch({ targetDistanceM: v })}
            />
          </div>

          <div>
            <label className="label" htmlFor={`note-${item.key}`}>
              Consigne pour elle
            </label>
            <textarea
              id={`note-${item.key}`}
              value={item.note ?? ""}
              onChange={(e) => onPatch({ note: e.target.value || null })}
              rows={2}
              placeholder="Descente en 3 secondes, ne cherche pas la charge."
              className="field resize-none"
            />
          </div>

          <div>
            <p className="label">Ce qu'elle note pour cet exercice</p>
            <div className="grid grid-cols-2 gap-1.5">
              {TRACKING_KEYS.map((key) => {
                const active = tracking === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      onPatch({ tracking: key === item.exerciseTracking ? null : key })
                    }
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 text-left text-[11.5px] font-semibold transition active:scale-95",
                      active
                        ? "border-brand/60 bg-brand/15 text-fg"
                        : "border-line bg-surface-2 text-muted",
                    )}
                  >
                    {TRACKING[key].short}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="label" htmlFor={`section-${item.key}`}>
                Bloc
              </label>
              <select
                id={`section-${item.key}`}
                value={item.section}
                onChange={(e) => onPatch({ section: e.target.value })}
                className="field"
              >
                {SECTION_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {SECTIONS[key].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor={`superset-${item.key}`}>
                Superset
              </label>
              <select
                id={`superset-${item.key}`}
                value={item.supersetGroup ?? ""}
                onChange={(e) => onPatch({ supersetGroup: e.target.value || null })}
                className="field"
              >
                <option value="">Aucun</option>
                {["A", "B", "C", "D"].map((g) => (
                  <option key={g} value={g}>
                    Groupe {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              disabled={isFirst}
              onClick={() => onMove(-1)}
              className="btn-ghost flex-1 px-2 py-2 text-xs disabled:opacity-30"
            >
              <ArrowUpDown className="size-3.5 rotate-180" />
              Monter
            </button>
            <button
              type="button"
              disabled={isLast}
              onClick={() => onMove(1)}
              className="btn-ghost flex-1 px-2 py-2 text-xs disabled:opacity-30"
            >
              <ArrowUpDown className="size-3.5" />
              Descendre
            </button>
            <button
              type="button"
              onClick={onDuplicate}
              className="btn-ghost px-3 py-2 text-xs"
              aria-label="Dupliquer l'exercice"
            >
              <Copy className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="btn-danger px-3 py-2 text-xs"
              aria-label="Retirer l'exercice"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

/* -------------------------------- Champs --------------------------------- */

function NumField({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  hint,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  step?: number;
  min?: number;
  hint?: string;
}) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, (value ?? 0) - step) || (min === 0 ? null : min))}
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-3 text-muted active:scale-90"
          aria-label={`Diminuer ${label}`}
        >
          −
        </button>
        <input
          type="text"
          aria-label={label}
          inputMode="decimal"
          value={value ?? ""}
          placeholder="—"
          onChange={(e) => {
            const raw = e.target.value.replace(",", ".").trim();
            if (!raw) return onChange(null);
            const n = Number(raw);
            if (Number.isFinite(n)) onChange(n);
          }}
          className="w-full rounded-lg border border-line bg-ink-2 px-2 py-2 text-center text-[15px] font-bold tabular-nums outline-none focus:border-brand/70 focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="button"
          onClick={() => onChange((value ?? 0) + step)}
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-3 text-muted active:scale-90"
          aria-label={`Augmenter ${label}`}
        >
          +
        </button>
      </div>
      {hint ? <p className="mt-1 text-center text-[11px] text-faint">{hint}</p> : null}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <p className="label">{label}</p>
      <input
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="field text-center font-bold"
      />
    </div>
  );
}

function MenuItem({
  icon,
  children,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13.5px] font-medium transition hover:bg-surface-2",
        danger ? "text-danger" : "text-fg",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/* ------------------------------- Helpers --------------------------------- */

function toPlanItem(item: BuilderItem): PlanItem {
  return {
    id: item.id,
    exerciseId: item.exerciseId,
    section: item.section,
    sets: item.sets,
    targetReps: item.targetReps,
    targetWeight: item.targetWeight,
    targetTimeSec: item.targetTimeSec,
    targetDistanceM: item.targetDistanceM,
    restSec: item.restSec,
    note: item.note,
    supersetGroup: item.supersetGroup,
    tracking: item.tracking,
  };
}

function summarize(item: BuilderItem, tracking: string): string {
  const bits = [`${item.sets} × ${item.targetReps ?? "?"}`];
  if (tracking === "time" || tracking === "time_distance") {
    bits[0] = `${item.sets} × ${item.targetTimeSec ? formatDuration(item.targetTimeSec) : "?"}`;
  }
  if (item.targetDistanceM) bits.push(`${item.targetDistanceM} m`);
  if (item.targetWeight) bits.push(`${item.targetWeight} kg`);
  if (item.restSec) bits.push(`repos ${item.restSec}s`);
  return bits.join(" · ");
}

function defaultReps(tracking: string, section: SectionKey): string | null {
  if (tracking === "time" || tracking === "distance" || tracking === "time_distance") return null;
  if (section === "echauffement") return "12";
  if (section === "finisher") return "15";
  return "10-12";
}

function defaultTime(tracking: string, section: SectionKey): number | null {
  if (tracking !== "time" && tracking !== "time_distance") return null;
  if (section === "echauffement") return 300;
  if (section === "retour_au_calme") return 60;
  return 45;
}

/** Estimation : temps sous tension + repos + transitions. */
function estimateMinutes(items: BuilderItem[]): number {
  let seconds = 0;
  for (const item of items) {
    const perSet = item.targetTimeSec ?? 40;
    const rest = item.restSec ?? 45;
    seconds += item.sets * (perSet + rest) + 45;
  }
  return Math.max(5, Math.round(seconds / 60));
}
