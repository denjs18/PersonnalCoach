"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import {
  CATEGORIES,
  CATEGORY_KEYS,
  DEFAULT_MET,
  EFFORT_LEVELS,
  EQUIPMENT,
  EQUIPMENT_KEYS,
  TRACKING,
  TRACKING_KEYS,
  nearestEffortLevel,
  type CategoryKey,
} from "@/lib/constants";
import type { ExerciseInput } from "@/lib/actions/exercises";
import type { Exercise } from "@/lib/db";
import { cn } from "@/lib/utils";

export type ExerciseFormValues = ExerciseInput;

export function ExerciseForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<Exercise>;
  submitLabel: string;
  onSubmit: (values: ExerciseFormValues) => Promise<{ ok: boolean; error?: string }>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "force");
  const [equipment, setEquipment] = useState<string[]>(initial?.equipment ?? []);
  const [muscles, setMuscles] = useState((initial?.muscles ?? []).join(", "));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [steps, setSteps] = useState((initial?.steps ?? []).join("\n"));
  const [cues, setCues] = useState(initial?.cues ?? "");
  const [tracking, setTracking] = useState(initial?.tracking ?? "reps_weight");
  // On garde le MET exact de l'exercice : ouvrir puis enregistrer sans toucher à
  // l'intensité ne doit pas l'arrondir au niveau le plus proche.
  const [met, setMet] = useState(initial?.met ?? metOfCategory(initial?.category ?? "force"));
  // Tant que le coach n'a pas choisi lui-même, l'intensité suit la catégorie.
  const [metChosen, setMetChosen] = useState(initial?.met != null);
  const [usesIncline, setUsesIncline] = useState(initial?.usesIncline ?? false);
  const activeLevel = nearestEffortLevel(met);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const toggleEquipment = (key: string) =>
    setEquipment((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));

  const submit = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Il faut un nom d'exercice.");
      return;
    }
    setPending(true);
    try {
      const res = await onSubmit({
        name,
        category,
        equipment,
        muscles: muscles.split(",").map((m) => m.trim()).filter(Boolean),
        description,
        steps: steps.split("\n").map((line) => line.replace(/^\s*\d+[.)]\s*/, "").trim()).filter(Boolean),
        cues,
        tracking,
        met,
        usesIncline,
      });
      if (!res.ok) setError(res.error ?? "Une erreur est survenue.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="ex-name">
          Nom de l'exercice
        </label>
        <input
          id="ex-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex : Fentes bulgares avec sac lesté"
          className="field"
          autoFocus
        />
      </div>

      <div>
        <p className="label">Catégorie</p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_KEYS.map((key) => {
            const meta = CATEGORIES[key];
            const active = category === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setCategory(key);
                  if (!metChosen) setMet(metOfCategory(key));
                }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95",
                  active ? "border-transparent text-ink" : "border-line bg-surface-2 text-muted",
                )}
                style={active ? { backgroundColor: meta.color, color: "#08080e" } : undefined}
              >
                {meta.emoji} {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="label">Matériel</p>
        <div className="flex flex-wrap gap-1.5">
          {EQUIPMENT_KEYS.map((key) => {
            const active = equipment.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleEquipment(key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95",
                  active
                    ? "border-brand/60 bg-brand/18 text-brand"
                    : "border-line bg-surface-2 text-muted",
                )}
              >
                {EQUIPMENT[key]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="label">Ce qu'on note pendant la séance</p>
        <div className="grid grid-cols-2 gap-1.5">
          {TRACKING_KEYS.map((key) => {
            const active = tracking === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTracking(key)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-left text-xs font-semibold transition active:scale-95",
                  active
                    ? "border-brand/60 bg-brand/15 text-fg"
                    : "border-line bg-surface-2 text-muted",
                )}
              >
                {TRACKING[key].label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setUsesIncline((v) => !v)}
          className={cn(
            "flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.99]",
            usesIncline
              ? "border-brand/60 bg-brand/15 text-fg"
              : "border-line bg-surface-2 text-muted",
          )}
        >
          <span
            className={cn(
              "mt-0.5 grid size-4 shrink-0 place-items-center rounded border",
              usesIncline ? "border-brand bg-brand text-ink" : "border-line",
            )}
          >
            {usesIncline ? <Check className="size-3" strokeWidth={3} /> : null}
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold">Cet exercice se fait en pente</span>
            <span className="block text-[11px] text-faint">
              Tapis incliné, côte, escaliers. Elle note l'inclinaison, et la dépense se
              calcule dessus — monter lentement coûte bien plus que marcher à plat.
            </span>
          </span>
        </button>
      </div>

      {usesIncline ? (
        <p className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-[11px] leading-relaxed text-faint">
          Pas d'intensité à choisir ici : pour un exercice en pente, la dépense se
          déduit de l'allure et de l'inclinaison notées pendant la séance.
        </p>
      ) : (
      <div>
        <p className="label">Intensité de l'effort</p>
        <p className="-mt-0.5 mb-1.5 text-[11px] text-faint">
          Sert au calcul des calories. Décris l'effort pendant le mouvement, pas la
          séance entière — les temps de repos sont comptés à part.
        </p>
        <div className="grid gap-1.5">
          {EFFORT_LEVELS.map((level) => {
            const active = activeLevel === level.met;
            return (
              <button
                key={level.met}
                type="button"
                onClick={() => {
                  setMet(level.met);
                  setMetChosen(true);
                }}
                className={cn(
                  "flex items-baseline gap-2 rounded-xl border px-3 py-2 text-left transition active:scale-95",
                  active
                    ? "border-brand/60 bg-brand/15 text-fg"
                    : "border-line bg-surface-2 text-muted",
                )}
              >
                <span className="text-xs font-semibold">{level.label}</span>
                <span className="text-[11px] text-faint">{level.hint}</span>
              </button>
            );
          })}
        </div>
        {!metChosen ? (
          <p className="mt-1 text-[11px] text-faint">
            Choisi d'après la catégorie. Touche un niveau pour l'ajuster toi-même.
          </p>
        ) : null}
      </div>
      )}

      <div>
        <label className="label" htmlFor="ex-muscles">
          Muscles / qualités travaillés
        </label>
        <input
          id="ex-muscles"
          value={muscles}
          onChange={(e) => setMuscles(e.target.value)}
          placeholder="Fessiers, Quadriceps, Gainage"
          className="field"
        />
        <p className="mt-1 text-[11px] text-faint">Sépare par des virgules.</p>
      </div>

      <div>
        <label className="label" htmlFor="ex-desc">
          Description
        </label>
        <textarea
          id="ex-desc"
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="En quoi consiste le mouvement…"
          className="field resize-none"
        />
      </div>

      <div>
        <label className="label" htmlFor="ex-steps">
          Comment on fait — une étape par ligne
        </label>
        <textarea
          id="ex-steps"
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          rows={5}
          placeholder={"Pieds largeur d'épaules, charge contre la poitrine.\nDescends en poussant les fesses en arrière.\nRemonte en poussant dans les talons."}
          className="field resize-none leading-relaxed"
        />
        <p className="mt-1 text-[11px] text-faint">
          Affiché à l'athlète pendant la séance, sous « Comment faire ».
        </p>
      </div>

      <div>
        <label className="label" htmlFor="ex-cues">
          Points techniques (affichés à l'athlète)
        </label>
        <textarea
          id="ex-cues"
          value={cues ?? ""}
          onChange={(e) => setCues(e.target.value)}
          rows={2}
          placeholder="Dos plat, genoux dans l'axe, descente lente…"
          className="field resize-none"
        />
      </div>

      {error ? (
        <p className="rounded-xl border border-danger/30 bg-danger/10 p-2.5 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2 pt-1">
        {onCancel ? (
          <button type="button" onClick={onCancel} className="btn-ghost flex-1">
            Annuler
          </button>
        ) : null}
        <button type="button" onClick={submit} disabled={pending} className="btn-primary flex-[1.4]">
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

/** MET par défaut d'une catégorie, en retombant sur la force si elle est inconnue. */
function metOfCategory(category: string): number {
  return DEFAULT_MET[(category in DEFAULT_MET ? category : "force") as CategoryKey];
}
