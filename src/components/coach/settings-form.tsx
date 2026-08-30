"use client";

import { useState } from "react";
import { Check, Flame, Loader2 } from "lucide-react";
import { saveSettingsAction } from "@/lib/actions/settings";
import { SEXES } from "@/lib/constants";
import { basalMetabolicRate, isProfileComplete, readProfile } from "@/lib/effort";
import { cn } from "@/lib/utils";

export function SettingsForm({ initial }: { initial: Record<string, string> }) {
  const [athleteName, setAthleteName] = useState(initial.athlete_name ?? "");
  const [goal, setGoal] = useState(initial.goal_per_week ?? "3");
  const [motivation, setMotivation] = useState(initial.motivation ?? "");
  const [sex, setSex] = useState(initial.athlete_sex ?? "");
  const [height, setHeight] = useState(initial.athlete_height_cm ?? "");
  const [weight, setWeight] = useState(initial.athlete_weight_kg ?? "");
  const [age, setAge] = useState(initial.athlete_age ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  const profile = readProfile({
    athlete_sex: sex,
    athlete_height_cm: height,
    athlete_weight_kg: weight,
    athlete_age: age,
  });
  const complete = isProfileComplete(profile);
  const bmr = basalMetabolicRate(profile);

  const submit = async () => {
    setState("saving");
    await saveSettingsAction({
      athlete_name: athleteName.trim(),
      goal_per_week: String(Math.max(1, Math.min(14, Number(goal) || 3))),
      motivation: motivation.trim(),
      athlete_sex: sex,
      athlete_height_cm: height.trim(),
      athlete_weight_kg: weight.trim().replace(",", "."),
      athlete_age: age.trim(),
    });
    setState("saved");
    setTimeout(() => setState("idle"), 2200);
  };

  return (
    <section className="card space-y-5 p-4">
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

      {/* Profil physique : uniquement pour l'estimation des calories */}
      <div className="rounded-xl border border-line/70 bg-surface-2/40 p-3.5">
        <p className="mb-3 flex items-center gap-2 text-[13px] font-bold">
          <Flame className="size-4 text-warn" />
          Estimation des calories
        </p>

        <p className="label">Sexe</p>
        <div className="mb-3 flex gap-1.5">
          {SEXES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSex(sex === option.value ? "" : option.value)}
              className={cn(
                "flex-1 rounded-xl border py-2 text-[13px] font-semibold transition active:scale-95",
                sex === option.value
                  ? "border-brand/60 bg-brand/15 text-fg"
                  : "border-line bg-surface-2 text-muted",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <label className="label" htmlFor="s-height">
              Taille
            </label>
            <input
              id="s-height"
              type="text"
              inputMode="numeric"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="165"
              className="field text-center"
            />
            <p className="mt-1 text-center text-[10px] text-faint">cm</p>
          </div>
          <div>
            <label className="label" htmlFor="s-weight">
              Poids
            </label>
            <input
              id="s-weight"
              type="text"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="60"
              className="field text-center"
            />
            <p className="mt-1 text-center text-[10px] text-faint">kg</p>
          </div>
          <div>
            <label className="label" htmlFor="s-age">
              Âge
            </label>
            <input
              id="s-age"
              type="text"
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="30"
              className="field text-center"
            />
            <p className="mt-1 text-center text-[10px] text-faint">ans</p>
          </div>
        </div>

        <p className="mt-3 text-[11.5px] leading-relaxed text-faint">
          {complete ? (
            <>
              Métabolisme de repos estimé : {Math.round(bmr ?? 0)} kcal/jour. Les calories des
              séances, passées comprises, sont recalculées avec ces valeurs.
            </>
          ) : (
            <>
              Sexe, taille et poids sont nécessaires pour estimer les calories. L'âge est
              optionnel (30 ans par défaut).
            </>
          )}
        </p>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={state === "saving"}
        className="btn-primary w-full"
      >
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
