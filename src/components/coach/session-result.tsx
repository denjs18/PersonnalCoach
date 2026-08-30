"use client";

import { useState } from "react";
import { Check, Flame, Loader2, RotateCcw, Timer } from "lucide-react";
import { updateWorkoutResultAction } from "@/lib/actions/workouts";
import { MOODS } from "@/lib/constants";
import { estimateCalories, type AthleteProfile, type EffortEntry } from "@/lib/effort";
import { cn, formatDuration } from "@/lib/utils";

/**
 * Ce qui a été enregistré à la fin d'une séance terminée, et que le coach peut
 * corriger : la durée d'abord, puisque c'est elle qui donne les calories.
 */
export function SessionResult({
  workoutId,
  initialMinutes,
  initialRating,
  initialNote,
  entries,
  profile,
  loggedSets,
}: {
  workoutId: string;
  initialMinutes: number | null;
  initialRating: number | null;
  initialNote: string | null;
  entries: EffortEntry[];
  profile: AthleteProfile;
  loggedSets: number;
}) {
  const [minutes, setMinutes] = useState(initialMinutes ? String(initialMinutes) : "");
  const [rating, setRating] = useState(initialRating);
  const [note, setNote] = useState(initialNote ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  const parsed = Number(minutes.replace(/\D/g, ""));
  const durationMinutes = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  const calories = estimateCalories(entries, profile, durationMinutes ? durationMinutes * 60 : null);

  const dirty =
    minutes !== (initialMinutes ? String(initialMinutes) : "") ||
    rating !== initialRating ||
    note !== (initialNote ?? "");

  const save = async () => {
    setState("saving");
    await updateWorkoutResultAction(workoutId, {
      durationMinutes,
      athleteRating: rating,
      athleteNote: note,
    });
    setState("saved");
    setTimeout(() => setState("idle"), 2200);
  };

  return (
    <section className="card mb-5 border-brand-2/30 bg-brand-2/[0.05] p-4">
      <h2 className="mb-3 flex items-center gap-2 text-[13px] font-bold">
        <Check className="size-4 text-brand-2" />
        Séance réalisée
        <span className="font-medium text-faint">· {loggedSets} séries validées</span>
      </h2>

      <div className="mb-3.5">
        <label className="label" htmlFor="result-duration">
          Durée réelle
        </label>
        <div className="flex items-center gap-2.5">
          <input
            id="result-duration"
            type="text"
            inputMode="numeric"
            value={minutes}
            placeholder="60"
            onChange={(e) => setMinutes(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            className="field w-24 text-center text-lg font-bold tabular-nums"
          />
          <span className="text-sm font-semibold text-muted">minutes</span>
          {calories !== null ? (
            <span className="ml-auto inline-flex items-center gap-1 text-sm font-bold text-warn">
              <Flame className="size-4" />~{calories} kcal
            </span>
          ) : null}
        </div>
        <p className="mt-1.5 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-faint">
          <Timer className="mt-0.5 size-3 shrink-0" />
          {durationMinutes
            ? `Soit ${formatDuration(durationMinutes * 60)} d'entraînement. Les calories se recalculent avec cette durée, ici comme dans son historique.`
            : "Sans durée, les calories retombent sur une estimation calculée depuis les séries."}
        </p>
      </div>

      <div className="mb-3.5">
        <p className="label">Son ressenti</p>
        <div className="flex gap-1.5">
          {MOODS.map((mood) => (
            <button
              key={mood.value}
              type="button"
              onClick={() => setRating(rating === mood.value ? null : mood.value)}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-xl border py-2 transition active:scale-95",
                rating === mood.value
                  ? "border-brand/60 bg-brand/15"
                  : "border-line bg-surface-2/60",
              )}
            >
              <span className="text-base">{mood.emoji}</span>
              <span className="text-[9.5px] font-semibold text-faint">{mood.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="result-note">
          Son mot
        </label>
        <textarea
          id="result-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Rien de noté."
          className="field resize-none"
        />
      </div>

      <button
        type="button"
        onClick={save}
        disabled={state === "saving" || (!dirty && state !== "saved")}
        className={cn("mt-3.5 w-full", dirty || state === "saved" ? "btn-primary" : "btn-ghost")}
      >
        {state === "saving" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : state === "saved" ? (
          <Check className="size-4" />
        ) : (
          <RotateCcw className="size-4" />
        )}
        {state === "saved" ? "Enregistré" : "Corriger le résultat"}
      </button>
    </section>
  );
}
