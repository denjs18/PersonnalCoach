"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  CATEGORIES,
  CATEGORY_KEYS,
  EQUIPMENT,
  EQUIPMENT_KEYS,
  TRACKING,
  TRACKING_KEYS,
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
                onClick={() => setCategory(key)}
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
