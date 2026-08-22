"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { saveSettingsAction } from "@/lib/actions/settings";

export function SettingsForm({ initial }: { initial: Record<string, string> }) {
  const [athleteName, setAthleteName] = useState(initial.athlete_name ?? "");
  const [goal, setGoal] = useState(initial.goal_per_week ?? "3");
  const [motivation, setMotivation] = useState(initial.motivation ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  const submit = async () => {
    setState("saving");
    await saveSettingsAction({
      athlete_name: athleteName.trim(),
      goal_per_week: String(Math.max(1, Math.min(14, Number(goal) || 3))),
      motivation: motivation.trim(),
    });
    setState("saved");
    setTimeout(() => setState("idle"), 2200);
  };

  return (
    <section className="card space-y-4 p-4">
      <div>
        <label className="label" htmlFor="s-name">
          Son prénom
        </label>
        <input
          id="s-name"
          value={athleteName}
          onChange={(e) => setAthleteName(e.target.value)}
          placeholder="Comment l'app doit l'appeler"
          className="field"
        />
        <p className="mt-1 text-[11px] text-faint">
          Utilisé sur l'écran de connexion et pour la saluer.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="s-goal">
          Objectif de séances par semaine
        </label>
        <input
          id="s-goal"
          type="number"
          inputMode="numeric"
          min={1}
          max={14}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className="field"
        />
      </div>

      <div>
        <label className="label" htmlFor="s-motivation">
          Message affiché sur son accueil
        </label>
        <textarea
          id="s-motivation"
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          rows={2}
          placeholder="Laisse vide pour une phrase du jour automatique."
          className="field resize-none"
        />
      </div>

      <button type="button" onClick={submit} disabled={state === "saving"} className="btn-primary w-full">
        {state === "saving" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : state === "saved" ? (
          <Check className="size-4" />
        ) : null}
        {state === "saved" ? "Enregistré" : "Enregistrer"}
      </button>
    </section>
  );
}
