"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  Info,
  Pencil,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  createExerciseAction,
  setExerciseArchivedAction,
  updateExerciseAction,
} from "@/lib/actions/exercises";
import { CATEGORIES, CATEGORY_KEYS, EQUIPMENT, type EquipmentKey } from "@/lib/constants";
import type { Exercise } from "@/lib/db";
import { CategoryBadge } from "@/components/ui";
import { ExerciseHowTo } from "@/components/exercise-how-to";
import { ExerciseForm } from "./exercise-form";
import { cn } from "@/lib/utils";

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function ExerciseLibrary({ initial }: { initial: Exercise[] }) {
  const [exercises, setExercises] = useState(initial);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [onlyCustom, setOnlyCustom] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Exercise | "new" | null>(null);
  const [opened, setOpened] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return exercises.filter((ex) => {
      if (!showArchived && ex.isArchived) return false;
      if (showArchived && !ex.isArchived) return false;
      if (onlyCustom && !ex.isCustom) return false;
      if (category && ex.category !== category) return false;
      if (!q) return true;
      return (
        normalize(ex.name).includes(q) ||
        normalize(ex.description ?? "").includes(q) ||
        ex.muscles.some((m) => normalize(m).includes(q))
      );
    });
  }, [exercises, search, category, onlyCustom, showArchived]);

  const customCount = exercises.filter((e) => e.isCustom && !e.isArchived).length;

  const upsert = (exercise: Exercise) =>
    setExercises((cur) => {
      const index = cur.findIndex((e) => e.id === exercise.id);
      if (index === -1) return [exercise, ...cur];
      const next = [...cur];
      next[index] = exercise;
      return next;
    });

  const toggleArchive = async (exercise: Exercise) => {
    upsert({ ...exercise, isArchived: !exercise.isArchived });
    await setExerciseArchivedAction(exercise.id, !exercise.isArchived);
  };

  return (
    <>
      <button type="button" onClick={() => setEditing("new")} className="btn-primary mb-4 w-full">
        <Plus className="size-4" />
        Créer un exercice
      </button>

      <div className="mb-3 space-y-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Chercher…"
            className="field pl-9"
          />
        </div>

        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
          <Chip active={category === null} onClick={() => setCategory(null)} label="Tout" />
          {CATEGORY_KEYS.map((key) => (
            <Chip
              key={key}
              active={category === key}
              onClick={() => setCategory(category === key ? null : key)}
              label={`${CATEGORIES[key].emoji} ${CATEGORIES[key].label}`}
              color={CATEGORIES[key].color}
            />
          ))}
        </div>

        <div className="flex gap-1.5">
          <Chip
            active={onlyCustom}
            onClick={() => setOnlyCustom((v) => !v)}
            label={`✨ Mes exos (${customCount})`}
          />
          <Chip
            active={showArchived}
            onClick={() => setShowArchived((v) => !v)}
            label="Archivés"
          />
        </div>
      </div>

      <p className="mb-2.5 text-[11.5px] text-faint">
        {filtered.length} exercice{filtered.length > 1 ? "s" : ""}
      </p>

      <ul className="space-y-2">
        {filtered.map((ex) => (
          <li key={ex.id} className="card p-3.5">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <CategoryBadge category={ex.category} />
                  {ex.isCustom ? (
                    <span className="chip border-brand-2/40 text-brand-2">
                      <Sparkles className="size-3" />
                      Perso
                    </span>
                  ) : null}
                </div>
                <h3 className="font-bold leading-snug">{ex.name}</h3>
                {ex.equipment.length > 0 ? (
                  <p className="mt-0.5 text-[11.5px] text-faint">
                    {ex.equipment.map((eq) => EQUIPMENT[eq as EquipmentKey] ?? eq).join(" · ")}
                  </p>
                ) : null}
                {ex.description ? (
                  <p className="mt-1.5 line-clamp-2 text-[12.5px] text-muted">{ex.description}</p>
                ) : null}
                {ex.steps.length > 0 || ex.cues ? (
                  <button
                    type="button"
                    onClick={() => setOpened((cur) => (cur === ex.id ? null : ex.id))}
                    className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand-3"
                  >
                    <Info className="size-3" />
                    Comment faire
                    <ChevronDown
                      className={cn("size-3 transition-transform", opened === ex.id && "rotate-180")}
                    />
                  </button>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditing(ex)}
                  className="grid size-8 place-items-center rounded-lg border border-line bg-surface-2 text-muted transition active:scale-90"
                  aria-label={`Modifier ${ex.name}`}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleArchive(ex)}
                  className="grid size-8 place-items-center rounded-lg border border-line bg-surface-2 text-muted transition active:scale-90"
                  aria-label={ex.isArchived ? `Restaurer ${ex.name}` : `Archiver ${ex.name}`}
                >
                  {ex.isArchived ? (
                    <ArchiveRestore className="size-3.5" />
                  ) : (
                    <Archive className="size-3.5" />
                  )}
                </button>
              </div>
            </div>
            {opened === ex.id ? (
              <ExerciseHowTo
                name={ex.name}
                description={null}
                steps={ex.steps}
                cues={ex.cues}
                className="mt-3 animate-[var(--animate-rise)] border-t border-line/60 pt-3"
              />
            ) : null}
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">
          Aucun exercice ne correspond à cette recherche.
        </div>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-ink/95 backdrop-blur-xl">
          <div className="mx-auto flex h-full w-full max-w-md flex-col">
            <div className="flex items-center gap-3 border-b border-line/60 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
              <h2 className="flex-1 text-lg font-extrabold">
                {editing === "new" ? "Nouvel exercice" : "Modifier l'exercice"}
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="grid size-9 place-items-center rounded-xl border border-line bg-surface-2 text-muted"
                aria-label="Fermer"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <ExerciseForm
                key={editing === "new" ? "new" : editing.id}
                initial={editing === "new" ? { name: search.trim() } : editing}
                submitLabel={editing === "new" ? "Créer l'exercice" : "Enregistrer"}
                onCancel={() => setEditing(null)}
                onSubmit={async (values) => {
                  const res =
                    editing === "new"
                      ? await createExerciseAction(values)
                      : await updateExerciseAction(editing.id, values);
                  if (res.ok) {
                    upsert(res.exercise);
                    setEditing(null);
                    return { ok: true };
                  }
                  return { ok: false, error: res.error };
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Chip({
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
      style={active ? { backgroundColor: color ?? "var(--color-brand)", color: "#08080e" } : undefined}
    >
      {label}
    </button>
  );
}
