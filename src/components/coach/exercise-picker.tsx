"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Info, Plus, Search, Sparkles, X } from "lucide-react";
import { CATEGORIES, CATEGORY_KEYS, EQUIPMENT, type EquipmentKey } from "@/lib/constants";
import { createExerciseAction } from "@/lib/actions/exercises";
import type { Exercise } from "@/lib/db";
import { CategoryBadge } from "@/components/ui";
import { ExerciseHowTo } from "@/components/exercise-how-to";
import { ExerciseForm } from "./exercise-form";
import { cn } from "@/lib/utils";

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function ExercisePicker({
  exercises,
  onPick,
  onClose,
  onCreated,
  title = "Ajouter un exercice",
}: {
  exercises: Exercise[];
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
  onCreated?: (exercise: Exercise) => void;
  title?: string;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState<Exercise | null>(null);

  const equipmentOptions = useMemo(() => {
    const used = new Set<string>();
    for (const ex of exercises) for (const eq of ex.equipment) used.add(eq);
    return [...used].sort((a, b) =>
      (EQUIPMENT[a as EquipmentKey] ?? a).localeCompare(EQUIPMENT[b as EquipmentKey] ?? b, "fr"),
    );
  }, [exercises]);

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return exercises.filter((ex) => {
      if (category && ex.category !== category) return false;
      if (equipment && !ex.equipment.includes(equipment)) return false;
      if (!q) return true;
      return (
        normalize(ex.name).includes(q) ||
        normalize(ex.description ?? "").includes(q) ||
        ex.muscles.some((m) => normalize(m).includes(q))
      );
    });
  }, [exercises, search, category, equipment]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink/95 backdrop-blur-xl">
      <div className="mx-auto flex h-full w-full max-w-md flex-col">
        {/* En-tête */}
        <div className="flex items-center gap-3 border-b border-line/60 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
          {preview ? (
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-muted"
              aria-label="Retour à la liste"
            >
              <ArrowLeft className="size-4" />
            </button>
          ) : null}
          <h2 className="flex-1 truncate text-lg font-extrabold">
            {creating ? "Nouvel exercice" : preview ? preview.name : title}
          </h2>
          <button
            type="button"
            onClick={creating ? () => setCreating(false) : onClose}
            className="grid size-9 place-items-center rounded-xl border border-line bg-surface-2 text-muted"
            aria-label="Fermer"
          >
            <X className="size-4" />
          </button>
        </div>

        {preview ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                <CategoryBadge category={preview.category} />
                {preview.equipment.map((eq) => (
                  <span key={eq} className="chip">
                    {EQUIPMENT[eq as EquipmentKey] ?? eq}
                  </span>
                ))}
              </div>
              {preview.muscles.length > 0 ? (
                <p className="mb-4 text-[12.5px] text-faint">
                  Travaille : {preview.muscles.join(", ")}
                </p>
              ) : null}
              <ExerciseHowTo
                name={preview.name}
                description={preview.description}
                steps={preview.steps}
                cues={preview.cues}
              />
            </div>
            <div className="safe-bottom border-t border-line/60 bg-ink-2/80 px-4 pt-2.5 backdrop-blur-xl">
              <button type="button" onClick={() => onPick(preview)} className="btn-primary w-full">
                <Plus className="size-4" />
                Ajouter à la séance
              </button>
            </div>
          </div>
        ) : creating ? (
          <div className="flex-1 overflow-y-auto px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <ExerciseForm
              submitLabel="Créer et ajouter"
              initial={{ name: search.trim() }}
              onCancel={() => setCreating(false)}
              onSubmit={async (values) => {
                const res = await createExerciseAction(values);
                if (res.ok) {
                  onCreated?.(res.exercise);
                  onPick(res.exercise);
                  return { ok: true };
                }
                return { ok: false, error: res.error };
              }}
            />
          </div>
        ) : (
          <>
            {/* Recherche + filtres */}
            <div className="space-y-2.5 border-b border-line/60 px-4 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Chercher un exercice…"
                  className="field pl-9"
                  autoFocus
                />
              </div>

              <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
                <FilterChip
                  active={category === null}
                  onClick={() => setCategory(null)}
                  label="Tout"
                />
                {CATEGORY_KEYS.map((key) => (
                  <FilterChip
                    key={key}
                    active={category === key}
                    onClick={() => setCategory(category === key ? null : key)}
                    label={`${CATEGORIES[key].emoji} ${CATEGORIES[key].label}`}
                    color={CATEGORIES[key].color}
                  />
                ))}
              </div>

              {equipmentOptions.length > 0 ? (
                <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
                  <FilterChip
                    active={equipment === null}
                    onClick={() => setEquipment(null)}
                    label="Tout matériel"
                  />
                  {equipmentOptions.map((eq) => (
                    <FilterChip
                      key={eq}
                      active={equipment === eq}
                      onClick={() => setEquipment(equipment === eq ? null : eq)}
                      label={EQUIPMENT[eq as EquipmentKey] ?? eq}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            {/* Résultats */}
            <div className="flex-1 overflow-y-auto px-4 py-3 pb-[max(6rem,env(safe-area-inset-bottom))]">
              {filtered.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted">Aucun exercice ne correspond.</p>
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="btn-primary mt-4"
                  >
                    <Plus className="size-4" />
                    Créer « {search.trim() || "un exercice"} »
                  </button>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {filtered.map((ex) => (
                    <li key={ex.id} className="card card-hover flex items-center">
                      <button
                        type="button"
                        onClick={() => setPreview(ex)}
                        className="min-w-0 flex-1 p-3 text-left"
                        aria-label={`Voir comment faire : ${ex.name}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <CategoryBadge category={ex.category} />
                          {ex.isCustom ? (
                            <span className="chip border-brand-2/40 text-brand-2">
                              <Sparkles className="size-3" />
                              Perso
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate font-semibold leading-snug">{ex.name}</p>
                        {ex.description ? (
                          <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted">
                            {ex.description}
                          </p>
                        ) : null}
                        {ex.equipment.length > 0 ? (
                          <p className="mt-1 truncate text-[11.5px] text-faint">
                            {ex.equipment.map((eq) => EQUIPMENT[eq as EquipmentKey] ?? eq).join(" · ")}
                          </p>
                        ) : null}
                        <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-3">
                          <Info className="size-3" />
                          Comment faire
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onPick(ex)}
                        className="grid shrink-0 place-items-center self-stretch border-l border-line/60 px-4 text-brand transition active:scale-90"
                        aria-label={`Ajouter ${ex.name}`}
                      >
                        <Plus className="size-5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Créer */}
            <div className="safe-bottom border-t border-line/60 bg-ink-2/80 px-4 pt-2.5 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="btn-ghost w-full"
              >
                <Plus className="size-4" />
                Créer un exercice qui n'existe pas
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95",
        active ? "border-transparent" : "border-line bg-surface-2 text-muted",
      )}
      style={
        active
          ? { backgroundColor: color ?? "var(--color-brand)", color: "#08080e" }
          : undefined
      }
    >
      {label}
    </button>
  );
}
